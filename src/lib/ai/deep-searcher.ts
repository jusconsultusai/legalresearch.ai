/**
 * DeepSearcher — Agentic RAG Engine for JusConsultus AI
 * 
 * Inspired by https://github.com/zilliztech/deep-searcher
 * 
 * Architecture:
 *   1. Query Analysis & Decomposition — break complex legal questions into sub-queries
 *   2. Iterative Multi-Pass Retrieval  — search legal DB + user files per sub-query
 *   3. Evaluation & Deduplication      — score, merge, deduplicate across passes
 *   4. Reasoning & Answer Synthesis    — LLM generates comprehensive answer with citations
 *
 * This module is the core orchestrator. It calls into:
 *   - rag-filesystem.ts  (legal-database folder search)
 *   - document-loader.ts (user-uploaded file search)
 *   - llm.ts             (LLM completions)
 *   - cache.ts           (result caching)
 */

import { searchFilesystemLegalDB } from "./rag-filesystem";
import { searchUserFiles } from "./document-loader";
import { generateCompletion, getDeepThinkModel } from "./llm";
import { AICache } from "./cache";
import type { RAGResult, RAGContext } from "./rag";

/* ── Types ── */

export interface DeepSearchOptions {
  /** Chat mode / response style */
  mode?: string;
  /** Source filters: law, jurisprudence, issuance, etc. */
  sourceFilters?: string[];
  /** Include user-uploaded files in the search */
  includeUserFiles?: boolean;
  /** User ID for user file search */
  userId?: string;
  /** Max sources to return */
  maxSources?: number;
  /** Max sub-queries to decompose into */
  maxSubQueries?: number;
  /** Conversation history for context */
  history?: { role: "user" | "assistant"; content: string }[];
  /** Deep Think mode — more iterations & deeper analysis */
  deepThink?: boolean;
  /** Active chat mode: find, explain, draft, digest, analyze */
  chatMode?: string;
}

export interface DeepSearchStep {
  type: "decompose" | "search" | "evaluate" | "synthesize";
  label: string;
  detail?: string;
  startedAt: number;
  completedAt?: number;
}

export interface DeepSearchResult {
  answer: string;
  sources: RAGResult[];
  steps: DeepSearchStep[];
  subQueries: string[];
  totalSourcesScanned: number;
  reasoning?: string;
}

/* ── Query Decomposition ── */

/**
 * Use the LLM to break a complex legal question into 2-5 focused sub-queries.
 * Each sub-query targets a specific legal concept, statute, or case.
 */
async function decomposeQuery(
  query: string,
  chatMode?: string,
  history?: { role: string; content: string }[]
): Promise<string[]> {
  // Short-circuit for simple queries — saves an LLM round-trip
  const wordCount = query.trim().split(/\s+/).length;
  if (wordCount <= 4 || query.length <= 40) {
    return [query];
  }

  const historyContext = history?.length
    ? `\nConversation context:\n${history.slice(-4).map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join("\n")}`
    : "";

  const modeHint = chatMode
    ? `\nThe user is in "${chatMode}" mode.`
    : "";

  const prompt = `You are a Philippine legal research query planner. Given a legal question, decompose it into 2-5 focused sub-queries that together cover the full scope of the question. Each sub-query should target a specific legal concept, statute, case, or doctrine.

Rules:
- Output ONLY a JSON array of strings. No other text.
- Each sub-query must be specific and searchable against a Philippine legal database.
- Include queries for: relevant statutes/laws, Supreme Court jurisprudence, key legal doctrines, and practical application.
- If the question is already simple and narrow, return it as a single-element array.
- Maximum 5 sub-queries.${modeHint}${historyContext}

Question: ${query}

Output:`;

  try {
    const raw = await generateCompletion(
      [
        { role: "system", content: "You output only valid JSON arrays of strings." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2, maxTokens: 500 }
    );

    // Parse the JSON array from the response
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5).map(String);
      }
    }
  } catch {
    // Fallback: just use the original query
  }

  return [query];
}

/* ── Iterative Retrieval ── */

/**
 * Run multiple search passes: one per sub-query, across legal DB and user files.
 * Aggregate and deduplicate results.
 */
async function iterativeRetrieval(
  subQueries: string[],
  options: DeepSearchOptions
): Promise<{ results: RAGResult[]; totalScanned: number }> {
  const allResults: RAGResult[] = [];
  let totalScanned = 0;

  // Search legal database for each sub-query in parallel
  const legalSearches = subQueries.map((sq) =>
    searchFilesystemLegalDB(sq, {
      sourceFilters: options.sourceFilters,
      limit: Math.ceil((options.maxSources || 15) / subQueries.length) + 3,
    })
  );

  const legalResults = await Promise.all(legalSearches);
  for (const ctx of legalResults) {
    totalScanned += ctx.totalResults;
    allResults.push(...ctx.results);
  }

  // Search user files if enabled
  if (options.includeUserFiles && options.userId) {
    const userSearches = subQueries.map((sq) =>
      searchUserFiles(sq, options.userId!, { limit: 5 })
    );
    const userResults = await Promise.all(userSearches);
    for (const results of userResults) {
      totalScanned += results.length;
      allResults.push(...results);
    }
  }

  return { results: allResults, totalScanned };
}

/* ── Evaluation & Deduplication ── */

/**
 * Deduplicate, re-score, and rank all retrieved results.
 * Uses title-similarity dedup + cross-query relevance scoring.
 */
function evaluateResults(
  results: RAGResult[],
  originalQuery: string,
  maxResults: number
): RAGResult[] {
  // Deduplicate by documentId
  const seen = new Map<string, RAGResult>();
  for (const r of results) {
    const existing = seen.get(r.documentId);
    if (!existing || r.score > existing.score) {
      seen.set(r.documentId, r);
    }
  }

  // Also dedup by very similar titles (fuzzy)
  const unique: RAGResult[] = [];
  const titlesSeen = new Set<string>();
  for (const r of seen.values()) {
    const normalizedTitle = r.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (!titlesSeen.has(normalizedTitle)) {
      titlesSeen.add(normalizedTitle);
      unique.push(r);
    }
  }

  // Re-score against original query keywords
  const queryKeywords = originalQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const rescored = unique.map((r) => {
    let bonus = 0;
    const titleLower = r.title.toLowerCase();
    const textLower = (r.relevantText || "").toLowerCase();

    for (const kw of queryKeywords) {
      if (titleLower.includes(kw)) bonus += 2;
      if (textLower.includes(kw)) bonus += 1;
    }

    // Recency bonus
    if (r.date) {
      const year = parseInt(r.date);
      if (!isNaN(year) && year >= 2020) bonus += 2;
      else if (!isNaN(year) && year >= 2010) bonus += 1;
    }

    return { ...r, score: r.score + bonus };
  });

  // Sort by score descending
  rescored.sort((a, b) => b.score - a.score);

  return rescored.slice(0, maxResults);
}

/* ── Answer Synthesis ── */

/**
 * Build the comprehensive system prompt for generating the final answer.
 * Includes all retrieved sources, chat mode instructions, and formatting rules.
 */
function buildDeepSearchPrompt(
  sources: RAGResult[],
  subQueries: string[],
  options: DeepSearchOptions
): string {
  const sourcesText = sources
    .map((r, i) => {
      let s = `[SOURCE ${i + 1}] ${r.title}`;
      if (r.number) s += ` (${r.number})`;
      if (r.date) s += ` — ${r.date}`;
      s += `\nCategory: ${r.category}/${r.subcategory}`;
      if (r.relevantText) s += `\nExcerpt:\n${r.relevantText}`;
      return s;
    })
    .join("\n\n---\n\n");

  const modeInstructions: Record<string, string> = {
    standard_v2:
      "Provide a comprehensive, well-structured legal analysis. Include relevant citations for every legal claim. Use formal Philippine legal writing style with clear headings and structured sections.",
    standard:
      "Provide a balanced legal analysis with citations.",
    concise:
      "Be extremely concise. Provide only the key legal points, citations, and conclusions in bullet form.",
    professional:
      "Provide detailed legal analysis suitable for a practising lawyer. Include risk assessment, practical implications, strategic considerations. Cite specific provisions and case holdings with pinpoint references.",
    educational:
      "Explain legal concepts for law students. Define legal terms, explain reasoning, and include learning points with illustrative examples.",
    simple_english:
      "Explain in simple, everyday language. Avoid legal jargon. Use analogies and examples that a non-lawyer would easily understand.",
  };

  const chatModeInstructions: Record<string, string> = {
    find: "The user wants to FIND specific legal documents, cases, or statutes. Focus on listing the most relevant documents with their full citations and brief summaries.",
    explain: "The user wants a legal concept EXPLAINED. Provide clear, structured explanations with supporting citations. Use the format: Definition → Legal Basis → Jurisprudence → Practical Application.",
    draft: "The user wants help DRAFTING a legal document. Provide a well-structured draft or template with proper legal formatting, standard clauses, and citations to supporting law.",
    digest: "The user wants a DIGEST of a case or law. Provide: Title/Citation → Facts → Issues → Ruling → Ratio Decidendi → Dispositive Portion. Format like a proper case digest.",
    analyze: "The user wants IN-DEPTH ANALYSIS. Provide comprehensive legal analysis with: Issue Identification → Applicable Law → Jurisprudential Development → Analysis → Conclusion → Recommendations.",
  };

  const mode = options.mode || "standard_v2";
  const chatMode = options.chatMode;

  return `You are JusConsultus AI, an expert Philippine legal research assistant powered by deep search technology.

${modeInstructions[mode] || modeInstructions.standard_v2}
${chatMode ? chatModeInstructions[chatMode] || "" : ""}

DEEP SEARCH CONTEXT:
I decomposed the user's question into these research sub-queries:
${subQueries.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}

MANDATORY RULES:
1. ALWAYS provide a comprehensive, helpful answer to the user's legal question. Never refuse to answer.
2. Use the provided sources to support your answer with citations when available.
3. If the sources do not directly address the question, use your knowledge of Philippine law to provide an accurate and thorough answer, noting which parts come from general legal knowledge vs. retrieved sources.
4. When citing Supreme Court decisions: Case Title + G.R. Number + Date + Key doctrine.
5. When citing laws/statutes: Full title + Number + Key provisions.
6. Structure your response with:
   - **Legal Context:** (1-2 sentence direct answer specific to the exact question asked — no generic preamble)
   - **Legal Basis / Doctrine** with proper headings
   - Detailed analysis under clear sub-headings
7. Do NOT invent fake G.R. numbers or case names. Use qualifiers like "as established in jurisprudence" when citing from memory.
8. State when the user should consult a lawyer for case-specific advice.

CITATION FORMAT:
When citing a law, wrap it: {{law: FULL TITLE}}
When citing jurisprudence, wrap it: {{case: CASE TITLE (Year)}}
Use > blockquote prefix when directly quoting legal provisions verbatim.

FOLLOW-UP TOPICS:
At the end, include "## Suggested Follow-Up Topics" with 3 concise topic suggestions, each on its own line prefixed with "- ".

RETRIEVED SOURCES FROM THE PHILIPPINE LEGAL DATABASE (${sources.length} documents):
${sourcesText || "No specific documents were retrieved from the database. Use your comprehensive knowledge of Philippine law (Revised Penal Code, Civil Code, Family Code, Rules of Court, Labor Code, Constitution, and established Supreme Court jurisprudence) to provide a thorough and accurate legal analysis."}

Provide your legal analysis now.`;
}

/* ── Main Orchestrator ── */

/**
 * Execute the full DeepSearch pipeline:
 *   1. Decompose query into sub-queries
 *   2. Iterative retrieval across legal DB + user files
 *   3. Evaluate and deduplicate results
 *   4. Generate comprehensive answer via LLM
 */
export async function deepSearch(
  query: string,
  options: DeepSearchOptions = {}
): Promise<DeepSearchResult> {
  const {
    maxSources = 15,
    maxSubQueries = 3,
    deepThink = false,
    history,
    chatMode,
  } = options;

  const steps: DeepSearchStep[] = [];
  const effectiveMaxSources = deepThink ? maxSources * 2 : maxSources;
  const effectiveMaxSubQueries = deepThink ? 5 : maxSubQueries;

  // Check cache
  const cacheKey = `ds:${options.mode || "v2"}:${options.chatMode || "all"}:${options.sourceFilters?.join(",") || "all"}`;
  const cached = await AICache.getRAGContext(query, cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch { /* proceed with fresh search */ }
  }

  // ── Steps 1 & 2: Decompose + initial retrieval IN PARALLEL ──
  // Kick off initial retrieval with the original query immediately while the
  // LLM decomposes the question — this hides the decomposition latency.
  const decomposeStep: DeepSearchStep = {
    type: "decompose",
    label: "Analyzing your question",
    detail: "Breaking down into focused legal research queries",
    startedAt: Date.now(),
  };
  steps.push(decomposeStep);

  const searchStep: DeepSearchStep = {
    type: "search",
    label: "Searching legal database",
    detail: query,
    startedAt: Date.now(),
  };
  steps.push(searchStep);

  const [subQueriesRaw, initialResult] = await Promise.all([
    decomposeQuery(query, chatMode, history),
    iterativeRetrieval([query], {
      ...options,
      // Use a smaller source cap for the initial pass; extra sub-queries fill in the rest
      maxSources: Math.ceil((effectiveMaxSources * 0.6)),
    }),
  ]);
  decomposeStep.completedAt = Date.now();

  const subQueries = subQueriesRaw.slice(0, effectiveMaxSubQueries);

  // Run any genuinely distinct sub-queries discovered by decomposition
  const extraSubQueries = subQueries.filter(
    (q) => q.toLowerCase().trim() !== query.toLowerCase().trim()
  );

  let rawResults = [...initialResult.results];
  let totalScanned = initialResult.totalScanned;

  if (extraSubQueries.length > 0) {
    const { results: extraResults, totalScanned: extraScanned } = await iterativeRetrieval(
      extraSubQueries,
      options
    );
    rawResults = [...rawResults, ...extraResults];
    totalScanned += extraScanned;
  }

  searchStep.label = `Searched ${subQueries.length + 1} queries across legal database`;
  searchStep.detail = [query, ...extraSubQueries].join(" | ");
  searchStep.completedAt = Date.now();

  // ── Step 3: Evaluation & Deduplication ──
  const evalStep: DeepSearchStep = {
    type: "evaluate",
    label: `Evaluating ${rawResults.length} documents`,
    detail: "Scoring relevance, deduplicating, and ranking",
    startedAt: Date.now(),
  };
  steps.push(evalStep);

  const rankedSources = evaluateResults(rawResults, query, effectiveMaxSources);
  evalStep.completedAt = Date.now();

  // ── Step 4: Answer Synthesis ──
  const synthStep: DeepSearchStep = {
    type: "synthesize",
    label: "Generating comprehensive legal analysis",
    detail: `Using ${rankedSources.length} sources`,
    startedAt: Date.now(),
  };
  steps.push(synthStep);

  const systemPrompt = buildDeepSearchPrompt(rankedSources, subQueries, options);

  // Build messages with conversation history
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  if (history?.length) {
    for (const h of history.slice(-6)) {
      messages.push({ role: h.role, content: h.content.slice(0, 1500) });
    }
  }
  messages.push({ role: "user", content: query });

  const deepThinkModel = getDeepThinkModel();
  const answer = await generateCompletion(messages, {
    model: deepThink ? deepThinkModel : undefined,
    // deepseek-reasoner requires temperature=1 (handled inside generateCompletion)
    temperature: deepThink ? 1 : 0.3,
    maxTokens: deepThink ? 8192 : 2048,
  });

  synthStep.completedAt = Date.now();

  const result: DeepSearchResult = {
    answer,
    sources: rankedSources,
    steps,
    subQueries,
    totalSourcesScanned: totalScanned,
  };

  // Cache the result (shorter TTL for deep think to save money)
  await AICache.setRAGContext(
    query,
    cacheKey,
    JSON.stringify(result),
    { ttlMs: deepThink ? 1000 * 60 * 30 : 1000 * 60 * 60 * 2 }
  );

  return result;
}

/**
 * Lightweight search — single-pass retrieval without decomposition.
 * Used for quick suggestions, auto-complete, and database search.
 */
export async function quickSearch(
  query: string,
  options: { sourceFilters?: string[]; limit?: number; userId?: string } = {}
): Promise<RAGContext> {
  return searchFilesystemLegalDB(query, {
    sourceFilters: options.sourceFilters,
    limit: options.limit || 10,
  });
}
