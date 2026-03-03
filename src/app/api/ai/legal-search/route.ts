import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { query, mode = "standard_v2", sourceFilters = [], deep = false } = body;

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Enforce search quota
  if (user.searchesLeft <= 0) {
    return NextResponse.json({ error: "No searches remaining. Please upgrade your plan." }, { status: 403 });
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

    // Decrement search quota
    await prisma.user.update({
      where: { id: user.id },
      data: { searchesLeft: { decrement: 1 } },
    }).catch(() => {});

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
