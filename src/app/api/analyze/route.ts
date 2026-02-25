import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion, buildDocumentAnalysisPrompt } from "@/lib/ai/llm";

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

      if (fileType === "text/plain") {
        documentText = await file.text();
      } else if (fileType === "application/pdf") {
        // Note: pdf-parse requires server-side buffer, this is a simplified version
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
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          documentText = result.value;
        } catch {
          documentText = "[DOCX parsing failed. Please copy and paste the text directly.]";
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
