import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LEGAL_DB_ROOT = path.join(process.cwd(), "data", "legal-database");

/** Maps category+subcategory to a relative folder path under data/legal-database */
const FOLDER_MAP: Record<string, Record<string, string>> = {
  supreme_court: {
    decisions: "Supreme Court/Decisions & Signed Resolutions",
    case_index: "Supreme Court/SC Case Index",
  },
  laws: {
    acts: "Laws/Acts",
    batas_pambansa: "Laws/Batas Pambansa",
    commonwealth_act: "Laws/Commonwealth Acts",
    constitutions: "Laws/Philippine Constitutions",
    general_order: "Executive Issuances/General Orders",
    letter_of_implementation: "Laws/Letter of Implementation",
    letter_of_instruction: "Laws/Letter of Instruction",
    presidential_decree: "Laws/Presidential Decree",
    republic_acts: "Laws/Republic Acts",
    rules_of_court: "Laws/Rules of Court",
  },
  executive_issuances: {
    administrative_orders: "Executive Issuances/Administrative Orders",
    executive_orders: "Executive Issuances/Executive Orders",
    memorandum_circulars: "Executive Issuances/Memorandum Circulars",
    memorandum_orders: "Executive Issuances/Memorandum Orders",
    national_admin_register: "Executive Issuances/National Administrative Register",
    presidential_proclamations: "Executive Issuances/Presidential Proclamations",
  },
  references: {
    concon_1934: "References/1934-35 ConCon",
    concom_1986: "References/1986 ConCom",
    draft_constitution_1986: "References/1986 Draft Constitution",
    sc_issuances_collation: "References/Collation and Codification of SC Issuances",
    judicial_forms: "References/Revised Book of Judicial Forms",
    sc_stylebook: "References/Supreme Court Stylebook First Edition",
    benchbooks: "References/Benchbooks",
    election_cases: "References/Election Cases",
    decision_writing: "References/Fundamentals of Decision Writing",
    judicial_writing: "References/Manual of Judicial Writing",
    clerks_manual: "References/Manuals of Clerks of Court",
    official_gazette: "References/Official Gazette",
  },
  treaties: {
    bilateral: "Treaties/Bilateral",
    regional: "Treaties/Regional ~ Multilateral",
  },
  international_laws: {
    agreements: "International Laws",
    annexes: "International Laws",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  supreme_court: "Supreme Court",
  laws: "Laws",
  executive_issuances: "Executive Issuances",
  references: "References",
  treaties: "Treaties",
  international_laws: "International Laws",
};

interface SearchResult {
  title: string;
  number: string;
  year: string;
  category: string;
  categoryLabel: string;
  subcategory: string;
  filename: string;
  relativePath: string;
  matchSnippet: string;
  matchType: "title" | "content";
}

async function extractMetaTitle(fileAbs: string): Promise<string | null> {
  try {
    const handle = await fs.open(fileAbs, "r");
    const buf = Buffer.alloc(1200);
    const { bytesRead } = await handle.read(buf, 0, 1200, 0);
    await handle.close();
    const chunk = buf.slice(0, bytesRead).toString("utf8");
    const m =
      chunk.match(/<meta[^>]+name=["']jusconsultus:title["'][^>]+content=["']([^"']+)["']/i) ||
      chunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']jusconsultus:title["']/i);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

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
  if (m) return { title: `Batas Pambansa Blg. ${m[1].replace(/_/g, " ")}`, number: `B.P. Blg. ${m[1]}`, year: m[2] };

  m = name.match(/^eo_(.+?)_(\d{4})$/i);
  if (m) return { title: `Executive Order No. ${m[1].replace(/_/g, " ")}`, number: `E.O. No. ${m[1]}`, year: m[2] };

  m = name.match(/^ao_(.+?)_(\d{4})$/i);
  if (m) return { title: `Administrative Order No. ${m[1].replace(/_/g, " ")}`, number: `A.O. No. ${m[1]}`, year: m[2] };

  m = name.match(/^pd_(.+?)_(\d{4})$/i);
  if (m) return { title: `Presidential Decree No. ${m[1].replace(/_/g, " ")}`, number: `P.D. No. ${m[1]}`, year: m[2] };

  m = name.match(/^proc_(.+?)_(\d{4})$/i);
  if (m) return { title: `Presidential Proclamation No. ${m[1].replace(/_/g, " ")}`, number: `Proc. No. ${m[1]}`, year: m[2] };

  const yearMatch = name.match(/[_-]?(\d{4})(?:[_-]\d+)?$/);
  const humanized = name
    .replace(/[_-]?\d{4}(?:[_-]\d+)?$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: humanized.trim() || name, number: "", year: yearMatch ? yearMatch[1] : "" };
}

/** Search file content for the query and return a snippet */
async function searchFileContent(fileAbs: string, queryLower: string): Promise<string | null> {
  try {
    const content = await fs.readFile(fileAbs, "utf8");
    // Strip HTML tags for text search
    const text = content
      .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    const idx = text.toLowerCase().indexOf(queryLower);
    if (idx === -1) return null;

    // Extract ~200 char snippet around the match
    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + queryLower.length + 120);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet = snippet + "…";
    return snippet;
  } catch {
    return null;
  }
}

/** Collect all HTML files from a directory (handles year subdirectories) */
async function collectAllFiles(folderAbs: string, relFolder: string): Promise<{ filename: string; relativePath: string; yearFolder?: string }[]> {
  let entries;
  try {
    entries = await fs.readdir(folderAbs, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: { filename: string; relativePath: string; yearFolder?: string }[] = [];
  const hasYearSubfolders = entries.some((e) => e.isDirectory() && /^\d{4}$/.test(e.name));

  if (hasYearSubfolders) {
    const yearDirs = entries.filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name));
    for (const yearDir of yearDirs) {
      try {
        const yearEntries = await fs.readdir(path.join(folderAbs, yearDir.name));
        for (const f of yearEntries) {
          if (/\.html?$/i.test(f)) {
            results.push({
              filename: f,
              relativePath: `${relFolder}/${yearDir.name}/${f}`,
              yearFolder: yearDir.name,
            });
          }
        }
      } catch { /* skip */ }
    }
  } else {
    for (const e of entries) {
      if (e.isFile() && /\.html?$/i.test(e.name)) {
        results.push({
          filename: e.name,
          relativePath: `${relFolder}/${e.name}`,
        });
      }
    }
  }

  return results;
}

/**
 * Global search across ALL categories and subcategories in the legal database.
 * Searches both filenames/titles and file content.
 *
 * Query params:
 *   q      — search query (required)
 *   limit  — max results (default 50)
 *   content — "true" to also search file content (slower, default "true")
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const searchContent = searchParams.get("content") !== "false";

  if (!query) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  // Iterate all categories and subcategories
  for (const [category, subcategories] of Object.entries(FOLDER_MAP)) {
    // Deduplicate folders to avoid searching same folder twice
    const processedFolders = new Set<string>();

    for (const [subcategory, relFolder] of Object.entries(subcategories)) {
      if (processedFolders.has(relFolder)) continue;
      processedFolders.add(relFolder);

      const folderAbs = path.join(LEGAL_DB_ROOT, relFolder);
      const files = await collectAllFiles(folderAbs, relFolder);

      for (const file of files) {
        // Early exit if we have enough results
        if (results.length >= limit) break;

        const { title, number, year } = parseMeta(file.filename);
        const yearStr = file.yearFolder || year;

        // Check title/number match first
        const titleMatch =
          title.toLowerCase().includes(queryLower) ||
          number.toLowerCase().includes(queryLower) ||
          file.filename.toLowerCase().includes(queryLower);

        if (titleMatch) {
          const fileAbs = path.join(LEGAL_DB_ROOT, file.relativePath);
          const metaTitle = await extractMetaTitle(fileAbs);
          results.push({
            title: metaTitle || title,
            number,
            year: yearStr,
            category,
            categoryLabel: CATEGORY_LABELS[category] || category,
            subcategory,
            filename: file.filename,
            relativePath: file.relativePath,
            matchSnippet: `Title match: ${metaTitle || title}`,
            matchType: "title",
          });
          continue;
        }

        // Content search (slower, optional)
        if (searchContent) {
          const fileAbs = path.join(LEGAL_DB_ROOT, file.relativePath);
          const snippet = await searchFileContent(fileAbs, queryLower);
          if (snippet) {
            const metaTitle = await extractMetaTitle(fileAbs);
            results.push({
              title: metaTitle || title,
              number,
              year: yearStr,
              category,
              categoryLabel: CATEGORY_LABELS[category] || category,
              subcategory,
              filename: file.filename,
              relativePath: file.relativePath,
              matchSnippet: snippet,
              matchType: "content",
            });
          }
        }
      }

      if (results.length >= limit) break;
    }

    if (results.length >= limit) break;
  }

  // Sort: title matches first, then content matches
  results.sort((a, b) => {
    if (a.matchType !== b.matchType) return a.matchType === "title" ? -1 : 1;
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  });

  return NextResponse.json({ results: results.slice(0, limit), total: results.length, query });
}
