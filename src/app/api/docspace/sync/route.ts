/**
 * POST /api/docspace/sync
 * Uploads or updates a local document in ONLYOFFICE DocSpace cloud.
 * Returns the DocSpace fileId and a requestToken for the embedded SDK editor.
 *
 * Body: { documentId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { syncDocumentToDocSpace } from "@/lib/docspace";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    // Fetch the document, verifying ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
    }) as any;
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // docspaceFileId is a nullable String field added in the latest schema migration
    const existingFileId: string | null = doc.docspaceFileId ?? null;

    const { fileId, requestToken } = await syncDocumentToDocSpace({
      html: doc.content || "<p></p>",
      title: doc.title || "Untitled Document",
      docspaceFileId: existingFileId ? Number(existingFileId) : null,
    });

    // Persist DocSpace file ID if this is the first sync
    if (!existingFileId) {
      await (prisma.document.update as any)({
        where: { id: documentId },
        data: { docspaceFileId: String(fileId) },
      });
    }

    return NextResponse.json({ fileId, requestToken });
  } catch (error: any) {
    console.error("DocSpace sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync document to DocSpace" },
      { status: 500 }
    );
  }
}
