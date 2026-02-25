import { NextRequest, NextResponse } from "next/server";
import {
  DOCUMENT_TEMPLATES,
  type DocumentTemplateKey,
} from "@/lib/documentFormats/scPaperRule";

// Map URL type keys → template keys (same map as the generate route)
const TEMPLATE_KEY_MAP: Record<string, DocumentTemplateKey> = {
  complaint: "complaint",
  answer: "answer",
  motion: "motion",
  "motion-dismiss": "motion",
  "motion-summary": "motion",
  reply: "motion",
  demurrer: "motion",
  memorandum: "memorandum",
  comment: "memorandum",
  "complaint-affidavit": "counterAffidavit",
  "counter-affidavit": "counterAffidavit",
  "bail-petition": "petition",
  "motion-to-dismiss": "motion",
  "contract-service": "contract",
  "contract-lease": "lease",
  "deed-sale": "deed",
  moa: "memorandum",
  mou: "memorandum",
  nda: "nda",
  "employment-contract": "contract",
  "articles-inc": "boardResolution",
  bylaws: "boardResolution",
  "board-resolution": "boardResolution",
  "secretary-cert": "affidavit",
  gis: "boardResolution",
  "position-paper": "memorandum",
  "admin-complaint": "affidavit",
  appeal: "petition",
  affidavit: "affidavit",
  spa: "spa",
  gpa: "spa",
  jurat: "affidavit",
  "demand-letter": "demandLetter",
};

/**
 * GET /api/documents/template?type=complaint
 * Returns the pre-built local template HTML for a given document type.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeParam = (searchParams.get("type") || "").toLowerCase().replace(/\s+/g, "-");

  const localKey = TEMPLATE_KEY_MAP[typeParam] || null;

  if (!localKey || !DOCUMENT_TEMPLATES[localKey]) {
    return NextResponse.json(
      { content: null, error: "Template not found for type: " + typeParam },
      { status: 404 }
    );
  }

  const rawText = DOCUMENT_TEMPLATES[localKey]({});

  // Convert plain text template to styled HTML
  const html = rawText
    .split("\n")
    .map((line) => {
      const trimmed = line.trimEnd();
      if (trimmed === "") return "<br/>";
      if (/^\s{10,}/.test(trimmed))
        return `<p style="text-align:center;font-family:Arial,sans-serif;font-size:14px;margin:0 0 4px">${trimmed.trim()}</p>`;
      return `<p style="font-family:Arial,sans-serif;font-size:14px;margin:0 0 4px;white-space:pre-wrap">${trimmed}</p>`;
    })
    .join("");

  return NextResponse.json({ content: html, key: localKey });
}
