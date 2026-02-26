import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateCompletion } from "@/lib/ai/llm";
import { hybridSearch } from "@/lib/ai/unified-search";
import { AICache } from "@/lib/ai/cache";

/**
 * POST /api/ai/trend-analysis
 *
 * Comprehensive Trend & Pattern Analysis for the user's document library.
 * Analyses document categories, upload timeline, search patterns and cross-references
 * them with the Philippine legal database to surface related laws and jurisprudence.
 *
 * Body: { query?: string }  — optional focus topic
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const focusQuery: string = (body.query || "").trim();

  // Cache key scoped to user so each user sees their own library analysis
  const cacheKey = `trends:${user.id}:${focusQuery.slice(0, 60)}`;
  const cached = await AICache.getRAGContext(focusQuery || "trends", cacheKey);
  if (cached) {
    try {
      return NextResponse.json(JSON.parse(cached));
    } catch { /* proceed with fresh analysis */ }
  }

  // ── 1. Fetch user files (metadata only — no content for speed) ──
  const [userFiles, searchHistory] = await Promise.all([
    prisma.userFile.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true, size: true, category: true, uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.searchHistory.findMany({
      where: { userId: user.id },
      select: { query: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  // ── 2. Build library statistics ──
  const categoryCount: Record<string, number> = {};
  const fileTypeCount: Record<string, number> = {};
  const filesByMonth: Record<string, number> = {};
  let totalSizeBytes = 0;

  for (const f of userFiles) {
    categoryCount[f.category] = (categoryCount[f.category] || 0) + 1;
    const ext = f.name.split(".").pop()?.toLowerCase() || f.type.split("/").pop() || "unknown";
    fileTypeCount[ext] = (fileTypeCount[ext] || 0) + 1;
    const month = f.uploadedAt.toISOString().slice(0, 7); // "YYYY-MM"
    filesByMonth[month] = (filesByMonth[month] || 0) + 1;
    totalSizeBytes += f.size;
  }

  // ── 3. Extract top keywords from filenames ──
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "of", "in", "on", "at", "to", "for",
    "and", "or", "with", "by", "from", "this", "that", "my", "your", "our", "its",
  ]);
  const nameTokens = userFiles
    .map((f) => f.name)
    .join(" ")
    .toLowerCase()
    .split(/[\s_\-.,()[\]/\\]+/)
    .filter((w) => w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w));

  const nameKeywordFreq: Record<string, number> = {};
  for (const w of nameTokens) nameKeywordFreq[w] = (nameKeywordFreq[w] || 0) + 1;
  const topFileKeywords = Object.entries(nameKeywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w, c]) => ({ word: w, count: c }));

  // ── 4. Extract top search topics from history ──
  const queryTokens = searchHistory
    .map((h) => h.query)
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const searchKeywordFreq: Record<string, number> = {};
  for (const w of queryTokens) searchKeywordFreq[w] = (searchKeywordFreq[w] || 0) + 1;
  const topSearchKeywords = Object.entries(searchKeywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w, c]) => ({ word: w, count: c }));

  // ── 5. Identify document families (cluster by name similarity) ──
  type DocFamily = { key: string; files: string[]; category: string };
  const familyMap: Record<string, DocFamily> = {};
  for (const f of userFiles) {
    // Normalise: strip numbers, dates, version markers, common suffixes
    const key = f.name
      .toLowerCase()
      .replace(/\d{4}[-_]?\d{0,2}[-_]?\d{0,2}/g, "")
      .replace(/\b(v\d+|rev|draft|final|signed|copy|amended)\b/g, "")
      .replace(/\.(pdf|doc|docx|txt|html?|rtf)$/i, "")
      .replace(/[^a-z ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 4)
      .join(" ");
    if (key.length < 5) continue;
    if (!familyMap[key]) familyMap[key] = { key, files: [], category: f.category };
    familyMap[key].files.push(f.name);
  }
  const documentFamilies = Object.values(familyMap)
    .filter((d) => d.files.length >= 2)
    .sort((a, b) => b.files.length - a.files.length)
    .slice(0, 8);

  // ── 6. Determine legal search terms for external cross-referencing ──
  const focusAreaWords = [
    ...(focusQuery ? focusQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 3) : []),
    ...topFileKeywords.slice(0, 5).map((k) => k.word),
    ...topSearchKeywords.slice(0, 4).map((k) => k.word),
  ];
  const legalQuery = [...new Set(focusAreaWords)].slice(0, 6).join(" ") || "Philippine law 2024";

  // ── 7. Parallel legal DB lookups ──
  const [trendResults, recentResults] = await Promise.all([
    hybridSearch(legalQuery, { maxResults: 8, strategy: "quick" }).then(r => ({ query: legalQuery, results: r.results, totalResults: r.results.length })),
    hybridSearch(focusQuery || "latest Supreme Court 2024 2025", {
      sourceFilters: ["jurisprudence", "law"],
      maxResults: 6,
      strategy: "quick",
    }).then(r => ({ query: focusQuery || "latest Supreme Court 2024 2025", results: r.results, totalResults: r.results.length })),
  ]);

  // ── 8. Build LLM prompt ──
  const sortedMonths = Object.entries(filesByMonth).sort(([a], [b]) => a.localeCompare(b));
  const oldestPeriod = sortedMonths.slice(0, 3).map(([m]) => m).join(", ") || "N/A";
  const newestPeriod = sortedMonths.slice(-3).map(([m]) => m).join(", ") || "N/A";

  const libraryStats = [
    `Total documents: ${userFiles.length}`,
    `Total size: ${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
    `Document categories: ${
      Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} (${v})`)
        .join(", ") || "No files uploaded yet"
    }`,
    `File formats: ${
      Object.entries(fileTypeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k.toUpperCase()} (${v})`)
        .join(", ") || "N/A"
    }`,
    `Upload timeline (months with files): ${sortedMonths.map(([m, c]) => `${m}: ${c}`).join(" | ") || "N/A"}`,
    `Oldest upload period: ${oldestPeriod}`,
    `Newest upload period: ${newestPeriod}`,
    `Top keywords in document names: ${topFileKeywords.slice(0, 10).map((k) => `${k.word} (×${k.count})`).join(", ") || "N/A"}`,
    `Top search topics (from search history): ${topSearchKeywords.slice(0, 8).map((k) => `${k.word} (×${k.count})`).join(", ") || "N/A"}`,
    `Recent searches: ${searchHistory.slice(0, 6).map((h) => `"${h.query.slice(0, 70)}"`).join("; ") || "None yet"}`,
    `Document families detected (2+ related docs): ${
      documentFamilies.length > 0
        ? documentFamilies.map((f) => `"${f.key}" — ${f.files.length} docs (${f.category})`).join("; ")
        : "None detected"
    }`,
  ].join("\n");

  const legalContext = [
    ...trendResults.results.slice(0, 6).map(
      (r, i) =>
        `[LEGAL ${i + 1}] ${r.title}${r.number ? ` (${r.number})` : ""}${r.date ? ` — ${r.date}` : ""}\n` +
        (r.relevantText ? r.relevantText.slice(0, 250) : "")
    ),
    ...recentResults.results.slice(0, 4).map(
      (r, i) =>
        `[RECENT ${i + 1}] ${r.title}${r.number ? ` (${r.number})` : ""}${r.date ? ` — ${r.date}` : ""}`
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are JusConsultus AI — a Philippine legal intelligence expert specialising in document library analysis, contract pattern recognition, and legal trend reporting.

Your task is to produce a **comprehensive Trend & Pattern Analysis** of the user's legal document library and cross-reference it with current Philippine legal developments.

IMPORTANT RULES:
- Be DATA-DRIVEN: reference the actual statistics provided. Cite counts, categories, and timelines.
- Be LEGALLY ACCURATE: only cite real Philippine laws, Supreme Court decisions, and official issuances.
- Be ACTIONABLE: every section should end with concrete recommendations.
- If the library has 0 documents, focus entirely on what the user SHOULD add based on their search patterns.

YOUR REPORT STRUCTURE (use exactly these headings):

## 📊 Library Overview
- Summarise the document collection: total count, size, categories, upload timeline, most common formats.

## 🗂️ Document Families & Contract Series
- Identify related document groups (same base name, category clusters, recurring patterns).
- For each detected family: list the documents, infer the purpose/transaction, and flag any missing pieces.

## 🔍 Dominant Legal Areas
- Based on document keywords and search history, rank the user's top legal focus areas.
- For each area: cite the primary Philippine law or jurisprudence governing it.

## 📈 Trends in Your Library
- Compare oldest vs. newest upload periods — what has shifted?
- Identify growing vs. declining areas.
- Note any sudden spikes (e.g., many similar drafts uploaded in the same month).

## ⚖️ Philippine Legal Developments Relevant to Your Library
- Reference the most relevant laws, Supreme Court decisions, and issuances from the retrieved sources.
- Flag anything the user should act on (new rules, landmark cases in their area, recent amendments).

## ⚠️ Coverage Gaps & Compliance Risks
- Legal areas the user researches heavily but has few/no supporting documents.
- Document types commonly needed in the user's practice area that are absent.
- Potential compliance risks based on the document mix.

## 💡 Recommendations (Top 5)
- Numbered list of the 5 most actionable recommendations.
- Each must be specific, concrete, and reference a real law or document type.

${focusQuery ? `USER'S SPECIFIC FOCUS QUESTION: "${focusQuery}"\n` : ""}Anchor your entire analysis in the data below.`;

  const userMessage = `MY DOCUMENT LIBRARY DATA:\n${libraryStats}\n\nRELATED PHILIPPINE LEGAL DATABASE RESULTS:\n${
    legalContext || "No matching legal documents found for the detected focus areas."
  }\n\nPlease produce the full Trend & Pattern Analysis report.`;

  const answer = await generateCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.4, maxTokens: 2800 }
  );

  const allSources = [...trendResults.results, ...recentResults.results]
    .filter((r, i, arr) => arr.findIndex((x) => x.documentId === r.documentId) === i)
    .slice(0, 12);

  const responsePayload = {
    answer,
    sources: allSources,
    libraryData: {
      totalFiles: userFiles.length,
      categories: categoryCount,
      fileTypes: fileTypeCount,
      timeline: Object.fromEntries(sortedMonths),
      topKeywords: topFileKeywords,
      topSearchTopics: topSearchKeywords,
      documentFamilies,
      recentSearches: searchHistory.slice(0, 10).map((h) => ({
        query: h.query,
        category: h.category,
        date: h.createdAt,
      })),
    },
    deepSearchMeta: {
      subQueries: [legalQuery],
      totalSourcesScanned: trendResults.totalResults + recentResults.totalResults,
      steps: [],
    },
  };

  // Cache for 30 minutes (library changes slowly)
  await AICache.setRAGContext(
    focusQuery || "trends",
    cacheKey,
    JSON.stringify(responsePayload),
    { ttlMs: 1000 * 60 * 30 }
  );

  return NextResponse.json(responsePayload);
}
