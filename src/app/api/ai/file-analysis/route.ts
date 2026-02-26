import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { analyzeUserFile, extractTextFromContent } from "@/lib/ai/document-loader";
import { hybridSearch } from "@/lib/ai/unified-search";
import { generateCompletion } from "@/lib/ai/llm";
import { prisma } from "@/lib/db/prisma";

// Dynamically import pdf-parse to avoid bundling issues
async function extractPdfText(base64Data: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule = (await import("pdf-parse")) as any;
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const buffer = Buffer.from(base64Data, "base64");
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch {
    return "";
  }
}

/**
 * Extract text from a data-URL content string.
 * Supports text, HTML, and PDF via pdf-parse.
 */
async function extractText(content: string, mimeType: string): Promise<string> {
  if (!content) return "";

  // Plain text (not a data URL)
  if (!content.startsWith("data:")) {
    return content;
  }

  // Parse the data URL
  const base64Match = content.match(/^data:[^;]*;base64,(.+)$/);
  if (!base64Match) return "";

  const base64Data = base64Match[1];

  // Use pdf-parse for PDFs
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    const pdfText = await extractPdfText(base64Data);
    return pdfText;
  }

  // For everything else, fall through to the sync extractor
  return extractTextFromContent(content, mimeType);
}

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
      // Inline content path (My Files localStorage) — use async extractor (handles PDFs)
      fileText = await extractText(content, mimeType || "text/plain");
      fileName = inlineName || "document";

      // If we couldn't extract any text, return an informative message
      if (!fileText || fileText.trim().length < 10) {
        return NextResponse.json({
          result: "This file type does not contain extractable text for AI analysis. " +
                  "For PDFs, make sure the file contains selectable text (not a scanned image). " +
                  "For images, text extraction (OCR) is not currently supported.",
          wordCount: 0,
        });
      }

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
      // hybridSearch is best-effort — continue even if it fails
      let legalSources: { title: string; number?: string; relevantText?: string; category: string }[] = [];
      let sourcesContext = "";
      try {
        const searchResult = await hybridSearch(
          `Legal issues and compliance analysis for: ${excerpt.slice(0, 500)}`,
          {
            mode: "professional",
            sourceFilters: ["law", "jurisprudence"],
            maxResults: 10,
            strategy: "research",
          }
        );
        legalSources = searchResult.results.slice(0, 6) as typeof legalSources;
        sourcesContext = legalSources.length > 0
          ? `\n\nLegal Sources Found:\n${legalSources.map((s, i) => `[${i + 1}] ${s.title}${s.number ? ` (${s.number})` : ""}\n${s.relevantText?.slice(0, 300) || ""}`).join("\n\n---\n\n")}`
          : "";
      } catch (err) {
        console.error("hybridSearch failed for legal-issues (proceeding without sources):", err);
      }

      const issueAnalysis = await generateCompletion(
        [
          {
            role: "system",
            content: `You are a Philippine legal compliance expert. Analyze the following document for legal issues, risks, and compliance concerns under Philippine law.${sourcesContext}`,
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
        sources: legalSources,
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
