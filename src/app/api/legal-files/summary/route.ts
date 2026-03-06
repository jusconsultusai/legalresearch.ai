import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { generateCompletion } from "@/lib/ai/llm";
import { prisma } from "@/lib/db/prisma";
import pdfParse from "pdf-parse";

const LEGAL_DB_ROOT = path.join(process.cwd(), "data", "legal-database");

/** Strip HTML tags and collapse whitespace to get plain text */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const relPath: string = body.path || "";
  const title: string = body.title || "Legal Document";
  const number: string = body.number || "";

  if (!relPath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  // Validate path stays within LEGAL_DB_ROOT
  const absPath = path.resolve(LEGAL_DB_ROOT, relPath);
  if (!absPath.startsWith(LEGAL_DB_ROOT) || !/\.(html?|pdf)$/i.test(absPath)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isPdf = /\.pdf$/i.test(absPath);

  // Check cached summary first
  const cacheKey = `summary:${relPath}`;
  try {
    const cached = await prisma.cacheEntry.findUnique({ where: { key: cacheKey } });
    if (cached && cached.expiresAt > new Date()) {
      const parsed = JSON.parse(cached.value);
      return NextResponse.json({ summary: parsed.summary, cached: true });
    }
  } catch { /* proceed to generate */ }

  let plainText: string;
  try {
    if (isPdf) {
      const buf = await fs.readFile(absPath);
      const pdfData = await pdfParse(buf);
      plainText = pdfData.text.replace(/\s{2,}/g, " ").trim().slice(0, 4000);
    } else {
      let rawHtml: string;
      try {
        rawHtml = await fs.readFile(absPath, "utf-8");
      } catch {
        const buf = await fs.readFile(absPath);
        rawHtml = buf.toString("latin1");
      }
      plainText = htmlToText(rawHtml).slice(0, 4000);
    }
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const documentId = number ? `${number} — ${title}` : title;

  const systemPrompt = `You are a Philippine legal expert providing concise, accurate summaries of legal documents.
When given the text of a Philippine legal document, produce a well-structured summary with the following sections:
1. **Overview** – one paragraph describing what the document is and its significance.
2. **Key Provisions / Ruling** – bullet points of the most important provisions, holdings, or rules.
3. **Legal Significance** – one paragraph on why this document matters in Philippine law.

Keep the response clear, professional, and under 400 words. Do not fabricate content not found in the text.`;

  const userMessage = `Summarize this Philippine legal document:

Document: ${documentId}
---
${plainText}
---`;

  try {
    const summary = await generateCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 600, temperature: 0.2 }
    );

    // Cache the generated summary for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    try {
      await prisma.cacheEntry.upsert({
        where: { key: cacheKey },
        create: {
          key: cacheKey,
          type: "llm",
          value: JSON.stringify({ summary }),
          expiresAt,
        },
        update: {
          value: JSON.stringify({ summary }),
          expiresAt,
        },
      });
    } catch { /* cache write failure is not critical */ }

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("AI summary error:", err);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
