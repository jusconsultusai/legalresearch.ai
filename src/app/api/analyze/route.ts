import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion, buildDocumentAnalysisPrompt } from "@/lib/ai/llm";

// Helper to strip HTML tags and extract text
function extractTextFromHtml(html: string): string {
  // Remove script and style tags with their contents
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, "\n");
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, "\n");
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  return text.trim();
}

// Helper to perform OCR on image buffer
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng");
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data.text || "";
  } catch (error) {
    console.error("OCR failed:", error);
    return "[OCR text extraction failed. The image may be low quality or contain no readable text.]";
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;
    const rawAnalysisType = (formData.get("analysisType") as string) || "full";
    const validAnalysisTypes = ["grammar", "legal_context", "legal_clarity", "full"] as const;
    type AnalysisType = typeof validAnalysisTypes[number];
    const analysisType: AnalysisType = validAnalysisTypes.includes(rawAnalysisType as AnalysisType) ? rawAnalysisType as AnalysisType : "full";

    if (!file && !text) {
      return NextResponse.json({ error: "File or text is required" }, { status: 400 });
    }

    let documentText = text || "";

    if (file) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType === "text/plain") {
        documentText = await file.text();
      } else if (fileType === "application/pdf") {
        // PDF parsing
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfMod = await import("pdf-parse") as any;
          const pdf = pdfMod.default || pdfMod;
          const parsed = await pdf(buffer);
          documentText = parsed.text;
        } catch {
          documentText = "[PDF parsing failed. Please copy and paste the text directly.]";
        }
      } else if (
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType === "application/msword"
      ) {
        // DOCX/DOC parsing
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          documentText = result.value;
        } catch {
          documentText = "[DOCX parsing failed. Please copy and paste the text directly.]";
        }
      } else if (
        fileType === "text/html" ||
        fileName.endsWith(".html") ||
        fileName.endsWith(".htm")
      ) {
        // HTML/HTM parsing
        try {
          const htmlContent = await file.text();
          documentText = extractTextFromHtml(htmlContent);
        } catch {
          documentText = "[HTML parsing failed. Please copy and paste the text directly.]";
        }
      } else if (
        fileType === "image/jpeg" ||
        fileType === "image/png" ||
        fileType === "image/jpg" ||
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".png")
      ) {
        // Image OCR parsing
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          documentText = await extractTextFromImage(buffer);
          if (!documentText.trim()) {
            documentText = "[No text could be extracted from the image. The image may not contain readable text.]";
          }
        } catch {
          documentText = "[Image OCR failed. Please ensure the image contains clear, readable text.]";
        }
      } else {
        return NextResponse.json({ error: `Unsupported file type: ${fileType}` }, { status: 400 });
      }
    }

    if (!documentText.trim()) {
      return NextResponse.json({ error: "No text content found in the document" }, { status: 400 });
    }

    const prompt = buildDocumentAnalysisPrompt(documentText, analysisType);
    const analysis = await generateCompletion(prompt, {
      maxTokens: 2000,
      temperature: 0.3,
    });

    return NextResponse.json({
      success: true,
      documentText,
      analysis,
      wordCount: documentText.split(/\s+/).length,
      charCount: documentText.length,
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ error: "Failed to analyze document" }, { status: 500 });
  }
}
