import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hybridSearch, buildUnifiedPrompt } from "@/lib/ai/unified-search";
import { generateCompletion } from "@/lib/ai/llm";

/**
 * POST /api/ai/legal-search
 *
 * AI-powered legal database search. Uses DeepSearch for comprehensive queries
 * and quick search for simple lookups.
 *
 * Body: { query, mode?, sourceFilters?, deep?: boolean }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, mode = "standard_v2", sourceFilters = [], deep = false } = await request.json();

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const strategy = deep ? "agentic" : "quick";
    const searchResult = await hybridSearch(query, {
      mode,
      sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
      maxResults: deep ? 15 : 10,
      strategy,
    });

    let answer: string;
    if (searchResult.agenticAnswer) {
      answer = searchResult.agenticAnswer;
    } else {
      const prompt = buildUnifiedPrompt(searchResult, mode);
      answer = await generateCompletion(
        [
          { role: "system", content: prompt },
          { role: "user", content: query },
        ],
        { temperature: 0.3, maxTokens: 2048 }
      );
    }

    const sources = searchResult.results.map((r) => ({
      title: r.title,
      number: r.number,
      category: r.category,
      subcategory: r.subcategory,
      date: r.date,
      score: r.score,
      relevantText: r.relevantText,
      relativePath: r.relativePath,
    }));

    return NextResponse.json({
      answer,
      sources,
      subQueries: searchResult.subQueries || [],
      totalSourcesScanned: searchResult.results.length,
    });
  } catch (error) {
    console.error("Legal search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
