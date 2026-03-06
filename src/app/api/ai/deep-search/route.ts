import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hybridSearch, buildUnifiedPrompt } from "@/lib/ai/unified-search";
import { generateCompletion } from "@/lib/ai/llm";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/ai/deep-search
 *
 * Runs the full DeepSearch pipeline (query decomposition → iterative retrieval
 * → evaluation → LLM synthesis) and returns a comprehensive answer with sources.
 *
 * Body: { query, mode?, sourceFilters?, includeUserFiles?, chatMode?, deepThink? }
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
  const {
    query,
    mode = "standard_v2",
    sourceFilters = [],
    includeUserFiles = true,
    chatMode,
    deepThink = false,
  } = body;

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Check search limits (only for free plan users)
  const isFreePlan = user.plan === "free";
  if (isFreePlan && user.searchesLeft <= 0) {
    return NextResponse.json(
      { error: "No searches remaining. Please upgrade your plan." },
      { status: 403 }
    );
  }

  try {
    // Unified Search with strategy based on deepThink
    const strategy = deepThink ? "agentic" : "research";
    const searchResult = await hybridSearch(query, {
      mode,
      sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
      maxResults: deepThink ? 30 : 20,
      strategy,
    });

    // Synthesize answer
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
        { temperature: 0.3, maxTokens: 4096 }
      );
    }

    const result = {
      answer,
      sources: searchResult.results,
      subQueries: searchResult.subQueries || [],
      totalSourcesScanned: searchResult.results.length,
    };

    // Decrement search count (only for free plan users)
    if (isFreePlan) {
      await prisma.user.update({
        where: { id: user.id },
        data: { searchesLeft: { decrement: 1 } },
      });
    }

    // Log search history
    await prisma.searchHistory.create({
      data: {
        userId: user.id,
        query: query.slice(0, 500),
        category: sourceFilters.join(",") || "all",
        mode,
        results: result.sources.length,
      },
    }).catch(() => {}); // Non-critical

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      subQueries: result.subQueries,
      totalSourcesScanned: result.totalSourcesScanned,
      searchesLeft: isFreePlan ? user.searchesLeft - 1 : -1,
    });
  } catch (error) {
    console.error("DeepSearch error:", error);
    return NextResponse.json(
      { error: "An error occurred during the search. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/deep-search?q=...&limit=...
 *
 * Quick search endpoint for auto-suggestions and lightweight queries.
 * Does NOT use query decomposition or LLM synthesis — just retrieval.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  const limitRaw = parseInt(request.nextUrl.searchParams.get("limit") || "10");
  const limit = Number.isNaN(limitRaw) ? 10 : limitRaw;
  const sources = request.nextUrl.searchParams.get("sources");

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const searchResult = await hybridSearch(q, {
      sourceFilters: sources ? sources.split(",") : undefined,
      maxResults: Math.min(limit, 50),
      strategy: "quick",
    });

    return NextResponse.json({
      results: searchResult.results,
      totalResults: searchResult.results.length,
    });
  } catch (error) {
    console.error("Quick search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
