import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { analyzeUserFile, extractTextFromContent } from "@/lib/ai/document-loader";
import { deepSearch } from "@/lib/ai/deep-searcher";
import { generateCompletion } from "@/lib/ai/llm";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/ai/file-analysis
 *
 * Analyze a user file with AI.
 * Accepts EITHER:
 *   { fileId, action, question? }                 — DB-stored file (UserFile model)
 *   { content, name, mimeType, action, question? } — Inline content (from localStorage / My Files)
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId, content, name: inlineName, mimeType, action = "summary", question } = await request.json();

  if (!fileId && !content) {
    return NextResponse.json({ error: "fileId or content is required" }, { status: 400 });
  }

  try {
    let fileText: string;
    let fileName: string;
    let wordCount: number;

    if (content) {
      // Inline content path (My Files localStorage)
      fileText = extractTextFromContent(content, mimeType || "text/plain");
      fileName = inlineName || "document";
      wordCount = fileText.split(/\s+/).filter(Boolean).length;
    } else {
      // DB path (UserFile model)
      const fileData = await analyzeUserFile(fileId, user.id);
      if (!fileData) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      const fileInfo = await prisma.userFile.findFirst({
        where: { id: fileId, userId: user.id },
        select: { name: true, type: true },
      });
      fileText = fileData.text;
      fileName = fileInfo?.name || "document";
      wordCount = fileData.wordCount;
    }

    const excerpt = fileText.slice(0, 3000);

    if (action === "summary") {
      const summary = await generateCompletion(
        [
          {
            role: "system",
            content: `You are a Philippine legal document analyst. Provide a comprehensive summary of the following document in this format:
1. **Document Type** — Identify what kind of document this is
2. **Key Parties** — Who are the parties involved (if any)
3. **Main Subject** — What is this document about
4. **Key Provisions/Points** — List 3-7 key provisions or important points
5. **Legal Significance** — Why this document matters legally
6. **Potential Issues** — Any red flags, missing elements, or areas of concern

Be concise but thorough. Use Philippine legal terminology where appropriate.`,
          },
          {
            role: "user",
            content: `Document: "${fileName}"\n\nContent:\n${excerpt}`,
          },
        ],
        { temperature: 0.3, maxTokens: 2000 }
      );

      return NextResponse.json({ result: summary, wordCount: wordCount });
    }

    if (action === "legal-issues") {
      // Cross-reference with legal database to find issues
      const legalAnalysis = await deepSearch(
        `Legal issues and compliance analysis for: ${excerpt.slice(0, 500)}`,
        {
          mode: "professional",
          chatMode: "analyze",
          sourceFilters: ["law", "jurisprudence"],
          includeUserFiles: false,
          maxSources: 10,
        }
      );

      const issueAnalysis = await generateCompletion(
        [
          {
            role: "system",
            content: `You are a Philippine legal compliance expert. Analyze the following document for legal issues, risks, and compliance concerns under Philippine law. Reference the provided legal sources.

Legal Sources Found:
${legalAnalysis.sources.slice(0, 6).map((s, i) => `[${i + 1}] ${s.title}${s.number ? ` (${s.number})` : ""}\n${s.relevantText?.slice(0, 300) || ""}`).join("\n\n---\n\n")}`,
          },
          {
            role: "user",
            content: `Document: "${fileName}"\n\nPlease identify:\n1. Legal compliance issues\n2. Missing required elements\n3. Potential legal risks\n4. Recommended actions\n\nDocument content:\n${excerpt}`,
          },
        ],
        { temperature: 0.3, maxTokens: 2500 }
      );

      return NextResponse.json({
        result: issueAnalysis,
        sources: legalAnalysis.sources.slice(0, 6),
        wordCount: wordCount,
      });
    }

    if (action === "ask" && question) {
      // Answer a specific question about the document
      const answer = await generateCompletion(
        [
          {
            role: "system",
            content: `You are a Philippine legal document expert. Answer questions about the provided document accurately and concisely. Base your answers ONLY on the document content provided.`,
          },
          {
            role: "user",
            content: `Document: "${fileName}"\n\nDocument content:\n${excerpt}\n\nQuestion: ${question}`,
          },
        ],
        { temperature: 0.3, maxTokens: 1500 }
      );

      return NextResponse.json({ result: answer, wordCount: wordCount });
    }

    if (action === "extract") {
      // Extract key data points: dates, parties, obligations, amounts
      const extracted = await generateCompletion(
        [
          {
            role: "system",
            content: `You are a legal data extraction specialist. Extract key information from the document in JSON format.

Output ONLY valid JSON with these fields:
{
  "documentType": string,
  "parties": [{ "name": string, "role": string }],
  "dates": [{ "label": string, "date": string }],
  "amounts": [{ "label": string, "amount": string }],
  "obligations": [string],
  "conditions": [string],
  "keywords": [string]
}`,
          },
          {
            role: "user",
            content: `Document: "${fileName}"\n\nContent:\n${excerpt}`,
          },
        ],
        { temperature: 0.1, maxTokens: 1500 }
      );

      try {
        const match = extracted.match(/\{[\s\S]*\}/);
        const json = match ? JSON.parse(match[0]) : {};
        return NextResponse.json({ result: json, wordCount: wordCount });
      } catch {
        return NextResponse.json({ result: extracted, wordCount: wordCount });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("File analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
