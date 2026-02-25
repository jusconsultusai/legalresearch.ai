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
};

interface FileEntry {
  id: string;
  title: string;
  number: string;
  year: string;
  date: string; // full date string (e.g. "August 8, 1901") or just year
  filename: string;
  relativePath: string; // relative to LEGAL_DB_ROOT
  excerpt?: string;
  relevantText?: string; // search query that matched — used by UI for highlighting
}

/**
 * Read only the first 600 bytes of an HTML file and extract the
 * jusconsultus:title meta tag value.  Falls back to null if not found.
 */
async function extractMetaTitle(fileAbs: string): Promise<string | null> {
  try {
    const handle = await fs.open(fileAbs, "r");
    const buf = Buffer.alloc(600);
    const { bytesRead } = await handle.read(buf, 0, 600, 0);
    await handle.close();
    const chunk = buf.slice(0, bytesRead).toString("utf8");
    // Handle both attribute orders: name first or content first
    const m =
      chunk.match(/<meta[^>]+name=["']jusconsultus:title["'][^>]+content=["']([^"']+)["']/i) ||
      chunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']jusconsultus:title["']/i);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/** Strip HTML tags and return first ~280 characters of visible text */
function extractExcerpt(html: string): string {
  // Remove scripts, styles, head
  let text = html.replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Remove all tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common entities
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 280);
}

/** Derive a human-readable title and number from a filename */
function parseMeta(filename: string): { title: string; number: string; year: string } {
  const name = filename.replace(/\.html?$/i, "");

  // SC Decision: "G.R. No. 12, August 8, 1901"
  if (/^G\.?R\.?\s+No\./i.test(name)) {
    const yearMatch = name.match(/\b(\d{4})\b/);
    const numMatch = name.match(/^(G\.?R\.?\s+No\.\s+[\w-]+)/i);
    return {
      title: name,
      number: numMatch ? numMatch[1].trim() : name,
      year: yearMatch ? yearMatch[1] : "",
    };
  }

  // SC Case Index: "sc_case_index_..." or similar
  // Republic Act: ra_11313_2019
  let m = name.match(/^ra_(.+?)_(\d{4})$/i);
  if (m) return { title: `Republic Act No. ${m[1].replace(/_/g, " ")}`, number: `R.A. No. ${m[1]}`, year: m[2] };

  // Act: act_1_1900
  m = name.match(/^act_(.+?)_(\d{4})$/i);
  if (m) return { title: `Act No. ${m[1].replace(/_/g, " ")}`, number: `Act No. ${m[1]}`, year: m[2] };

  // Batas Pambansa: bp_1_1978
  m = name.match(/^bp_(.+?)_(\d{4})$/i);
  if (m) return { title: `Batas Pambansa Blg. ${m[1].replace(/_/g, " ")}`, number: `B.P. Blg. ${m[1]}`, year: m[2] };

  // Executive Order: eo_1_1901
  m = name.match(/^eo_(.+?)_(\d{4})$/i);
  if (m) return { title: `Executive Order No. ${m[1].replace(/_/g, " ")}`, number: `E.O. No. ${m[1]}`, year: m[2] };

  // Administrative Order: ao_1_2000
  m = name.match(/^ao_(.+?)_(\d{4})$/i);
  if (m) return { title: `Administrative Order No. ${m[1].replace(/_/g, " ")}`, number: `A.O. No. ${m[1]}`, year: m[2] };

  // Memorandum Order: mo_1_2000
  m = name.match(/^mo_(.+?)_(\d{4})$/i);
  if (m) return { title: `Memorandum Order No. ${m[1].replace(/_/g, " ")}`, number: `M.O. No. ${m[1]}`, year: m[2] };

  // Memorandum Circular: mc_1_2000 or jmc_1_1986
  m = name.match(/^(?:j)?mc_(.+?)_(\d{4})$/i);
  if (m) return { title: `Memorandum Circular No. ${m[1].replace(/_/g, " ")}`, number: `M.C. No. ${m[1]}`, year: m[2] };

  // General Order: go_1_2001
  m = name.match(/^go_(.+?)_(\d{4})$/i);
  if (m) return { title: `General Order No. ${m[1].replace(/_/g, " ")}`, number: `G.O. No. ${m[1]}`, year: m[2] };

  // Presidential Decree: pd_1_1972
  m = name.match(/^pd_(.+?)_(\d{4})$/i);
  if (m) return { title: `Presidential Decree No. ${m[1].replace(/_/g, " ")}`, number: `P.D. No. ${m[1]}`, year: m[2] };

  // Presidential Proclamation: proc_1_1909
  m = name.match(/^proc_(.+?)_(\d{4})$/i);
  if (m) return { title: `Presidential Proclamation No. ${m[1].replace(/_/g, " ")}`, number: `Proc. No. ${m[1]}`, year: m[2] };

  // Letter of Instruction: loi_1_1970
  m = name.match(/^loi_(.+?)_(\d{4})$/i);
  if (m) return { title: `Letter of Instruction No. ${m[1].replace(/_/g, " ")}`, number: `L.O.I. No. ${m[1]}`, year: m[2] };

  // Letter of Implementation: loi_impl or li_1
  m = name.match(/^li?_(.+?)_(\d{4})$/i);
  if (m) return { title: `Letter of Implementation No. ${m[1].replace(/_/g, " ")}`, number: `L.I. No. ${m[1]}`, year: m[2] };

  // IRR: irr_11313_2019
  m = name.match(/^irr_(.+?)_(\d{4})$/i);
  if (m) return { title: `Implementing Rules and Regulations of R.A. ${m[1].replace(/_/g, " ")}`, number: `IRR R.A. ${m[1]}`, year: m[2] };

  // Department Order: do_29_07_2007
  m = name.match(/^do_(.+?)_(\d{4})$/i);
  if (m) return { title: `Department Order No. ${m[1].replace(/_/g, "-")}`, number: `D.O. No. ${m[1]}`, year: m[2] };

  // NAR: nar_vol_year or just numeric/slug
  m = name.match(/^nar_(.+)$/i);
  if (m) {
    const yearM = m[1].match(/(\d{4})/);
    return { title: `National Administrative Register — ${m[1].replace(/_/g, " ")}`, number: `NAR`, year: yearM ? yearM[1] : "" };
  }

  // Numeric-only filename (treaties, references)
  if (/^\d+$/.test(name)) {
    return { title: name, number: name, year: "" };
  }

  // Month-based case index: April_2021, January_June_2014, December_2023-1
  m = name.match(/^([A-Za-z]+(?:_[A-Za-z]+)*)_([0-9]{4})(?:-[0-9]+)?$/);
  if (m) {
    const monthPart = m[1].replace(/_/g, "\u2013"); // en-dash between month names
    return { title: `${monthPart} ${m[2]}`, number: "", year: m[2] };
  }

  // Fallback: humanize
  const yearMatch = name.match(/[_-]?(\d{4})(?:[_-]\d+)?$/);
  const humanized = name
    .replace(/[_-]?\d{4}(?:[_-]\d+)?$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: humanized.trim() || name, number: "", year: yearMatch ? yearMatch[1] : "" };
}

/** Collect all html filenames from a directory, with optional year subfolder filter (for SC decisions) */
async function collectFiles(folderAbs: string, yearFilter?: string): Promise<{ filename: string; yearFolder?: string }[]> {
  let entries;
  try {
    entries = await fs.readdir(folderAbs, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: { filename: string; yearFolder?: string }[] = [];

  // Check if this folder has year subfolders (SC decisions pattern)
  const hasYearSubfolders = entries.some((e) => e.isDirectory() && /^\d{4}$/.test(e.name));

  if (hasYearSubfolders) {
    const yearDirs = yearFilter
      ? entries.filter((e) => e.isDirectory() && e.name === yearFilter)
      : entries.filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name));

    for (const yearDir of yearDirs) {
      try {
        const yearEntries = await fs.readdir(path.join(folderAbs, yearDir.name));
        for (const f of yearEntries) {
          if (/\.html?$/i.test(f)) {
            results.push({ filename: f, yearFolder: yearDir.name });
          }
        }
      } catch {
        // skip
      }
    }
  } else {
    for (const e of entries) {
      if (e.isFile() && /\.html?$/i.test(e.name)) {
        results.push({ filename: e.name });
      }
    }
  }

  return results;
}

/** Get available years list for a subcategory (for year filter dropdown) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const subcategory = searchParams.get("subcategory") || "";
  const search = searchParams.get("search") || "";
  const year = searchParams.get("year") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const sortBy = searchParams.get("sortBy") || "title";
  const sortOrder = searchParams.get("sortOrder") || "asc";
  const yearsOnly = searchParams.get("yearsOnly") === "true";

  const relFolder = FOLDER_MAP[category]?.[subcategory];
  if (!relFolder) {
    return NextResponse.json({ files: [], pagination: { page: 1, limit, total: 0, totalPages: 0 }, years: [] });
  }

  const folderAbs = path.join(LEGAL_DB_ROOT, relFolder);

  // Years-only mode: return list of available years
  if (yearsOnly) {
    let entries;
    try {
      entries = await fs.readdir(folderAbs, { withFileTypes: true });
    } catch {
      return NextResponse.json({ years: [] });
    }
    // Try year subdirectories first (e.g. SC Decisions: 1901/, 1902/, ...)
    const yearDirNames = entries
      .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map((e) => e.name);
    if (yearDirNames.length > 0) {
      const years = yearDirNames.sort((a, b) => parseInt(b) - parseInt(a));
      return NextResponse.json({ years });
    }
    // Flat folder: extract unique years from filenames
    const yearSet = new Set<string>();
    for (const e of entries) {
      if (!e.isFile() || !/\.html?$/i.test(e.name)) continue;
      const m = e.name.match(/(\d{4})/);
      if (m) yearSet.add(m[1]);
    }
    const years = Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    return NextResponse.json({ years });
  }

  // Collect all file entries
  const raw = await collectFiles(folderAbs, year !== "all" ? year : undefined);

  // Build enriched entries
  let files: FileEntry[] = raw.map(({ filename, yearFolder }) => {
    const { title, number, year: derivedYear } = parseMeta(filename);
    const yearStr = yearFolder || derivedYear;
    const relPath = yearFolder
      ? `${relFolder}/${yearFolder}/${filename}`
      : `${relFolder}/${filename}`;
    // Extract full date from filename where available (e.g. "G.R. No. 12, August 8, 1901.html")
    const nameNoExt = filename.replace(/\.html?$/i, "");
    const fullDateMatch = nameNoExt.match(/([A-Za-z]+ \d{1,2},\s*\d{4})/);
    const date = fullDateMatch ? fullDateMatch[1] : yearStr;
    return {
      id: Buffer.from(relPath).toString("base64url"),
      title,
      number,
      year: yearStr,
      date,
      filename,
      relativePath: relPath,
    };
  });

  // Apply search — also store query as relevantText so UI can highlight it in the document viewer
  if (search) {
    const q = search.toLowerCase();
    files = files.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.number.toLowerCase().includes(q) ||
        f.year.includes(q)
    );
    files = files.map((f) => ({ ...f, relevantText: search }));
  }

  // Apply year filter for flat collections (year-subdir collections already filtered via collectFiles)
  if (year !== "all") {
    files = files.filter((f) => f.year === year);
  }

  // Sort
  files.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date" || sortBy === "year") {
      cmp = (a.year || "0").localeCompare(b.year || "0");
    } else {
      cmp = a.title.localeCompare(b.title, undefined, { numeric: true });
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const total = files.length;
  const totalPages = Math.ceil(total / limit);
  const sliced = files.slice((page - 1) * limit, page * limit);

  // Enrich titles from each file's jusconsultus:title meta tag (only for the current page)
  const enriched = await Promise.all(
    sliced.map(async (entry) => {
      const fileAbs = path.join(LEGAL_DB_ROOT, entry.relativePath);
      const metaTitle = await extractMetaTitle(fileAbs);
      return metaTitle ? { ...entry, title: metaTitle } : entry;
    })
  );

  return NextResponse.json({
    files: enriched,
    pagination: { page, limit, total, totalPages },
  });
}
