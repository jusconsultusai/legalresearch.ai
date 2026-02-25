import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion } from "@/lib/ai/llm";

// ─── Text extraction helpers ──────────────────────────────────────────────────

async function extractFromDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = Buffer.from(buffer);
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value ?? "";
}

async function extractFromPdf(buffer: ArrayBuffer): Promise<string> {
  // pdf-parse CJS module — import as namespace
  const pdfParseModule = await import("pdf-parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule;
  const buf = Buffer.from(buffer);
  const result = await pdfParse(buf);
  return result.text ?? "";
}

async function extractFromImage(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const buf = Buffer.from(buffer);
  const base64 = `data:${mimeType};base64,${buf.toString("base64")}`;
  const result = await Tesseract.recognize(base64, "eng+fil", {
    logger: () => {},
  });
  return result.data.text ?? "";
}

async function extractText(file: File): Promise<{ text: string; ocrConfidence?: number }> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type;

  if (ext === "pdf" || mime === "application/pdf") {
    return { text: await extractFromPdf(buffer) };
  }
  if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "doc"  || mime === "application/msword") {
    return { text: await extractFromDocx(buffer) };
  }
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "bmp", "tiff", "webp"].includes(ext)) {
    const text = await extractFromImage(buffer, mime || `image/${ext}`);
    return { text, ocrConfidence: 0.9 };
  }
  if (ext === "txt" || mime === "text/plain") {
    return { text: new TextDecoder("utf-8").decode(buffer) };
  }
  return { text: new TextDecoder("utf-8").decode(buffer) };
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are JusConsultus AI, a senior Philippine legal document analyst.
Analyze the provided legal document text and return a detailed JSON object. 
IMPORTANT: Return ONLY valid JSON with no markdown fences, no extra explanation.

The JSON must match this TypeScript interface exactly:
{
  "documentType": string,
  "documentCategory": string,   // e.g., "Pleading", "Contract", "Affidavit"
  "summary": string,            // 3–5 sentence professional summary
  "overallScore": number,       // 0–100 quality score
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "category": string,
      "description": string,
      "location": string,       // optional clause or section reference
      "suggestion": string,
      "originalText": string,   // optional
      "suggestedText": string   // optional
    }
  ],
  "improvements": [
    {
      "area": string,
      "currentState": string,
      "recommendation": string,
      "priority": "high" | "medium" | "low",
      "current": string,        // optional short excerpt
      "suggested": string       // optional improved version
    }
  ],
  "legalReferences": [
    {
      "citation": string,
      "fullCitation": string,
      "relevance": string,
      "type": "statute" | "case" | "regulation" | "jurisprudence" | "other",
      "summary": string
    }
  ],
  "jurisprudenceSuggestions": [
    {
      "caseName": string,
      "citation": string,
      "court": string,
      "year": string,
      "relevantPrinciple": string,
      "howToApply": string,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "readabilitySuggestions": {
    "targetAudience": string,
    "currentReadability": string,
    "suggestions": string[],
    "rewrittenSections": [
      {
        "original": string,
        "simplified": string,
        "reason": string
      }
    ]
  },
  "keyTerms": string[],
  "aiSuggestions": [
    {
      "id": string,             // unique e.g. "s1", "s2"
      "type": "grammar" | "legal" | "style" | "clarity" | "jurisprudence",
      "original": string,
      "suggested": string,
      "reason": string,
      "severity": "high" | "medium" | "low"
    }
  ],
  "metadata": {
    "wordCount": number,
    "language": string,
    "dateDetected": string
  }
}`;

async function analyzeWithAI(text: string, fileName: string): Promise<object> {
  const wordCount = text.trim().split(/\s+/).length;
  const truncated = text.length > 12000 ? text.slice(0, 12000) + "\n\n[... document truncated for analysis ...]" : text;

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Analyze this Philippine legal document.\n\nFile: ${fileName}\nWord count: ${wordCount}\n\n---\n${truncated}`,
    },
  ];

  const raw = await generateCompletion(messages, {
    temperature: 0.2,
    maxTokens: 4096,
  });

  // Strip markdown code fences if model wraps the JSON
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const shouldExtract  = formData.get("extractText") === "true";
    const shouldAnalyze  = formData.get("analyzeContent") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1 — Extract text
    let extractedText = "";
    let ocrConfidence: number | undefined;

    if (shouldExtract || shouldAnalyze) {
      const { text, ocrConfidence: conf } = await extractText(file);
      extractedText = text;
      ocrConfidence = conf;
    }

    // 2 — AI analysis
    let analysis: object | null = null;
    if (shouldAnalyze && extractedText.trim()) {
      analysis = await analyzeWithAI(extractedText, file.name);
      // Attach metadata that extraction knows
      (analysis as any).extractedText = extractedText;
      if (ocrConfidence !== undefined) {
        (analysis as any).metadata = {
          ...(analysis as any).metadata,
          ocrConfidence,
          wordCount: extractedText.trim().split(/\s+/).length,
        };
      }
    }

    return NextResponse.json({
      success: true,
      extractedText,
      analysis,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (err: unknown) {
    console.error("[analyze-document]", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Don't cache — file uploads require dynamic rendering
export const dynamic = "force-dynamic";
