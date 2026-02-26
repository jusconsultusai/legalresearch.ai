/**
 * KAG — Knowledge-Augmented Generation Layer
 *
 * Implements KAG principles (https://github.com/OpenSPG/KAG) natively in TypeScript
 * for the JusConsultus Philippine legal knowledge base.
 *
 * Core KAG components:
 *   1. Logical Form Decomposition  — parse natural language → formal logical operations
 *   2. Entity Extraction & Recognition — detect law numbers, G.R. numbers, legal concepts
 *   3. Exact Match Retrieval       — precise lookup by identifier (law no., G.R. no., etc.)
 *   4. Multi-hop Knowledge Graph Reasoning — chain related legal entities
 *   5. Knowledge & Chunk Mutual Indexing  — link graph nodes ↔ source text chunks
 *   6. Schema-constrained Construction   — typed Philippine legal entity schema
 *
 * Architecture:
 *   Query → LogicalForm → [ExactLookup | ConceptExpansion | MultiHop] → KAGContext → LLM
 */

import { promises as fs } from "fs";
import path from "path";
import type { RAGResult, RAGContext } from "./rag";

// ── Philippine Legal Entity Schema ──────────────────────────────────────────────
export type LegalEntityType =
  | "supreme_court_case"   // G.R. No. XXXXX
  | "republic_act"         // Republic Act No. XXXX
  | "presidential_decree"  // Presidential Decree No. XXXX
  | "batas_pambansa"       // Batas Pambansa Blg. XXXX
  | "executive_order"      // Executive Order No. XXXX
  | "administrative_order" // Administrative Order No. XXXX
  | "constitution"         // Philippine Constitution
  | "legal_concept"        // Doctrine, principle, right, etc.
  | "legal_person"         // Party name in a case
  | "unknown";

export interface LegalEntity {
  type: LegalEntityType;
  raw: string;          // Original text matched
  normalized: string;   // Canonical form (e.g. "R.A. No. 9262")
  number?: string;      // Numeric portion only
  year?: string;
}

export interface LogicalForm {
  /** Primary operation to solve the query */
  operation: "lookup" | "search" | "compare" | "aggregate" | "reason" | "multi_hop";
  /** Extracted entities from the query */
  entities: LegalEntity[];
  /** Logical sub-steps to execute in order */
  steps: LogicalStep[];
  /** Detected query intent */
  intent: "find_law" | "find_case" | "explain_concept" | "compare_laws" | "draft" | "general_research";
  /** Keywords after removing entities and stop words */
  conceptKeywords: string[];
  /** Whether this requires multi-hop reasoning across related documents */
  requiresMultiHop: boolean;
  /** Confidence that logical form parsing succeeded */
  confidence: number;
}

export interface LogicalStep {
  type: "exact_lookup" | "semantic_search" | "graph_traverse" | "filter" | "rerank" | "synthesize";
  target?: string;   // Entity or concept to operate on
  params?: Record<string, unknown>;
}

export interface KAGResult extends RAGResult {
  /** How this result was found */
  retrievalMode: "exact_match" | "entity_expansion" | "multi_hop" | "schema_lookup" | "vector_fallback";
  /** Entities contained in this document */
  containedEntities?: LegalEntity[];
  /** Logical reasoning chain that led here */
  reasoningChain?: string[];
  /** Multi-hop depth (0 = direct, 1+ = via related entity) */
  hopDepth: number;
}

// ── Entity Extraction Patterns ─────────────────────────────────────────────────
const ENTITY_PATTERNS: Array<{ re: RegExp; type: LegalEntityType; prefix: string }> = [
  {
    re: /\bG\.?R\.?\s*Nos?\.?\s*([\d,\s-]+(?:and\s+[\d-]+)?)/gi,
    type: "supreme_court_case", prefix: "G.R. No.",
  },
  {
    re: /\bRepublic Act\s+(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "republic_act", prefix: "Republic Act No.",
  },
  {
    re: /\bR\.?A\.?\s*(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "republic_act", prefix: "R.A. No.",
  },
  {
    re: /\bPresidential Decree\s+(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "presidential_decree", prefix: "Presidential Decree No.",
  },
  {
    re: /\bP\.?D\.?\s*(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "presidential_decree", prefix: "P.D. No.",
  },
  {
    re: /\bBatas Pambansa\s+(?:Blg\.?\s*)?([\d,\s]+)/gi,
    type: "batas_pambansa", prefix: "Batas Pambansa Blg.",
  },
  {
    re: /\bB\.?P\.?\s*(?:Blg\.?\s*)?([\d,\s]+)/gi,
    type: "batas_pambansa", prefix: "B.P. Blg.",
  },
  {
    re: /\bExecutive Order\s+(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "executive_order", prefix: "Executive Order No.",
  },
  {
    re: /\bE\.?O\.?\s*(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "executive_order", prefix: "E.O. No.",
  },
  {
    re: /\bAdministrative Order\s+(?:No\.?\s*)?([\d,\s]+)/gi,
    type: "administrative_order", prefix: "Administrative Order No.",
  },
  {
    re: /\b(1987|1973|1935)\s+(?:Philippine\s+)?Constitution/gi,
    type: "constitution", prefix: "Philippine Constitution",
  },
];

/** Legal doctrines, rights, and concepts to detect */
const CONCEPT_PATTERNS: RegExp[] = [
  /\b(?:due process|equal protection|police power|eminent domain|judicial review)\b/gi,
  /\b(?:res judicata|stare decisis|collateral estoppel|laches|prescription)\b/gi,
  /\b(?:habeas corpus|certiorari|mandamus|prohibition|quo warranto)\b/gi,
  /\b(?:double jeopardy|right to counsel|presumption of innocence|speedy trial)\b/gi,
  /\b(?:labor standards|security of tenure|illegal dismissal|constructive dismissal)\b/gi,
  /\b(?:civil liability|criminal liability|moral damages|exemplary damages)\b/gi,
  /\b(?:land reform|agrarian reform|tenancy|CARP)\b/gi,
  /\b(?:anti-graft|plunder|malversation|bribery|corruption)\b/gi,
  /\b(?:anti-violence|VAWC|RA 9262|domestic violence)\b/gi,
  /\b(?:cybercrime|data privacy|DICT|NPC)\b/gi,
];

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "and",
  "or", "but", "not", "it", "its", "this", "that", "what", "which", "who",
  "how", "when", "where", "why", "can", "may", "shall", "will", "do", "does",
  "did", "has", "have", "had", "about", "under", "law", "laws", "case", "cases",
  "legal", "philippines", "philippine",
]);

// ── Logical Form Parser ────────────────────────────────────────────────────────

/** Parse a natural language legal query into a structured logical form. */
export function parseLogicalForm(query: string): LogicalForm {
  const entities: LegalEntity[] = [];
  let remaining = query;

  // Extract all legal entities using pattern matching
  for (const { re, type, prefix } of ENTITY_PATTERNS) {
    const matches = [...query.matchAll(re)];
    for (const m of matches) {
      const raw = m[0];
      const number = m[1]?.trim().replace(/\s+/g, " ") || raw;
      const normalized = `${prefix} ${number}`.trim();
      if (!entities.some((e) => e.normalized === normalized)) {
        entities.push({ type, raw, normalized, number });
      }
      remaining = remaining.replace(raw, " ");
    }
  }

  // Extract legal concepts
  const concepts: string[] = [];
  for (const pattern of CONCEPT_PATTERNS) {
    const matches = [...query.matchAll(pattern)];
    for (const m of matches) {
      const concept = m[0].trim();
      if (!concepts.includes(concept.toLowerCase())) {
        concepts.push(concept.toLowerCase());
        remaining = remaining.replace(m[0], " ");
      }
    }
  }

  // Extract remaining concept keywords
  const conceptKeywords = [
    ...concepts,
    ...remaining
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w) && /^[a-z]/.test(w)),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 15);

  // Detect intent
  const queryLower = query.toLowerCase();
  let intent: LogicalForm["intent"] = "general_research";
  if (/\b(what|which|find|get|show|list)\b.*\b(law|act|statute|code|decree)\b/i.test(query))
    intent = "find_law";
  else if (/\b(case|ruling|decision|jurisprudence|held|doctrine)\b/i.test(query) || entities.some((e) => e.type === "supreme_court_case"))
    intent = "find_case";
  else if (/\b(explain|what is|define|meaning|concept|doctrine)\b/i.test(query))
    intent = "explain_concept";
  else if (/\b(compare|difference|versus|vs\.?|between)\b/i.test(query))
    intent = "compare_laws";
  else if (/\b(draft|write|prepare|create|template|format)\b/i.test(query))
    intent = "draft";

  // Determine logical operation
  let operation: LogicalForm["operation"] = "search";
  const requiresMultiHop = entities.length > 1 ||
    conceptKeywords.some((k) => ["amend", "repealed", "superseded", "pursuant", "implementing"].includes(k));

  if (entities.length > 0 && conceptKeywords.length === 0) operation = "lookup";
  else if (entities.length > 0 && conceptKeywords.length > 0) operation = "reason";
  else if (requiresMultiHop) operation = "multi_hop";

  // Build logical steps
  const steps: LogicalStep[] = [];

  // Step 1: Exact lookup for any identified entities
  if (entities.length > 0) {
    for (const entity of entities) {
      steps.push({
        type: "exact_lookup",
        target: entity.normalized,
        params: { type: entity.type, number: entity.number },
      });
    }
  }

  // Step 2: Semantic search for concept keywords
  if (conceptKeywords.length > 0) {
    steps.push({
      type: "semantic_search",
      target: conceptKeywords.slice(0, 5).join(" "),
      params: { intent },
    });
  }

  // Step 3: Multi-hop graph traversal if needed
  if (requiresMultiHop && entities.length > 0) {
    steps.push({
      type: "graph_traverse",
      target: entities[0].normalized,
      params: { depth: 1, relation: "related_law" },
    });
  }

  // Step 4: Re-rank and synthesize
  steps.push({ type: "rerank" });
  steps.push({ type: "synthesize" });

  const confidence = entities.length > 0 ? 0.9 : conceptKeywords.length > 0 ? 0.7 : 0.5;

  return {
    operation,
    entities,
    steps,
    intent,
    conceptKeywords,
    requiresMultiHop,
    confidence,
  };
}

// ── Filesystem-Based Legal Knowledge Graph ────────────────────────────────────

const LEGAL_DB_ROOT = path.join(process.cwd(), "data", "legal-database");

/** Resolve entity type to filesystem folders */
function entityToFolders(entity: LegalEntity): string[] {
  const folderMap: Record<LegalEntityType, string[]> = {
    supreme_court_case:   ["Supreme Court/Decisions & Signed Resolutions", "Supreme Court/SC Case Index"],
    republic_act:         ["Laws/Republic Acts"],
    presidential_decree:  ["Laws/Presidential Decree"],
    batas_pambansa:       ["Laws/Batas Pambansa"],
    executive_order:      ["Executive Issuances/Executive Orders"],
    administrative_order: ["Executive Issuances/Administrative Orders"],
    constitution:         ["Laws/Philippine Constitutions"],
    legal_concept:        [],
    legal_person:         ["Supreme Court/Decisions & Signed Resolutions"],
    unknown:              [],
  };
  return folderMap[entity.type] || [];
}

/** Strip HTML to plain text (fast, no DOM parser needed in Node) */
function fastHtmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

/** Extract a relevant text snippet around a keyword hit */
function extractSnippet(text: string, keywords: string[], maxLen = 600): string {
  const textLower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = textLower.indexOf(kw.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 200);
      const end = Math.min(text.length, idx + 400);
      return text.slice(start, end);
    }
  }
  return text.slice(0, maxLen);
}

/** Recursively list HTML files with year sub-folder support */
async function listHtmlFiles(folderAbs: string): Promise<{ filename: string; absPath: string; yearFolder?: string }[]> {
  let entries;
  try { entries = await fs.readdir(folderAbs, { withFileTypes: true }); }
  catch { return []; }

  const results: { filename: string; absPath: string; yearFolder?: string }[] = [];
  const yearDirs = entries.filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name));

  if (yearDirs.length > 0) {
    for (const dir of yearDirs.slice(0, 12)) {
      try {
        const files = await fs.readdir(path.join(folderAbs, dir.name));
        for (const f of files) {
          if (/\.html?$/i.test(f))
            results.push({ filename: f, absPath: path.join(folderAbs, dir.name, f), yearFolder: dir.name });
        }
      } catch { /* skip */ }
    }
  } else {
    for (const e of entries) {
      if (e.isFile() && /\.html?$/i.test(e.name))
        results.push({ filename: e.name, absPath: path.join(folderAbs, e.name) });
    }
  }
  return results;
}

/** Match a file by exact entity number */
function fileMatchesEntity(filename: string, entity: LegalEntity): boolean {
  const fl = filename.toLowerCase();
  const num = entity.number?.toLowerCase() || "";
  const norm = entity.normalized.toLowerCase();

  // Direct number match in filename
  if (num && fl.includes(num.replace(/\s+/g, "_").replace(/\s+/g, "-"))) return true;
  if (num && fl.includes(num.replace(/\D/g, ""))) return true;
  // Normalized form segments
  const segments = norm.split(/\s+/);
  const numericPart = segments.find((s) => /^\d/.test(s));
  if (numericPart && fl.includes(numericPart)) return true;
  return false;
}

// ── KAG Exact Lookup (Schema-constrained retrieval) ───────────────────────────

/**
 * KAG Step: Exact entity lookup
 * Finds the precise legal document matching a known law/case identifier.
 * This is the "exact match retrieval" operator in the KAG logical form engine.
 */
async function exactEntityLookup(
  entity: LegalEntity,
  conceptKeywords: string[]
): Promise<KAGResult[]> {
  const folders = entityToFolders(entity);
  if (folders.length === 0) return [];

  const results: KAGResult[] = [];

  await Promise.all(
    folders.map(async (folder) => {
      const folderAbs = path.join(LEGAL_DB_ROOT, folder);
      const files = await listHtmlFiles(folderAbs);

      // Strict filename match first
      const matched = files.filter(({ filename }) => fileMatchesEntity(filename, entity));

      // Broader fallback: any file mentioning the number
      const broader =
        matched.length === 0
          ? files.filter(({ filename }) => {
              const num = entity.number?.replace(/\D/g, "") || "";
              return num.length >= 3 && filename.replace(/\D/g, "").includes(num);
            }).slice(0, 3)
          : [];

      const toProcess = [...matched.slice(0, 3), ...broader];

      await Promise.all(
        toProcess.map(async ({ filename, absPath, yearFolder }) => {
          try {
            const html = await fs.readFile(absPath, "utf-8").catch(
              () => fs.readFile(absPath, "latin1")
            );
            const text = fastHtmlToText(html as string);
            const snippet = extractSnippet(
              text,
              [entity.number || entity.normalized, ...conceptKeywords],
              700
            );
            const relPath = path.relative(LEGAL_DB_ROOT, absPath).replace(/\\/g, "/");
            const docId = Buffer.from(relPath).toString("base64url");

            results.push({
              documentId:       docId,
              title:            entity.normalized,
              category:         folders[0].split("/")[0].toLowerCase().replace(/\s+/g, "_"),
              subcategory:      folder.split("/").pop()?.toLowerCase().replace(/\s+/g, "_") || "general",
              number:           entity.normalized,
              date:             yearFolder || entity.year,
              relevantText:     snippet,
              summary:          snippet.slice(0, 300),
              score:            100,
              relativePath:     relPath,
              retrievalMode:    "exact_match",
              hopDepth:         0,
              reasoningChain:   [`Exact lookup: ${entity.type} → ${entity.normalized}`],
              containedEntities: [entity],
            });
          } catch { /* skip */ }
        })
      );
    })
  );

  return results;
}

// ── KAG Multi-hop Graph Traversal ─────────────────────────────────────────────

/**
 * KAG Step: Knowledge Graph traversal
 * Starting from a seed entity, find related laws/cases by:
 *   - Amendment chains (law X amended by law Y)
 *   - Implementing rules (law X implemented by EO Y)
 *   - Case law citing a statute
 *   - Constitutional basis of a statute
 */
async function graphTraverse(
  seedEntity: LegalEntity,
  conceptKeywords: string[],
  depth: number = 1
): Promise<KAGResult[]> {
  // Start with the seed document text
  const seedResults = await exactEntityLookup(seedEntity, conceptKeywords);
  if (seedResults.length === 0 || depth === 0) return seedResults;

  const relatedResults: KAGResult[] = [];

  // Scan the seed document's text for references to OTHER laws/cases
  for (const seed of seedResults.slice(0, 1)) {
    const seedText = seed.relevantText || "";
    const relatedEntities: LegalEntity[] = [];

    // Extract entity references from the seed document
    for (const { re, type, prefix } of ENTITY_PATTERNS) {
      const matches = [...seedText.matchAll(re)];
      for (const m of matches) {
        const number = m[1]?.trim() || m[0];
        const normalized = `${prefix} ${number}`.trim();
        if (normalized !== seedEntity.normalized && !relatedEntities.some((e) => e.normalized === normalized)) {
          relatedEntities.push({ type, raw: m[0], normalized, number });
        }
      }
    }

    // Lookup related entities (hop depth 1)
    if (relatedEntities.length > 0 && depth > 0) {
      const hopSearches = relatedEntities.slice(0, 3).map((e) =>
        exactEntityLookup(e, conceptKeywords).then((res) =>
          res.map((r) => ({
            ...r,
            hopDepth: 1,
            retrievalMode: "multi_hop" as const,
            reasoningChain: [
              `Root: ${seedEntity.normalized}`,
              `Referenced in root: ${e.normalized}`,
              `Retrieved: ${r.title}`,
            ],
          }))
        )
      );
      const hopResults = await Promise.all(hopSearches);
      relatedResults.push(...hopResults.flat());
    }
  }

  return [...seedResults, ...relatedResults];
}

// ── KAG Concept Expansion ──────────────────────────────────────────────────────

/**
 * KAG Step: Schema-constrained concept search
 * When no entity number is identified, search by legal concept using
 * folder-aware keyword matching (schema constrains which categories to search).
 */
async function conceptSearch(
  conceptKeywords: string[],
  intent: LogicalForm["intent"],
  limit = 8
): Promise<KAGResult[]> {
  if (conceptKeywords.length === 0) return [];

  // Map intent to relevant folder categories (KAG schema constraint)
  const intentFolderMap: Record<string, string[]> = {
    find_case:       ["Supreme Court/Decisions & Signed Resolutions"],
    find_law:        ["Laws/Republic Acts", "Laws/Presidential Decree", "Laws/Batas Pambansa"],
    explain_concept: [
      "Supreme Court/Decisions & Signed Resolutions",
      "Laws/Republic Acts",
      "References/Benchbooks",
    ],
    compare_laws:    ["Laws/Republic Acts", "Laws/Presidential Decree", "Laws/Batas Pambansa"],
    draft:           ["References/Revised Book of Judicial Forms", "References/Benchbooks"],
    general_research: [
      "Supreme Court/Decisions & Signed Resolutions",
      "Laws/Republic Acts",
      "Laws/Presidential Decree",
      "Executive Issuances/Executive Orders",
    ],
  };

  const folders = intentFolderMap[intent] || intentFolderMap.general_research;
  const results: (KAGResult & { _sortScore: number })[] = [];

  await Promise.all(
    folders.map(async (folder) => {
      const folderAbs = path.join(LEGAL_DB_ROOT, folder);
      const files = await listHtmlFiles(folderAbs);

      // Pre-filter by filename keyword match
      const candidates = files.filter(({ filename }) => {
        const fl = filename.toLowerCase();
        return conceptKeywords.some((kw) => fl.includes(kw));
      });
      // Also sample non-matching files for content hits
      const sample = files.filter((f) => !candidates.includes(f)).slice(0, 5);

      await Promise.all(
        [...candidates, ...sample].map(async ({ filename, absPath, yearFolder }) => {
          try {
            const html = await fs.readFile(absPath, "utf-8").catch(
              () => fs.readFile(absPath, "latin1")
            );
            const text = fastHtmlToText(html as string);
            const textLower = text.toLowerCase();

            let score = 0;
            for (const kw of conceptKeywords) {
              if (filename.toLowerCase().includes(kw)) score += 5;
              const hits = (textLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
              score += Math.min(hits, 10);
            }
            if (score === 0) return;

            const snippet = extractSnippet(text, conceptKeywords, 600);
            const relPath = path.relative(LEGAL_DB_ROOT, absPath).replace(/\\/g, "/");
            const docId = Buffer.from(relPath).toString("base64url");
            const parts = folder.split("/");

            results.push({
              documentId:    docId,
              title:         filename.replace(/\.html?$/i, "").replace(/[_-]/g, " "),
              category:      parts[0].toLowerCase().replace(/\s+/g, "_"),
              subcategory:   (parts[1] || parts[0]).toLowerCase().replace(/\s+/g, "_"),
              date:          yearFolder,
              relevantText:  snippet,
              summary:       snippet.slice(0, 300),
              score,
              relativePath:  relPath,
              retrievalMode: "schema_lookup",
              hopDepth:      0,
              reasoningChain: [`Schema-constrained search: intent=${intent}, keywords=${conceptKeywords.slice(0, 3).join(", ")}`],
              _sortScore:    score,
            });
          } catch { /* skip */ }
        })
      );
    })
  );

  results.sort((a, b) => b._sortScore - a._sortScore);
  return results.slice(0, limit).map(({ _sortScore, ...rest }) => rest);
}

// ── Main KAG Search Orchestrator ──────────────────────────────────────────────

export interface KAGSearchOptions {
  sourceFilters?: string[];
  maxResults?: number;
  enableMultiHop?: boolean;
  graphTraversalDepth?: number;
}

export interface KAGSearchResult {
  ragContext: RAGContext;
  logicalForm: LogicalForm;
  kagResults: KAGResult[];
  retrievalModes: string[];
}

/**
 * Main KAG search entry point.
 *
 * Pipeline:
 *   1. Parse logical form from natural language query
 *   2. For each entity: exact lookup → multi-hop traverse
 *   3. Concept search (schema-constrained) for remaining keywords
 *   4. Deduplicate + rank all results
 *   5. Return structured KAGContext for LLM synthesis
 */
export async function kagSearch(
  query: string,
  options: KAGSearchOptions = {}
): Promise<KAGSearchResult> {
  const { maxResults = 10, enableMultiHop = true, graphTraversalDepth = 1 } = options;

  // Step 1: Parse logical form
  const logicalForm = parseLogicalForm(query);
  const allResults: KAGResult[] = [];
  const retrievalModes = new Set<string>();

  // Step 2: Execute logical steps
  for (const step of logicalForm.steps) {
    if (step.type === "exact_lookup" && step.target) {
      // Find entity
      const entity = logicalForm.entities.find((e) => e.normalized === step.target);
      if (!entity) continue;

      const doMultiHop = enableMultiHop && logicalForm.requiresMultiHop && graphTraversalDepth > 0;
      const results = doMultiHop
        ? await graphTraverse(entity, logicalForm.conceptKeywords, graphTraversalDepth)
        : await exactEntityLookup(entity, logicalForm.conceptKeywords);

      allResults.push(...results);
      results.forEach((r) => retrievalModes.add(r.retrievalMode));
    } else if (step.type === "semantic_search") {
      const conceptResults = await conceptSearch(
        logicalForm.conceptKeywords,
        logicalForm.intent,
        maxResults
      );
      allResults.push(...conceptResults);
      conceptResults.forEach((r) => retrievalModes.add(r.retrievalMode));
    }
    // graph_traverse is handled inside exact_lookup when enableMultiHop=true
  }

  // Step 3: Deduplicate by documentId + re-rank
  const seen = new Map<string, KAGResult>();
  for (const r of allResults) {
    const existing = seen.get(r.documentId);
    // Prefer exact matches over concept searches
    const newPriority = r.retrievalMode === "exact_match" ? r.score + 50 : r.score;
    const oldPriority = existing
      ? existing.retrievalMode === "exact_match"
        ? existing.score + 50
        : existing.score
      : -1;
    if (!existing || newPriority > oldPriority) {
      seen.set(r.documentId, r);
    }
  }

  // Boost results that match original query keywords
  const queryKws = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const ranked = [...seen.values()].map((r) => {
    let boost = 0;
    const titleL = r.title.toLowerCase();
    const textL  = (r.relevantText || "").toLowerCase();
    for (const kw of queryKws) {
      if (titleL.includes(kw)) boost += 2;
      if (textL.includes(kw))  boost += 1;
    }
    if (r.date) {
      const yr = parseInt(r.date);
      if (!isNaN(yr) && yr >= 2020) boost += 2;
      else if (!isNaN(yr) && yr >= 2010) boost += 1;
    }
    return { ...r, score: r.score + boost };
  });

  ranked.sort((a, b) => b.score - a.score);
  const kagResults = ranked.slice(0, maxResults);

  return {
    ragContext: {
      query,
      results: kagResults,
      totalResults: kagResults.length,
    },
    logicalForm,
    kagResults,
    retrievalModes: [...retrievalModes],
  };
}

/**
 * Build a KAG-enhanced system prompt for LLM synthesis.
 * Includes the logical form, entity knowledge graph, and source citations.
 */
export function buildKAGPrompt(
  ragContext: RAGContext,
  logicalForm: LogicalForm,
  mode: string = "standard_v2"
): string {
  const modeInstructions: Record<string, string> = {
    standard_v2:   "Provide a comprehensive, well-structured legal analysis with formal Philippine legal writing style.",
    concise:       "Be extremely concise. Key legal points and citations only.",
    professional:  "Detailed legal analysis for practitioners. Include risk assessment, practical implications, strategic considerations.",
    educational:   "Explain for law students. Define terms, explain reasoning, include learning points.",
    simple_english: "Explain in everyday language. Avoid legal jargon. Use analogies.",
  };

  const entitySection = logicalForm.entities.length > 0
    ? `\nIDENTIFIED LEGAL ENTITIES (KAG Knowledge Graph):\n${logicalForm.entities.map((e) => `  • ${e.type.replace(/_/g, " ")}: ${e.normalized}`).join("\n")}`
    : "";

  const logicalFormSection = `\nLOGICAL FORM ANALYSIS:\n  Operation: ${logicalForm.operation}\n  Intent: ${logicalForm.intent.replace(/_/g, " ")}\n  Concepts: ${logicalForm.conceptKeywords.slice(0, 5).join(", ") || "none"}${logicalForm.requiresMultiHop ? "\n  Multi-hop reasoning: enabled" : ""}`;

  const sourcesText = ragContext.results
    .map((r, i) => {
      const kagR = r as KAGResult;
      let source = `[SOURCE ${i + 1}] ${r.title}`;
      if (r.number) source += ` (${r.number})`;
      if (r.date) source += ` — ${r.date}`;
      source += `\nCategory: ${r.category}/${r.subcategory}`;
      if (kagR.retrievalMode) source += ` | Found via: ${kagR.retrievalMode.replace(/_/g, " ")}`;
      if (kagR.hopDepth && kagR.hopDepth > 0) source += ` | Hop depth: ${kagR.hopDepth}`;
      if (kagR.reasoningChain?.length) source += `\nReasoning: ${kagR.reasoningChain.join(" → ")}`;
      if (r.relevantText) source += `\nExcerpt:\n${r.relevantText}`;
      return source;
    })
    .join("\n\n---\n\n");

  return `You are JusConsultus AI, an expert Philippine legal research assistant enhanced with Knowledge-Augmented Generation (KAG).

${modeInstructions[mode] || modeInstructions.standard_v2}
${entitySection}
${logicalFormSection}

MANDATORY RULES:
1. ALWAYS provide a comprehensive, helpful answer to the user's legal question. Never refuse to answer.
2. Use the provided sources to support your answer with citations when available.
3. If the sources do not directly address the question, use your knowledge of Philippine law to provide an accurate answer, clearly noting which parts come from your general legal knowledge vs. retrieved sources.
4. When citing Supreme Court decisions: Title + G.R. Number + Date + Key doctrine.
5. When citing statutes: Full title + Number + relevant provisions.
6. Structure: **Legal Context** (1-2 sentence direct answer to the specific question) → **Legal Basis/Doctrine** → **Detailed Analysis** → **Sources Referenced**.
7. Do NOT invent fake G.R. numbers or case names. If citing from memory, use qualifiers like "as established in jurisprudence" or "under settled doctrine."
8. State when the user should consult a lawyer for case-specific advice.
9. When multi-hop results are present, explain the reasoning chain connecting related laws.

CITATION FORMAT:
Cite laws: {{law: FULL TITLE}}
Cite jurisprudence: {{case: CASE TITLE (Year)}}
Quote provisions verbatim: use > blockquote prefix

FOLLOW-UP TOPICS:
End with "## Suggested Follow-Up Topics" — 3 concise suggestions prefixed with "- ".

RETRIEVED SOURCES (${ragContext.results.length} documents via KAG hybrid reasoning):
${sourcesText || "No matching documents were retrieved from the database for this specific query. Use your comprehensive knowledge of Philippine law (Revised Penal Code, Civil Code, Family Code, Rules of Court, Labor Code, Constitution, and established Supreme Court jurisprudence) to provide a thorough and accurate legal analysis. Clearly indicate that your answer is based on general legal knowledge rather than specific retrieved documents."}

Provide your legal analysis now.`;
}
