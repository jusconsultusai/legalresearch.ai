import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deepSearch } from "@/lib/ai/deep-searcher";
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
      // Use DeepSearch to find relevant law, then generate document content
      const result = await deepSearch(instruction, {
        mode: "professional",
        chatMode: "draft",
        sourceFilters: sourceFilters.length > 0 ? sourceFilters : ["law", "jurisprudence"],
        includeUserFiles: true,
        userId: user.id,
        maxSources: 12,
      });

      // Generate formatted document text from the search result
      const draftPrompt = `You are an expert Philippine legal document drafter.

${action === "draft" ? "Draft" : "Improve"} the following for a ${documentType}:
${instruction}${docContextStr}

Use the following legal sources as basis:
${result.sources.slice(0, 8).map((s, i) => `[${i + 1}] ${s.title}${s.number ? ` (${s.number})` : ""}${s.date ? ` — ${s.date}` : ""}\n${s.relevantText?.slice(0, 400) || ""}`).join("\n\n---\n\n")}

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
        sources: result.sources.slice(0, 8),
        subQueries: result.subQueries,
      });
    }

    if (action === "research") {
      // Find relevant laws and cases for a legal argument
      const result = await deepSearch(instruction, {
        mode: "professional",
        chatMode: "find",
        sourceFilters: sourceFilters.length > 0 ? sourceFilters : ["law", "jurisprudence"],
        includeUserFiles: false,
        maxSources: 15,
      });

      return NextResponse.json({
        answer: result.answer,
        sources: result.sources,
        subQueries: result.subQueries,
        totalSourcesScanned: result.totalSourcesScanned,
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
      const result = await deepSearch(`Find Philippine law and jurisprudence for: ${instruction}`, {
        mode: "professional",
        chatMode: "find",
        sourceFilters: ["law", "jurisprudence"],
        includeUserFiles: false,
        maxSources: 10,
      });

      return NextResponse.json({
        sources: result.sources,
        answer: result.answer,
        subQueries: result.subQueries,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Document assist error:", error);
    return NextResponse.json({ error: "AI assist failed" }, { status: 500 });
  }
}
