"""
JusConsultus DeepSearcher + ChromaDB sidecar service.

Exposes a FastAPI REST interface consumed by the Next.js app:
  POST /search           — vector similarity search
  POST /query            — full agentic DeepSearcher pipeline
  POST /kag/lookup       — exact entity / law-number lookup
  POST /index/batch      — bulk-index HTML legal documents
  GET  /health           — liveness check
  GET  /stats            — collection statistics

Depends on:
  pip install chromadb fastapi uvicorn beautifulsoup4
"""

import os, re, json, time, hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bs4 import BeautifulSoup
import chromadb

# ─── Config ────────────────────────────────────────────────────────────────────
CHROMA_DB_PATH = str(Path(__file__).parent / "chroma_db")
COLLECTION     = "legal_documents"
EMBED_DIM      = 768            # will be overridden by model dim
LEGAL_DB_ROOT  = str(Path(__file__).parent.parent.parent / "data" / "legal-database")

LLM_API_KEY    = os.environ.get("LLM_API_KEY", "")
LLM_BASE_URL   = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
LLM_MODEL      = os.environ.get("LLM_MODEL", "deepseek-chat")

# ChromaDB persistent client
_chroma_client: Optional[chromadb.PersistentClient] = None
_collection = None

# ─── Embedding ─────────────────────────────────────────────────────────────────
def _build_embedding_fn():
    """Return a callable(texts) -> List[List[float]] using pymilvus model."""
    try:
        from pymilvus.model.hybrid import BGEM3EmbeddingFunction
        ef = BGEM3EmbeddingFunction(model_name="BAAI/bge-m3", use_fp16=False, device="cpu")
        print("[DeepSearcher] Using BAAI/bge-m3 embeddings (dim=1024)")
        return ef, 1024
    except Exception as e:
        print(f"[DeepSearcher] BGE-M3 unavailable ({e}), falling back to bge-small")
    try:
        from pymilvus.model.dense import SentenceTransformerEmbeddingFunction
        ef = SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-small-en-v1.5", device="cpu")
        print("[DeepSearcher] Using bge-small-en-v1.5 embeddings (dim=384)")
        return ef, 384
    except Exception as e2:
        print(f"[DeepSearcher] SentenceTransformer unavailable ({e2}), using fallback TF-IDF embed")
        return None, 256

_embed_fn, _embed_dim = _build_embedding_fn()

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts → list of float vectors."""
    if _embed_fn is None:
        # Fallback: deterministic TF-IDF style 256-dim vector
        import math
        results = []
        for text in texts:
            words = re.findall(r'\w+', text.lower())
            freq: Dict[str, int] = {}
            for w in words:
                freq[w] = freq.get(w, 0) + 1
            vec = [0.0] * 256
            for w, cnt in freq.items():
                h = int(hashlib.md5(w.encode()).hexdigest(), 16) % 256
                vec[h] += cnt * math.log(1 + len(words))
            norm = math.sqrt(sum(v*v for v in vec)) or 1.0
            results.append([v/norm for v in vec])
        return results

    # Use real embedding function
    if hasattr(_embed_fn, 'encode_documents'):
        out = _embed_fn.encode_documents(texts)
        # BGEM3 returns dict with 'dense' key
        if isinstance(out, dict):
            return [v.tolist() if hasattr(v, 'tolist') else list(v) for v in out.get('dense', out.get('embeddings', []))]
        return [v.tolist() if hasattr(v, 'tolist') else list(v) for v in out]
    else:
        out = _embed_fn(texts)
        return [v.tolist() if hasattr(v, 'tolist') else list(v) for v in out]

# ─── ChromaDB helpers ─────────────────────────────────────────────────────────
def get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection

def ensure_collection(dim: int = None):
    """Ensure the ChromaDB collection exists."""
    get_collection()
    print(f"[DeepSearcher] ChromaDB collection '{COLLECTION}' ready at {CHROMA_DB_PATH}")

# ─── Text helpers ──────────────────────────────────────────────────────────────
def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "head"]):
        tag.decompose()
    return re.sub(r'\s+', ' ', soup.get_text(separator=' ')).strip()

def chunk_text(text: str, size: int = 600, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = ' '.join(words[i:i+size])
        chunks.append(chunk)
        i += size - overlap
    return chunks or [text[:1200]]

_NUMBER_PATTERNS = [
    (r'\bG\.?R\.?\s*No\.?\s*[\d,\s-]+', 'gr'),
    (r'\bR\.?A\.?\s*(?:No\.?\s*)?\d[\d,\s]*', 'ra'),
    (r'\bRepublic Act\s+(?:No\.?\s*)?\d[\d,\s]*', 'ra'),
    (r'\bAct\s+No\.?\s*\d[\d,\s]*', 'act'),
    (r'\bB\.?P\.?\s*(?:Blg\.?\s*)?\d[\d,\s]*', 'bp'),
    (r'\bE\.?O\.?\s*(?:No\.?\s*)?\d[\d,\s]*', 'eo'),
    (r'\bP\.?D\.?\s*(?:No\.?\s*)?\d[\d,\s]*', 'pd'),
    (r'\bA\.?O\.?\s*(?:No\.?\s*)?\d[\d,\s]*', 'ao'),
]

def parse_meta(filename: str) -> Dict[str, str]:
    name = re.sub(r'\.html?$', '', filename, flags=re.I)
    for pattern, kind in _NUMBER_PATTERNS:
        m = re.search(pattern, name, re.I)
        if m:
            year_m = re.search(r'\b(19|20)\d{2}\b', name)
            return {"title": name, "number": m.group(0).strip(), "year": year_m.group(0) if year_m else ""}
    year_m = re.search(r'\b(19|20)\d{2}\b', name)
    humanized = re.sub(r'[_-]\d{4}.*', '', name).replace('_', ' ').replace('-', ' ').title()
    return {"title": humanized.strip() or name, "number": "", "year": year_m.group(0) if year_m else ""}

# ─── Indexing ──────────────────────────────────────────────────────────────────
def index_html_file(abs_path: str, relative_path: str, category: str, subcategory: str) -> int:
    """Index a single HTML file into Milvus. Returns number of chunks inserted."""
    try:
        try:
            with open(abs_path, 'r', encoding='utf-8') as f:
                html = f.read()
        except UnicodeDecodeError:
            with open(abs_path, 'r', encoding='latin-1') as f:
                html = f.read()
    except Exception:
        return 0

    text  = html_to_text(html)
    meta  = parse_meta(Path(abs_path).name)
    chunks = chunk_text(text)
    doc_id = hashlib.sha256(relative_path.encode()).hexdigest()[:32]

    chunks = [c[:3900] for c in chunks]

    col = get_collection()

    # Check if already indexed (first chunk's doc_id exists)
    existing = col.get(ids=[f"{doc_id}_0"], include=[])
    if existing and existing.get("ids"):
        return 0  # already indexed

    # Embed all chunks
    embeddings = embed_texts(chunks)

    ids, embs, docs, metas = [], [], [], []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        ids.append(f"{doc_id}_{i}")
        embs.append(emb)
        docs.append(chunk)
        metas.append({
            "doc_id":        f"{doc_id}_{i}",
            "title":         meta["title"][:500],
            "category":      category,
            "subcategory":   subcategory,
            "number":        meta["number"][:255],
            "year":          meta["year"][:15],
            "relative_path": relative_path[:500],
        })

    col.add(ids=ids, embeddings=embs, documents=docs, metadatas=metas)
    return len(ids)

# ─── Search ────────────────────────────────────────────────────────────────────
def vector_search(query: str, top_k: int = 10, category_filter: Optional[str] = None) -> List[Dict]:
    col = get_collection()
    if col.count() == 0:
        return []

    q_emb = embed_texts([query])[0]
    where = {"category": {"$eq": category_filter}} if category_filter else None

    kwargs: Dict[str, Any] = {
        "query_embeddings": [q_emb],
        "n_results": min(top_k * 2, max(col.count(), 1)),
        "include": ["metadatas", "documents", "distances"],
    }
    if where:
        kwargs["where"] = where

    results = col.query(**kwargs)

    # Deduplicate by relative_path, keep best score
    seen: Dict[str, Dict] = {}
    metadatas = results.get("metadatas", [[]])[0]
    documents = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for meta, doc, dist in zip(metadatas, documents, distances):
        path = meta.get("relative_path", "")
        # ChromaDB cosine distance: 0=identical, 2=opposite → convert to 0-100 score
        score = round((1.0 - float(dist)) * 100, 2)
        if path not in seen or score > seen[path]["score"]:
            seen[path] = {
                "documentId":   meta.get("doc_id", "").split("_")[0],
                "title":        meta.get("title", ""),
                "category":     meta.get("category", ""),
                "subcategory":  meta.get("subcategory", ""),
                "number":       meta.get("number", ""),
                "date":         meta.get("year", ""),
                "relevantText": doc,
                "score":        score,
                "relativePath": path,
            }

    top = sorted(seen.values(), key=lambda x: -x["score"])[:top_k]
    return top

# ─── KAG exact lookup ──────────────────────────────────────────────────────────
def exact_lookup(identifier: str, lookup_type: str = "auto") -> List[Dict]:
    """
    Find documents by exact law/case number.
    lookup_type: 'gr' | 'ra' | 'bp' | 'eo' | 'pd' | 'ao' | 'auto'
    """
    from pathlib import Path
    import os

    if not os.path.isdir(LEGAL_DB_ROOT):
        return []

    norm = identifier.strip().lower()

    matches = []
    for root, dirs, files in os.walk(LEGAL_DB_ROOT):
        # Skip deep year dirs to keep it fast — just top 2 levels
        rel = os.path.relpath(root, LEGAL_DB_ROOT)
        depth = len(Path(rel).parts)
        if depth > 3:
            dirs.clear()
            continue
        for fname in files:
            if not re.search(r'\.html?$', fname, re.I):
                continue
            if norm in fname.lower() or norm.replace(' ', '_') in fname.lower():
                abs_path = os.path.join(root, fname)
                rel_path = os.path.relpath(abs_path, LEGAL_DB_ROOT).replace('\\', '/')
                meta = parse_meta(fname)
                try:
                    with open(abs_path, 'r', encoding='utf-8', errors='replace') as f:
                        text = html_to_text(f.read())[:2000]
                except Exception:
                    text = ""
                matches.append({
                    "documentId":   hashlib.sha256(rel_path.encode()).hexdigest()[:16],
                    "title":        meta["title"],
                    "number":       meta["number"] or identifier,
                    "date":         meta["year"],
                    "relevantText": text,
                    "score":        100.0,
                    "relativePath": rel_path,
                    "category":     "exact_match",
                    "subcategory":  "lookup",
                })
    return matches[:5]

# ─── LLM helper (DeepSearch synthesis) ────────────────────────────────────────
def llm_synthesize(query: str, sources: List[Dict], sub_queries: List[str]) -> str:
    if not LLM_API_KEY:
        return f"[No LLM configured] Retrieved {len(sources)} sources for: {query}"
    import urllib.request, json as _json
    sources_text = "\n\n---\n\n".join(
        f"[{i+1}] {s['title']} ({s.get('number','')})\n{s['relevantText'][:600]}"
        for i, s in enumerate(sources[:8])
    )
    system = (
        "You are JusConsultus AI, an expert Philippine legal research assistant. "
        "Answer based ONLY on the provided sources. Cite law/case numbers. "
        "Format: **Legal Context** (1-2 sentence direct answer to the question) → **Detailed Analysis** → **Sources Referenced**."
    )
    user = (
        f"Legal question: {query}\n\n"
        f"Sub-queries explored: {'; '.join(sub_queries)}\n\n"
        f"Sources:\n{sources_text}\n\n"
        "Provide comprehensive legal analysis with citations."
    )
    payload = _json.dumps({
        "model": LLM_MODEL,
        "messages": [{"role":"system","content":system}, {"role":"user","content":user}],
        "temperature": 0.3, "max_tokens": 2048,
    }).encode()
    req = urllib.request.Request(
        f"{LLM_BASE_URL.rstrip('/')}/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = _json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[LLM error: {e}]"

# ─── Startup ───────────────────────────────────────────────────────────────────
_indexed = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _indexed
    ensure_collection()
    print(f"[DeepSearcher] ChromaDB ready at {CHROMA_DB_PATH}")
    print(f"[DeepSearcher] Legal DB root: {LEGAL_DB_ROOT}")
    yield
    # ChromaDB PersistentClient auto-flushes on exit

app = FastAPI(title="JusConsultus DeepSearcher", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── Request/Response Models ───────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    category_filter: Optional[str] = None
    source_filters: Optional[List[str]] = None

class QueryRequest(BaseModel):
    query: str
    max_iter: int = 3
    source_filters: Optional[List[str]] = None
    deep_think: bool = False
    chat_mode: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None

class KAGLookupRequest(BaseModel):
    identifier: str
    lookup_type: str = "auto"
    context_query: Optional[str] = None

class IndexRequest(BaseModel):
    paths: Optional[List[str]] = None  # explicit paths; None = scan LEGAL_DB_ROOT
    limit: Optional[int] = None        # max files to index per call

# ─── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    try:
        col = get_collection()
        count = col.count()
    except Exception:
        count = -1
    return {"status": "ok", "collection": COLLECTION, "indexed_chunks": count, "embed_dim": _embed_dim}

@app.get("/stats")
def stats():
    try:
        col = get_collection()
        return {"collection": COLLECTION, "row_count": col.count(), "embed_dim": _embed_dim}
    except Exception as e:
        return {"error": str(e)}

@app.post("/search")
def search(req: SearchRequest):
    """Fast vector similarity search — returns top-K semantically similar documents."""
    start = time.time()
    # Map source_filters to category names
    cat_map = {
        "law": "laws", "jurisprudence": "supreme_court",
        "issuance": "executive_issuances", "reference": "references",
        "treaty": "treaties", "international": "international_laws",
    }
    category_filter = None
    if req.source_filters and len(req.source_filters) == 1:
        category_filter = cat_map.get(req.source_filters[0]) or req.category_filter

    results = vector_search(req.query, top_k=req.top_k, category_filter=category_filter)
    return {
        "query": req.query,
        "results": results,
        "total": len(results),
        "elapsed_ms": round((time.time() - start) * 1000),
    }

@app.post("/query")
def query(req: QueryRequest):
    """
    Full DeepSearcher pipeline:
      1. Sub-query decomposition (via LLM)
      2. Multi-pass vector retrieval
      3. Re-ranking
      4. LLM synthesis
    """
    start = time.time()

    # Step 1: Simple query decomposition
    sub_queries = [req.query]
    if len(req.query.split()) > 5 and LLM_API_KEY:
        try:
            import urllib.request, json as _json
            payload = _json.dumps({
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": "Output ONLY a JSON array of 2-4 focused sub-queries for searching a Philippine legal database. No other text."},
                    {"role": "user", "content": f"Decompose this legal question: {req.query}"},
                ],
                "temperature": 0.2, "max_tokens": 300,
            }).encode()
            req2 = urllib.request.Request(
                f"{LLM_BASE_URL.rstrip('/')}/v1/chat/completions",
                data=payload,
                headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req2, timeout=10) as resp:
                data = _json.loads(resp.read())
                raw = data["choices"][0]["message"]["content"]
                m = re.search(r'\[.*?\]', raw, re.S)
                if m:
                    parsed = _json.loads(m.group(0))
                    if isinstance(parsed, list) and len(parsed) > 0:
                        sub_queries = [req.query] + [str(q) for q in parsed[:3]]
        except Exception:
            pass

    # Step 2: Multi-pass retrieval
    cat_map = {
        "law": "laws", "jurisprudence": "supreme_court",
        "issuance": "executive_issuances", "reference": "references",
        "treaty": "treaties", "international": "international_laws",
    }
    cat_filter = None
    if req.source_filters and len(req.source_filters) == 1:
        cat_filter = cat_map.get(req.source_filters[0])

    all_results: Dict[str, Dict] = {}
    for sq in sub_queries:
        for r in vector_search(sq, top_k=8, category_filter=cat_filter):
            path = r["relativePath"]
            if path not in all_results or r["score"] > all_results[path]["score"]:
                all_results[path] = r

    # Step 3: Re-rank by original query relevance
    query_kws = set(re.findall(r'\w+', req.query.lower()))
    for r in all_results.values():
        bonus = sum(1 for kw in query_kws if kw in r.get("relevantText","").lower())
        bonus += sum(2 for kw in query_kws if kw in r.get("title","").lower())
        if r.get("date") and int(r["date"]) >= 2020:
            bonus += 2
        r["score"] = round(r["score"] + bonus, 2)

    ranked = sorted(all_results.values(), key=lambda x: -x["score"])
    top_sources = ranked[:12 if req.deep_think else 8]

    # Step 4: Synthesize
    answer = llm_synthesize(req.query, top_sources, sub_queries)

    return {
        "answer":              answer,
        "sources":             top_sources,
        "sub_queries":         sub_queries,
        "total_sources_scanned": len(all_results),
        "elapsed_ms":          round((time.time() - start) * 1000),
    }

@app.post("/kag/lookup")
def kag_lookup(req: KAGLookupRequest):
    """
    KAG-style exact entity lookup:
    Finds documents by law/case number (e.g. 'RA 9262', 'G.R. No. 12').
    Combines with vector context retrieval if context_query is provided.
    """
    start = time.time()
    exact_results = exact_lookup(req.identifier, req.lookup_type)

    # Optionally enrich with vector context
    vector_results = []
    if req.context_query:
        vector_results = vector_search(req.context_query, top_k=5)

    # Merge: exact matches first, then vector
    seen_paths = {r["relativePath"] for r in exact_results}
    merged = exact_results + [r for r in vector_results if r["relativePath"] not in seen_paths]

    return {
        "identifier":   req.identifier,
        "exact_matches": len(exact_results),
        "results":       merged,
        "elapsed_ms":    round((time.time() - start) * 1000),
    }

@app.post("/index/batch")
def index_batch(req: IndexRequest, background_tasks: BackgroundTasks):
    """
    Index legal HTML files into Milvus Lite.
    If req.paths is None, scans the entire data/legal-database directory.
    Runs incrementally — skips already-indexed documents.
    """
    target_paths = req.paths

    def do_index():
        global _indexed
        import os
        total_indexed = 0
        FOLDER_CATEGORY_MAP = {
            "Supreme Court":         ("supreme_court", "decisions"),
            "Laws":                  ("laws", "republic_acts"),
            "Executive Issuances":   ("executive_issuances", "executive_orders"),
            "References":            ("references", "general"),
            "Treaties":              ("treaties", "bilateral"),
            "International Laws":    ("international_laws", "international"),
        }

        if target_paths:
            file_list = [(p, "general", "general") for p in target_paths if p.endswith(('.html','.htm'))]
        else:
            file_list = []
            if not os.path.isdir(LEGAL_DB_ROOT):
                print(f"[DeepSearcher] LEGAL_DB_ROOT not found: {LEGAL_DB_ROOT}")
                return
            for top_dir in os.listdir(LEGAL_DB_ROOT):
                top_abs = os.path.join(LEGAL_DB_ROOT, top_dir)
                if not os.path.isdir(top_abs):
                    continue
                category, subcategory = FOLDER_CATEGORY_MAP.get(top_dir, ("general", "general"))
                # Walk subdirectories
                for root, dirs, files in os.walk(top_abs):
                    for fname in files:
                        if re.search(r'\.html?$', fname, re.I):
                            abs_path = os.path.join(root, fname)
                            rel_path = os.path.relpath(abs_path, LEGAL_DB_ROOT).replace('\\', '/')
                            # Try to get better subcategory from sub-folder
                            sub_folder = os.path.basename(root)
                            sub = sub_folder.lower().replace(' ', '_').replace('/', '_') if sub_folder != top_dir else subcategory
                            file_list.append((abs_path, category, sub))

        limit = req.limit or len(file_list)
        for abs_path, category, subcategory in file_list[:limit]:
            rel_path = os.path.relpath(abs_path, LEGAL_DB_ROOT).replace('\\', '/') if abs_path.startswith(LEGAL_DB_ROOT) else abs_path
            n = index_html_file(abs_path, rel_path, category, subcategory)
            total_indexed += n
            if total_indexed % 500 == 0 and total_indexed > 0:
                print(f"[DeepSearcher] Indexed {total_indexed} chunks so far...")

        _indexed = True
        print(f"[DeepSearcher] Indexing complete. Total chunks inserted: {total_indexed}")

    background_tasks.add_task(do_index)
    return {"message": "Indexing started in background", "legal_db_root": LEGAL_DB_ROOT}

# ─── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("DEEPSEARCHER_PORT", 8010))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
