import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hybridSearch, buildUnifiedPrompt } from "@/lib/ai/unified-search";
import { generateCompletion } from "@/lib/ai/llm";

/**
 * POST /api/ai/document-assist
 *
 * AI assistance for the Document Builder.
 * Actions:
 *   - "draft"    — Generate or expand document content based on instructions
 *   - "improve"  — Improve/rewrite a section
 *   - "research" — Find relevant laws/cases to support a draft
 *   - "explain"  — Explain a legal clause in plain language
 *   - "citation" — Find proper citations for a claim
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    action = "draft",
    instruction,
    context: docContext,    // existing document content (excerpt)
    documentType = "general",
    sourceFilters = [],
  } = body;

  if (!instruction) {
    return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
  }

  try {
    const docContextStr = docContext
      ? `\n\nEXISTING DOCUMENT CONTEXT:\n${String(docContext).slice(0, 2000)}`
      : "";

    if (action === "draft" || action === "improve") {
      // Use hybrid search to find relevant law, then generate document content
      const searchResult = await hybridSearch(instruction, {
        mode: "professional",
        sourceFilters: sourceFilters.length > 0 ? sourceFilters : ["law", "jurisprudence"],
        maxResults: 12,
        strategy: "research",
      });

      const sourcesText = searchResult.results
        .slice(0, 8)
        .map((s, i) => `[${i + 1}] ${s.title}${s.number ? ` (${s.number})` : ""}${s.date ? ` — ${s.date}` : ""}\n${s.relevantText?.slice(0, 400) || ""}`)
        .join("\n\n---\n\n");

      const draftPrompt = `You are an expert Philippine legal document drafter.

${action === "draft" ? "Draft" : "Improve"} the following for a ${documentType}:
${instruction}${docContextStr}

Use the following legal sources as basis:
${sourcesText}

Rules:
- Use formal Philippine legal language
- Include proper citations in parenthetical form
- Format with proper headings and numbered paragraphs where appropriate
- Output ONLY the document content, no meta-commentary
- For motions/pleadings use WHEREAS / NOW THEREFORE / WHEREFORE format where appropriate
- End with a signature block if appropriate`;

      const draftContent = await generateCompletion(
        [
          { role: "system", content: draftPrompt },
          { role: "user", content: instruction },
        ],
        { temperature: 0.3, maxTokens: 4096 }
      );

      return NextResponse.json({
        content: draftContent,
        sources: searchResult.results.slice(0, 8),
        subQueries: searchResult.subQueries || [],
      });
    }

    if (action === "research") {
      // Find relevant laws and cases for a legal argument
      const searchResult = await hybridSearch(instruction, {
        mode: "professional",
        sourceFilters: sourceFilters.length > 0 ? sourceFilters : ["law", "jurisprudence"],
        maxResults: 15,
        strategy: "research",
      });

      const answer = searchResult.agenticAnswer || "Research sources found (see sources below).";

      return NextResponse.json({
        answer,
        sources: searchResult.results,
        subQueries: searchResult.subQueries || [],
        totalSourcesScanned: searchResult.results.length,
      });
    }

    if (action === "explain") {
      // Explain a clause/provision in plain language
      const explanation = await generateCompletion(
        [
          {
            role: "system",
            content: `You are a Philippine legal expert. Explain the following legal clause or provision in plain, clear language. Include: (1) what it means, (2) practical implications, (3) any important caveats.${docContextStr}`,
          },
          { role: "user", content: instruction },
        ],
        { temperature: 0.3, maxTokens: 1000 }
      );

      return NextResponse.json({ explanation });
    }

    if (action === "citation") {
      // Find proper citations
      const searchResult = await hybridSearch(`Find Philippine law and jurisprudence for: ${instruction}`, {
        mode: "professional",
        sourceFilters: ["law", "jurisprudence"],
        maxResults: 10,
        strategy: "exact",
      });

      const answer = searchResult.agenticAnswer || "Citations found (see sources below).";

      return NextResponse.json({
        sources: searchResult.results,
        answer,
        subQueries: searchResult.subQueries || [],
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Document assist error:", error);
    return NextResponse.json({ error: "AI assist failed" }, { status: 500 });
  }
}
