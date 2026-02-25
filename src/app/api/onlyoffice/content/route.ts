import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/onlyoffice/content?documentId=xxx
 * Get document content (HTML) for a document
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Fetch the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      html: document.content || "",
      text: document.content?.replace(/<[^>]*>/g, "") || "", // Strip HTML for plain text
    });
  } catch (error) {
    console.error("Get document content error:", error);
    return NextResponse.json(
      { error: "Failed to get document content" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onlyoffice/content
 * Update document content (HTML)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { documentId, html } = body;

    if (!documentId || typeof html !== "string") {
      return NextResponse.json(
        { error: "Document ID and HTML content required" },
        { status: 400 }
      );
    }

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Update document content
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { content: html },
    });

    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (error) {
    console.error("Update document content error:", error);
    return NextResponse.json(
      { error: "Failed to update document content" },
      { status: 500 }
    );
  }
}
