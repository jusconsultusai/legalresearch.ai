import { promises as fs } from "fs";
import path from "path";
import type { RAGContext, RAGResult } from "./rag";

const LEGAL_DB_ROOT = path.join(process.cwd(), "data", "legal-database");

/** All subcategory folder mappings — mirrors the legal-files API FOLDER_MAP */
const ALL_FOLDERS: { category: string; subcategory: string; folder: string }[] = [
  // Supreme Court
  { category: "supreme_court", subcategory: "decisions", folder: "Supreme Court/Decisions & Signed Resolutions" },
  { category: "supreme_court", subcategory: "case_index", folder: "Supreme Court/SC Case Index" },
  // Laws
  { category: "laws", subcategory: "acts", folder: "Laws/Acts" },
  { category: "laws", subcategory: "batas_pambansa", folder: "Laws/Batas Pambansa" },
  { category: "laws", subcategory: "commonwealth_act", folder: "Laws/Commonwealth Acts" },
  { category: "laws", subcategory: "constitutions", folder: "Laws/Philippine Constitutions" },
  { category: "laws", subcategory: "general_order", folder: "Executive Issuances/General Orders" },
  { category: "laws", subcategory: "letter_of_implementation", folder: "Laws/Letter of Implementation" },
  { category: "laws", subcategory: "letter_of_instruction", folder: "Laws/Letter of Instruction" },
  { category: "laws", subcategory: "presidential_decree", folder: "Laws/Presidential Decree" },
  { category: "laws", subcategory: "republic_acts", folder: "Laws/Republic Acts" },
  { category: "laws", subcategory: "rules_of_court", folder: "Laws/Rules of Court" },
  // Executive Issuances
  { category: "executive_issuances", subcategory: "administrative_orders", folder: "Executive Issuances/Administrative Orders" },
  { category: "executive_issuances", subcategory: "executive_orders", folder: "Executive Issuances/Executive Orders" },
  { category: "executive_issuances", subcategory: "memorandum_circulars", folder: "Executive Issuances/Memorandum Circulars" },
  { category: "executive_issuances", subcategory: "memorandum_orders", folder: "Executive Issuances/Memorandum Orders" },
  { category: "executive_issuances", subcategory: "national_admin_register", folder: "Executive Issuances/National Administrative Register" },
  { category: "executive_issuances", subcategory: "presidential_proclamations", folder: "Executive Issuances/Presidential Proclamations" },
  // References
  { category: "references", subcategory: "concon_1934", folder: "References/1934-35 ConCon" },
  { category: "references", subcategory: "concom_1986", folder: "References/1986 ConCom" },
  { category: "references", subcategory: "draft_constitution_1986", folder: "References/1986 Draft Constitution" },
  { category: "references", subcategory: "sc_issuances_collation", folder: "References/Collation and Codification of SC Issuances" },
  { category: "references", subcategory: "judicial_forms", folder: "References/Revised Book of Judicial Forms" },
  { category: "references", subcategory: "sc_stylebook", folder: "References/Supreme Court Stylebook First Edition" },
  { category: "references", subcategory: "benchbooks", folder: "References/Benchbooks" },
  { category: "references", subcategory: "election_cases", folder: "References/Election Cases" },
  { category: "references", subcategory: "decision_writing", folder: "References/Fundamentals of Decision Writing" },
  { category: "references", subcategory: "judicial_writing", folder: "References/Manual of Judicial Writing" },
  { category: "references", subcategory: "clerks_manual", folder: "References/Manuals of Clerks of Court" },
  { category: "references", subcategory: "official_gazette", folder: "References/Official Gazette" },
  // Treaties
  { category: "treaties", subcategory: "bilateral", folder: "Treaties/Bilateral" },
  { category: "treaties", subcategory: "regional", folder: "Treaties/Regional ~ Multilateral" },
  // International Laws (flat)
  { category: "international_laws", subcategory: "international", folder: "International Laws" },
];

/** Category ↔ source type mapping for user-facing filters */
const SOURCE_CATEGORY_MAP: Record<string, string[]> = {
  law: ["laws"],
  jurisprudence: ["supreme_court"],
  issuance: ["executive_issuances"],
  reference: ["references"],
  treaty: ["treaties"],
  international: ["international_laws"],
};

/** Strip HTML, scripts, styles → plain text */
function htmlToText(html: string): string {
  let text = html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

/** Derive title/number from filename — same logic as legal-files API */
function parseMeta(filename: string): { title: string; number: string; year: string } {
  const name = filename.replace(/\.html?$/i, "");

  if (/^G\.?R\.?\s+No\./i.test(name)) {
    const yearMatch = name.match(/\b(\d{4})\b/);
    const numMatch = name.match(/^(G\.?R\.?\s+No\.\s+[\w-]+)/i);
    return { title: name, number: numMatch ? numMatch[1].trim() : name, year: yearMatch ? yearMatch[1] : "" };
  }

  let m = name.match(/^ra_(.+?)_(\d{4})$/i);
  if (m) return { title: `Republic Act No. ${m[1].replace(/_/g, " ")}`, number: `R.A. No. ${m[1]}`, year: m[2] };

  m = name.match(/^act_(.+?)_(\d{4})$/i);
  if (m) return { title: `Act No. ${m[1].replace(/_/g, " ")}`, number: `Act No. ${m[1]}`, year: m[2] };

  m = name.match(/^bp_(.+?)_(\d{4})$/i);
  if (m) return { title: `Batas Pambansa Blg. ${m[1]}`, number: `B.P. Blg. ${m[1]}`, year: m[2] };

  m = name.match(/^eo_(.+?)_(\d{4})$/i);
  if (m) return { title: `Executive Order No. ${m[1]}`, number: `E.O. No. ${m[1]}`, year: m[2] };

  m = name.match(/^ao_(.+?)_(\d{4})$/i);
  if (m) return { title: `Administrative Order No. ${m[1]}`, number: `A.O. No. ${m[1]}`, year: m[2] };

  m = name.match(/^pd_(.+?)_(\d{4})$/i);
  if (m) return { title: `Presidential Decree No. ${m[1]}`, number: `P.D. No. ${m[1]}`, year: m[2] };

  m = name.match(/^go_(.+?)_(\d{4})$/i);
  if (m) return { title: `General Order No. ${m[1]}`, number: `G.O. No. ${m[1]}`, year: m[2] };

  m = name.match(/^proc_(.+?)_(\d{4})$/i);
  if (m) return { title: `Presidential Proclamation No. ${m[1]}`, number: `Proc. No. ${m[1]}`, year: m[2] };

  const yearMatch = name.match(/[_-]?(\d{4})(?:[_-]\d+)?$/);
  const humanized = name
    .replace(/[_-]?\d{4}(?:[_-]\d+)?$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: humanized.trim() || name, number: "", year: yearMatch ? yearMatch[1] : "" };
}

/** Recursively list HTML files in a directory (handles year sub-folders) */
async function listHtmlFiles(folderAbs: string): Promise<{ filename: string; absPath: string; yearFolder?: string }[]> {
  let entries;
  try {
    entries = await fs.readdir(folderAbs, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: { filename: string; absPath: string; yearFolder?: string }[] = [];
  const yearDirs = entries.filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name));

  if (yearDirs.length > 0) {
    for (const dir of yearDirs) {
      try {
        const yearPath = path.join(folderAbs, dir.name);
        const files = await fs.readdir(yearPath);
        for (const f of files) {
          if (/\.html?$/i.test(f)) {
            results.push({ filename: f, absPath: path.join(yearPath, f), yearFolder: dir.name });
          }
        }
      } catch { /* skip */ }
    }
  } else {
    for (const e of entries) {
      if (e.isFile() && /\.html?$/i.test(e.name)) {
        results.push({ filename: e.name, absPath: path.join(folderAbs, e.name) });
      }
    }
  }
  return results;
}

/** Score a document's text against search keywords. Returns 0 if no match. */
function scoreDocument(text: string, titleLower: string, numberLower: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  let score = 0;
  const textLower = text.toLowerCase();

  for (const kw of keywords) {
    // Title match is worth the most
    if (titleLower.includes(kw)) score += 5;
    // Number match (e.g. "11058")
    if (numberLower.includes(kw)) score += 4;
    // Body text match — count occurrences (capped)
    const bodyHits = (textLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    score += Math.min(bodyHits, 10);
  }
  return score;
}

export interface FileSystemRAGOptions {
  /** Source filters: "law", "jurisprudence", "issuance", etc. */
  sourceFilters?: string[];
  /** Max results to return */
  limit?: number;
}

/**
 * Search the entire filesystem legal database for documents matching the query.
 * Reads and scores actual HTML file contents for RAG context.
 */
export async function searchFilesystemLegalDB(
  query: string,
  options: FileSystemRAGOptions = {}
): Promise<RAGContext> {
  const { sourceFilters, limit = 8 } = options;

  // Decide which category folders to search
  let foldersToSearch = ALL_FOLDERS;
  if (sourceFilters && sourceFilters.length > 0) {
    const allowedCategories = new Set<string>();
    for (const sf of sourceFilters) {
      const cats = SOURCE_CATEGORY_MAP[sf.trim()];
      if (cats) cats.forEach((c) => allowedCategories.add(c));
    }
    if (allowedCategories.size > 0) {
      foldersToSearch = ALL_FOLDERS.filter((f) => allowedCategories.has(f.category));
    }
  }

  // Extract keywords from query
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
    "and", "or", "but", "not", "it", "its", "this", "that", "what", "which",
    "who", "whom", "how", "when", "where", "why", "can", "may", "shall",
    "will", "do", "does", "did", "has", "have", "had", "about", "under",
  ]);
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) {
    return { query, results: [], totalResults: 0 };
  }

  // Search across all folders in parallel
  const allCandidates: (RAGResult & { _sortScore: number })[] = [];

  await Promise.all(
    foldersToSearch.map(async ({ category, subcategory, folder }) => {
      const folderAbs = path.join(LEGAL_DB_ROOT, folder);
      const files = await listHtmlFiles(folderAbs);

      // First pass: quick filter on filename
      const candidates = files.filter(({ filename }) => {
        const fl = filename.toLowerCase();
        return keywords.some((kw) => fl.includes(kw));
      });

      // Also include files whose names don't match but we need to check content
      // (limit random content scans to prevent excessive reads)
      const nonMatching = files.filter((f) => !candidates.includes(f)).slice(0, 50);
      const toScan = [...candidates, ...nonMatching];

      for (const { filename, absPath, yearFolder } of toScan) {
        try {
          const html = await fs.readFile(absPath, "utf-8");
          const text = htmlToText(html);
          const meta = parseMeta(filename);
          const yearStr = yearFolder || meta.year;

          const score = scoreDocument(
            text,
            meta.title.toLowerCase(),
            meta.number.toLowerCase(),
            keywords
          );

          if (score > 0) {
            // Extract a relevant snippet (~600 chars around first keyword hit)
            let snippet = "";
            const textLower = text.toLowerCase();
            for (const kw of keywords) {
              const idx = textLower.indexOf(kw);
              if (idx >= 0) {
                const start = Math.max(0, idx - 200);
                const end = Math.min(text.length, idx + 400);
                snippet = text.slice(start, end);
                break;
              }
            }

            const relPath = path.relative(LEGAL_DB_ROOT, absPath).replace(/\\/g, "/");

            allCandidates.push({
              documentId: Buffer.from(relPath).toString("base64url"),
              title: meta.title,
              category,
              subcategory,
              number: meta.number || undefined,
              date: yearStr || undefined,
              summary: snippet.slice(0, 350),
              relevantText: snippet,
              score,
              relativePath: relPath,
              _sortScore: score,
            });
          }
        } catch { /* skip unreadable files */ }
      }
    })
  );

  // Sort by score descending
  allCandidates.sort((a, b) => b._sortScore - a._sortScore);

  // Take top results and remove internal sort field
  const results: RAGResult[] = allCandidates.slice(0, limit).map(({ _sortScore, ...rest }) => rest);

  return {
    query,
    results,
    totalResults: results.length,
  };
}

/**
 * Build a RAG system prompt that includes filesystem search results.
 * Produces structured legal analysis with proper citations.
 */
export function buildFilesystemRAGPrompt(
  ragContext: RAGContext,
  mode: string = "standard_v2"
): string {
  const sourcesText = ragContext.results
    .map((r, i) => {
      let source = `[SOURCE ${i + 1}] ${r.title}`;
      if (r.number) source += ` (${r.number})`;
      if (r.date) source += ` — ${r.date}`;
      source += `\nCategory: ${r.category}/${r.subcategory}`;
      if (r.relevantText) source += `\nExcerpt:\n${r.relevantText}`;
      return source;
    })
    .join("\n\n---\n\n");

  const modeInstructions: Record<string, string> = {
    standard_v2:
      "Provide a comprehensive, well-structured legal analysis. Include relevant citations for each claim. Use formal Philippine legal writing style with clear structure.",
    standard:
      "Provide a balanced legal analysis with citations.",
    concise:
      "Be extremely concise. Provide only the key legal points, citations, and conclusions in bullet form.",
    professional:
      "Provide detailed legal analysis suitable for a practising lawyer. Include risk assessment, practical implications, strategic considerations, and cite specific provisions and case holdings.",
    educational:
      "Explain legal concepts for law students. Define legal terms, explain reasoning, and include learning points with examples.",
    simple_english:
      "Explain in simple, everyday language. Avoid legal jargon. Use analogies and examples that a non-lawyer would easily understand.",
  };

  return `You are JusConsultus AI, an expert Philippine legal research assistant.

${modeInstructions[mode] || modeInstructions.standard_v2}

MANDATORY RULES:
1. Base your answer ONLY on the provided sources. Do NOT invent cases, laws, or G.R. numbers.
2. Always cite specific case names, G.R. numbers, Republic Act numbers, and dates when available.
3. For Supreme Court decisions, provide:
   - Case title and G.R. Number
   - Date of decision
   - Key doctrine and ruling
   - Case Digest: Facts → Issue → Ruling → Ratio Decidendi
4. For laws and statutes, provide:
   - Full title and number
   - Date of approval
   - Summarized key provisions
   - Important sections
5. Structure your response with:
   - **Bottom Line:** (1-2 sentence direct answer)
   - **Detailed Analysis** with proper headings
   - **Sources Referenced** listing sources at the end
6. Clearly state when your information may be incomplete or when the user should consult a lawyer.
7. NEVER fabricate citations or case numbers. If no source covers the question, say so.

CITATION FORMAT:
When citing a law, wrap it with {{law: FULL TITLE}}, for example: {{law: Republic Act No. 10951 (2017)}}.
When citing a case or jurisprudence, wrap it with {{case: CASE TITLE}}, for example: {{case: People v. Mantalaba, G.R. No. 186227 (2010)}}.
Use > blockquote prefix when directly quoting a legal provision verbatim, for example:
> Section 1. Title of this Act. — This Act shall be known as...

FOLLOW-UP TOPICS:
At the end of your response, include a section titled "## Suggested Follow-Up Topics" with 3 concise topic suggestions that the user may want to explore next. Each suggestion should be a short phrase on its own line prefixed with "- ".

RETRIEVED SOURCES FROM THE PHILIPPINE LEGAL DATABASE:
${sourcesText || "No matching sources were found in the legal database for this query. Provide general guidance based on well-known Philippine legal principles, but clearly state that no specific source was located."}

Provide your legal analysis based on the above sources.`;
}
