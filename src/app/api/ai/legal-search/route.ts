import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deepSearch, quickSearch } from "@/lib/ai/deep-searcher";
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
    if (deep) {
      // Full DeepSearch with LLM synthesis
      const result = await deepSearch(query, {
        mode,
        sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
        includeUserFiles: true,
        userId: user.id,
        maxSources: 15,
      });

      return NextResponse.json({
        answer: result.answer,
        sources: result.sources,
        subQueries: result.subQueries,
        totalSourcesScanned: result.totalSourcesScanned,
      });
    } else {
      // Quick search with lightweight LLM synthesis
      const context = await quickSearch(query, {
        sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
        limit: 15,
      });

      // Build sources in the same shape as deepSearch
      const sources = context.results.map((r) => ({
        title: r.title,
        number: r.number,
        category: r.category,
        subcategory: r.subcategory,
        date: r.date,
        score: r.score,
        relevantText: r.relevantText,
        relativePath: r.relativePath,
      }));

      // Synthesize a concise answer from the top results
      let answer = "No relevant legal documents found for your query.";
      if (sources.length > 0) {
        const snippets = sources
          .slice(0, 6)
          .map((s, i) => `[${i + 1}] ${s.title}${s.number ? ` (${s.number})` : ""}: ${s.relevantText?.slice(0, 300)}`)
          .join("\n\n");
        answer = await generateCompletion(
          [
            {
              role: "system",
              content: `You are a Philippine legal research assistant. Based on the retrieved legal documents, provide a concise and accurate answer to the user's query. Reference specific laws, cases, or provisions by name. Be direct and legally precise. Format your answer in clear paragraphs.`,
            },
            {
              role: "user",
              content: `Query: ${query}\n\nRetrieved Documents:\n${snippets}`,
            },
          ],
          { temperature: 0.3, maxTokens: 1200 }
        );
      }

      return NextResponse.json({
        answer,
        sources,
        totalSourcesScanned: context.totalResults,
      });
    }
  } catch (error) {
    console.error("Legal search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
