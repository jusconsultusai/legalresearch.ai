/**
 * GET /api/onlyoffice/file?documentId=xxx&token=yyy
 *
 * Public endpoint (no session required) that serves a document as a .docx
 * binary, authenticated by a short-lived signed JWT token embedded in the URL.
 *
 * ONLYOFFICE Document Server calls this URL from inside its Docker container.
 * It cannot use session cookies, so we issue a signed download token in the
 * /api/onlyoffice/config route and embed it here.
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db/prisma";
import HTMLtoDOCX from "html-to-docx";

const JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const token = searchParams.get("token");

    if (!documentId || !token) {
      return new NextResponse("documentId and token are required", { status: 400 });
    }

    if (!JWT_SECRET) {
      return new NextResponse("Server configuration error: JWT secret not set", { status: 500 });
    }

    // Verify the short-lived download token (no session cookie needed)
    let payload: { documentId: string; userId: string };
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as {
        documentId: string;
        userId: string;
      };
    } catch {
      return new NextResponse("Invalid or expired download token", { status: 403 });
    }

    if (payload.documentId !== documentId) {
      return new NextResponse("Token/documentId mismatch", { status: 403 });
    }

    // Fetch document (by ID and owner to prevent cross-user access)
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: payload.userId },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // Pre-process HTML to enforce pleading format based on Collection Case template
    // Structural formatting only - font is user's choice
    // - Proper heading and case caption positioning
    // - Line spacing: 1.5 for body, single for blockquotes
    let html = document.content || "<p></p>";
    
    // Wrap court heading patterns - "Republic of the Philippines" in title case, centered
    html = html.replace(
      /(<p[^>]*>)?\s*(REPUBLIC OF THE PHILIPPINES|Republic of the Philippines)\s*(<\/p>)?/gi,
      '<p style="text-align: center; margin-bottom: 0;">Republic of the Philippines</p>'
    );
    
    // Center court names (Regional Trial Court, Municipal Trial Court, etc.)
    html = html.replace(
      /(<p[^>]*>)?\s*((?:REGIONAL|MUNICIPAL|METROPOLITAN)\s+(?:TRIAL\s+)?COURT(?:\s+IN\s+CITIES)?)\s*(<\/p>)?/gi,
      '<p style="text-align: center; font-weight: bold; margin-top: 0; margin-bottom: 0;">$2</p>'
    );
    
    // Center branch designations
    html = html.replace(
      /(<p[^>]*>)?\s*(Branch\s+(?:\d+|_+|[A-Z]+))\s*(<\/p>)?/gi,
      '<p style="text-align: center; margin-top: 0; margin-bottom: 0;">$2</p>'
    );
    
    // Center city/municipality names that follow branch
    html = html.replace(
      /(<p[^>]*>)?\s*((?:City of |Municipality of )?(?:Quezon City|Makati City|Manila|Pasig City|Taguig City|Cebu City|Davao City|[A-Z][a-z]+(?:\s+City)?(?:,\s*[A-Z][a-z]+)?))\s*(<\/p>)?(?=\s*(?:<p|<div|$|\n\n|CIVIL|CRIMINAL|SPECIAL|FOR:|vs\.|versus))/gi,
      '<p style="text-align: center; margin-top: 0; margin-bottom: 24px;">$2</p>'
    );
    
    // Format case caption: "--- versus ---" indented (not centered, per Collection Case format)
    html = html.replace(
      /(<p[^>]*>)?\s*(-+\s*versus\s*-+|vs\.?)\s*(<\/p>)?/gi,
      '<p style="text-indent: 144px; margin: 8px 0;">--- versus ---</p>'
    );
    
    // Format case numbers (Civil Case No., Criminal Case No., etc.) - right side, bold
    html = html.replace(
      /(<p[^>]*>)?\s*((?:Civil|Criminal|Special|Administrative)\s+(?:Case|Proceeding)\s+No\.?\s*[:\s]*[_\-\d]+)\s*(<\/p>)?/gi,
      '<p style="text-align: right; font-weight: bold; margin-bottom: 0;">$2</p>'
    );
    
    // Format "For:" lines (For: Collection of Sum of Money, etc.) - right side, bold
    html = html.replace(
      /(<p[^>]*>)?\s*(For:\s*[^<]+)\s*(<\/p>)?/gi,
      '<p style="text-align: right; font-weight: bold; margin-top: 0; margin-bottom: 24px;">$2</p>'
    );
    
    // Format party designations (Plaintiff, Defendant) in italic
    html = html.replace(
      /(<p[^>]*>)?\s*(Plaintiff[,.]?)\s*(<\/p>)?/gi,
      '<p style="text-indent: 144px; font-style: italic;">$2</p>'
    );
    html = html.replace(
      /(<p[^>]*>)?\s*(Defendant[,.]?)\s*(<\/p>)?/gi,
      '<p style="text-indent: 144px; font-style: italic;">$2</p>'
    );
    
    // Format x-separator line
    html = html.replace(
      /(<p[^>]*>)?\s*(x-+x)\s*(<\/p>)?/gi,
      '<p style="margin: 8px 0;">$2</p>'
    );
    
    // Format blockquotes with single line spacing
    html = html.replace(
      /<blockquote([^>]*)>/gi,
      '<blockquote$1 style="margin-left: 72px; margin-right: 72px; line-height: 1.0; font-size: 13px;">'
    );
    
    // Center ALL headings (h1, h2, h3, h4, h5, h6) and make them bold
    html = html.replace(/<h1([^>]*)>/gi, '<h1$1 style="text-align: center; font-weight: bold;">');
    html = html.replace(/<h2([^>]*)>/gi, '<h2$1 style="text-align: center; font-weight: bold;">');
    html = html.replace(/<h3([^>]*)>/gi, '<h3$1 style="text-align: center; font-weight: bold;">');
    html = html.replace(/<h4([^>]*)>/gi, '<h4$1 style="text-align: center; font-weight: bold;">');
    html = html.replace(/<h5([^>]*)>/gi, '<h5$1 style="text-align: center; font-weight: bold;">');
    html = html.replace(/<h6([^>]*)>/gi, '<h6$1 style="text-align: center; font-weight: bold;">');
    
    // Center common document titles with spaced letters (per Collection Case format)
    // e.g., "C O M P L A I N T" instead of "COMPLAINT"
    html = html.replace(
      /(<p[^>]*>)?\s*((?:MOTION|COMPLAINT|ANSWER|REPLY|REJOINDER|AFFIDAVIT|PETITION|APPEAL|MEMORANDUM|MANIFESTATION|COMMENT|OPPOSITION|BRIEF|POSITION PAPER|FORMAL OFFER|JUDICIAL AFFIDAVIT|CERTIFICATE|VERIFICATION|CERTIFICATION|COUNTER-?AFFIDAVIT|SWORN STATEMENT|NOTICE|SUMMONS)(?:\s+(?:TO|FOR|OF|IN|WITH|AND|ON|AGAINST|RE:|EX PARTE|AD CAUTELAM)[^<]*)?)\s*(<\/p>)?/gi,
      '<p style="text-align: center; font-weight: bold; letter-spacing: 0.3em; margin-top: 24px; margin-bottom: 12px;">$2</p>'
    );
    
    // Center document headings with "x x x" pattern (e.g., "- - - x x x - - -")
    html = html.replace(
      /(<p[^>]*>)?\s*(-\s*-\s*-\s*x\s*x\s*x\s*-\s*-\s*-)\s*(<\/p>)?/gi,
      '<p style="text-align: center; margin: 8px 0;">$2</p>'
    );
    
    // Format body paragraphs with 1.5 line spacing and first-line indent
    // Only apply to paragraphs that don't already have text-align styles
    html = html.replace(
      /<p>(?!<)/g,
      '<p style="text-indent: 36px; line-height: 1.5; text-align: justify;">'
    );
    
    // Format numbered paragraphs (1., 2., 3., etc.)
    html = html.replace(
      /(<p[^>]*>)\s*(\d+\.)\s*/gi,
      '$1<span style="margin-right: 24px;">$2</span>'
    );
    
    // Format prayer section
    html = html.replace(
      /(<p[^>]*>)?\s*(PRAYER|WHEREFORE)\s*(<\/p>)?/gi,
      '<p style="text-align: center; font-weight: bold; margin-top: 24px; margin-bottom: 12px;">$2</p>'
    );
    
    // Format signature blocks (right-aligned)
    html = html.replace(
      /(<p[^>]*>)?\s*(Respectfully submitted\.?)\s*(<\/p>)?/gi,
      '<p style="text-align: left; text-indent: 36px; margin-top: 24px;">$2</p>'
    );

    // Convert stored HTML content to a .docx binary
    // SC Efficient Use of Paper Rule (A.M. No. 11-9-4-SC) settings:
    // - Font: Arial 14pt (28 half-points)
    // - Paper: Legal (8.5" × 13") = width: 12240 twips, height: 18720 twips
    // - Margins: Left 1.5" (2160 twips), Top/Right/Bottom 1" (1440 twips)
    // - Line spacing: 1.5 for body, single for blockquotes
    const docxBuffer = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      // Font is user's choice - default to system font
      fontSize: 28, // 14pt = 28 half-points
      margins: { 
        top: 1440,    // 1 inch
        bottom: 1440, // 1 inch
        left: 2160,   // 1.5 inches
        right: 1440,  // 1 inch
      },
      // Legal paper size (8.5" x 13")
      pageSize: {
        width: 12240, // 8.5 inches in twips
        height: 18720, // 13 inches in twips
      },
      lineSpacing: 360, // 1.5 line spacing (240 * 1.5)
      title: document.title || "Document",
    });

    const safeTitle = (document.title || "document")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    return new NextResponse(docxBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ONLYOFFICE file serve error:", error);
    return new NextResponse("Failed to serve document file", { status: 500 });
  }
}
