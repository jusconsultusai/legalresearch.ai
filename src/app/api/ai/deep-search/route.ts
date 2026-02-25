import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deepSearch, quickSearch } from "@/lib/ai/deep-searcher";
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

  const body = await request.json();
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

  // Check search limits
  if (user.searchesLeft <= 0) {
    return NextResponse.json(
      { error: "No searches remaining. Please upgrade your plan." },
      { status: 403 }
    );
  }

  try {
    const result = await deepSearch(query, {
      mode,
      sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
      includeUserFiles,
      userId: user.id,
      chatMode,
      deepThink,
      maxSources: deepThink ? 30 : 20,
    });

    // Decrement search count
    await prisma.user.update({
      where: { id: user.id },
      data: { searchesLeft: { decrement: 1 } },
    });

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
      steps: result.steps,
      subQueries: result.subQueries,
      totalSourcesScanned: result.totalSourcesScanned,
      searchesLeft: user.searchesLeft - 1,
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
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");
  const sources = request.nextUrl.searchParams.get("sources");

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const context = await quickSearch(q, {
      sourceFilters: sources ? sources.split(",") : undefined,
      limit: Math.min(limit, 50),
    });

    return NextResponse.json({
      results: context.results,
      totalResults: context.totalResults,
    });
  } catch (error) {
    console.error("Quick search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
