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

    // Use the pre-formatted HTML content directly.
    // HTML is already properly styled by formatLegalHtml() + wrapWithScPaperStyles()
    // during document generation. No additional regex transformations needed.
    const html = document.content || "<p></p>";

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
