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
      limit: Math.ceil((options.maxSources || 20) / subQueries.length) + 3,
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
1. Base your answer ONLY on the provided sources. Do NOT invent cases, laws, or G.R. numbers.
2. Always cite specific case names, G.R. numbers, Republic Act numbers, and dates when available.
3. For Supreme Court decisions, provide:
   - Case title and G.R. Number
   - Date of decision
   - Key doctrine and ruling
4. For laws and statutes, provide:
   - Full title and number
   - Date of approval
   - Key provisions
5. Structure your response with:
   - **Bottom line:** (1-2 sentence direct answer)
   - **Legal Basis / Doctrine** with proper headings
   - Detailed analysis under clear sub-headings
6. Clearly state when your information may be incomplete or when the user should consult a lawyer.
7. NEVER fabricate citations or case numbers. If no source covers the question, say so.

CITATION FORMAT:
When citing a law, wrap it: {{law: FULL TITLE}}
When citing jurisprudence, wrap it: {{case: CASE TITLE (Year)}}
Use > blockquote prefix when directly quoting legal provisions verbatim.

FOLLOW-UP TOPICS:
At the end, include "## Suggested Follow-Up Topics" with 3 concise topic suggestions, each on its own line prefixed with "- ".

RETRIEVED SOURCES FROM THE PHILIPPINE LEGAL DATABASE (${sources.length} documents):
${sourcesText || "No matching sources were found. Provide general guidance based on well-known Philippine legal principles, but clearly state that no specific source was located."}

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
    maxSources = 20,
    maxSubQueries = 4,
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

  // ── Step 1: Query Decomposition ──
  const decomposeStep: DeepSearchStep = {
    type: "decompose",
    label: "Analyzing your question",
    detail: "Breaking down into focused legal research queries",
    startedAt: Date.now(),
  };
  steps.push(decomposeStep);

  const subQueries = await decomposeQuery(query, chatMode, history);
  decomposeStep.completedAt = Date.now();

  // ── Step 2: Iterative Retrieval ──
  const searchStep: DeepSearchStep = {
    type: "search",
    label: `Searching ${subQueries.length} queries across legal database`,
    detail: subQueries.join(" | "),
    startedAt: Date.now(),
  };
  steps.push(searchStep);

  const { results: rawResults, totalScanned } = await iterativeRetrieval(
    subQueries.slice(0, effectiveMaxSubQueries),
    options
  );
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
    maxTokens: deepThink ? 8192 : 4096,
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
