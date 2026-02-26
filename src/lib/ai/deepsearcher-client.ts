/**
 * DeepSearcher TypeScript Client
 *
 * HTTP client for the Python FastAPI sidecar (tools/deepsearcher/server.py)
 * that exposes Milvus Lite vector search + DeepSearcher agentic pipeline.
 *
 * Port: 8010 (configurable via DEEPSEARCHER_URL env var)
 *
 * Endpoints:
 *   GET  /health             — liveness check
 *   GET  /stats              — collection statistics
 *   POST /search             — fast vector similarity search
 *   POST /query              — full agentic deep search pipeline
 *   POST /kag/lookup         — KAG exact entity lookup via sidecar
 *   POST /index/batch        — trigger bulk indexing of legal HTML files
 */

import type { KAGResult } from "./kag";

const DEEPSEARCHER_URL =
  process.env.DEEPSEARCHER_URL?.replace(/\/$/, "") ||
  "http://localhost:8010";

const DEFAULT_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS  =  3_000;

// ── Request / Response types (mirroring server.py Pydantic models) ────────────

export interface DSSearchRequest {
  query:          string;
  top_k?:         number;
  score_threshold?: number;
  category_filter?: string;
}

export interface DSQueryRequest {
  query:         string;
  max_iterations?: number;
  top_k?:        number;
  category_filter?: string;
}

export interface DSKAGLookupRequest {
  identifier:    string;
  entity_type:   string;
  number?:       string;
}

export interface DSIndexRequest {
  root_path?:    string;
  max_files?:    number;
}

export interface DSChunk {
  id:         string;
  text:       string;
  score:      number;
  category:   string;
  subcategory: string;
  filepath:   string;
  title:      string;
  date?:      string;
}

export interface DSSearchResponse {
  results:    DSChunk[];
  query_used: string;
  total:      number;
}

export interface DSQueryResponse {
  answer:      string;
  sub_queries: string[];
  sources:     DSChunk[];
  iterations:  number;
}

export interface DSKAGResponse {
  found:    boolean;
  results:  DSChunk[];
  identifier: string;
}

export interface DSHealthResponse {
  status:        "ok" | "starting" | "error";
  indexed_chunks: number;
  collection:    string;
  embedding_ready: boolean;
  llm_ready:     boolean;
}

export interface DSStatsResponse {
  collection_name: string;
  num_entities:    number;
  categories:      Record<string, number>;
  embedding_model: string;
  embedding_dim:   number;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

class DeepSearcherError extends Error {
  constructor(public status: number, message: string) {
    super(`DeepSearcher [${status}]: ${message}`);
    this.name = "DeepSearcherError";
  }
}

async function post<T>(endpoint: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${DEEPSEARCHER_URL}${endpoint}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DeepSearcherError(res.status, text);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

async function get<T>(endpoint: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${DEEPSEARCHER_URL}${endpoint}`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DeepSearcherError(res.status, text);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ── Availability status cache ─────────────────────────────────────────────────
let _available: boolean | null = null;
let _lastCheck = 0;
const AVAILABILITY_TTL_MS = 10_000; // re-check every 10 s

/** Returns true if the Python sidecar is reachable. Cached for 10 s. */
export async function isSidecarAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_available !== null && now - _lastCheck < AVAILABILITY_TTL_MS) return _available;

  try {
    const health = await get<DSHealthResponse>("/health", HEALTH_TIMEOUT_MS);
    _available = health.status === "ok" || health.status === "starting";
  } catch {
    _available = false;
  }

  _lastCheck = now;
  return _available;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fast: Milvus Lite vector similarity search. Returns top-k semantically similar chunks. */
export async function vectorSearch(
  query:           string,
  topK:            number = 8,
  categoryFilter?: string,
  scoreThreshold?: number
): Promise<DSSearchResponse> {
  return post<DSSearchResponse>("/search", {
    query,
    top_k:            topK,
    score_threshold:  scoreThreshold,
    category_filter:  categoryFilter,
  } satisfies DSSearchRequest);
}

/**
 * Deep: Full agentic pipeline.
 * DeepSearcher decomposes the query into sub-queries, iteratively retrieves
 * chunks, re-ranks, and synthesizes an answer via LLM.
 */
export async function deepQuery(
  query:          string,
  maxIterations:  number = 3,
  topK:           number = 10,
  categoryFilter?: string
): Promise<DSQueryResponse> {
  return post<DSQueryResponse>(
    "/query",
    {
      query,
      max_iterations: maxIterations,
      top_k:          topK,
      category_filter: categoryFilter,
    } satisfies DSQueryRequest,
    90_000  // deep queries can take up to 90 s
  );
}

/** KAG exact entity lookup via Python sidecar (vector index + text search). */
export async function kagLookupViaSidecar(
  identifier: string,
  entityType: string,
  number?:    string
): Promise<DSKAGResponse> {
  return post<DSKAGResponse>("/kag/lookup", {
    identifier,
    entity_type: entityType,
    number,
  } satisfies DSKAGLookupRequest);
}

/** Trigger bulk background indexing of the legal database. */
export async function triggerIndexing(maxFiles?: number): Promise<{ message: string; job_id: string }> {
  return post("/index/batch", { max_files: maxFiles });
}

/** Service health check. */
export async function checkHealth(): Promise<DSHealthResponse> {
  return get<DSHealthResponse>("/health", HEALTH_TIMEOUT_MS);
}

/** Collection statistics (categories, chunk counts, embedding info). */
export async function getStats(): Promise<DSStatsResponse> {
  return get<DSStatsResponse>("/stats");
}

// ── Adapter: Convert DS chunks → KAGResult ───────────────────────────────────

/** Convert DeepSearcher DSChunk objects to KAGResult for unified-search merging */
export function dsChunksToKAGResults(
  chunks:        DSChunk[],
  retrievalMode: KAGResult["retrievalMode"] = "vector_fallback"
): KAGResult[] {
  return chunks.map((chunk) => ({
    documentId:    chunk.id,
    title:         chunk.title || chunk.filepath.split("/").pop()?.replace(/\.html?$/i, "") || "Untitled",
    category:      chunk.category,
    subcategory:   chunk.subcategory,
    date:          chunk.date,
    relevantText:  chunk.text,
    summary:       chunk.text.slice(0, 300),
    score:         Math.round(chunk.score * 100),
    relativePath:  chunk.filepath,
    retrievalMode,
    hopDepth:      0,
    reasoningChain: [`Vector search: ${retrievalMode}`],
  }));
}
