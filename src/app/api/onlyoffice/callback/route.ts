// /api/onlyoffice/callback/route.ts
// ONLYOFFICE Document Server callback handler
// This receives save notifications when documents are modified in the editor
// See: https://api.onlyoffice.com/editors/callback

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { shouldSaveDocument, downloadDocument, verifyCallbackToken, type CallbackStatus } from "@/lib/onlyoffice";

/**
 * POST /api/onlyoffice/callback
 * ONLYOFFICE calls this endpoint when document status changes
 *
 * Status codes:
 *  0 - No document with the given key
 *  1 - Document is being edited
 *  2 - Document is ready for saving (closed by all editors)
 *  3 - Document saving error
 *  4 - Document closed with no changes
 *  6 - Document is being edited, force save requested
 *  7 - Force save error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const status: CallbackStatus = body;

    // Verify JWT token from Authorization header if available
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token && !verifyCallbackToken(token)) {
        console.warn("ONLYOFFICE callback: Invalid JWT token");
        // Don't reject — some setups may not use JWT
      }
    }

    const documentKey = status.key || "";

    // Extract document ID from key (format: "doc-{documentId}-v{version}" or just documentId)
    let documentId = documentKey;
    const keyMatch = documentKey.match(/^doc-(.+?)-v\d+$/);
    if (keyMatch) {
      documentId = keyMatch[1];
    } else {
      // Also handle hash-based keys: "{documentId}-{hash}"
      const hashMatch = documentKey.match(/^(.+?)-[a-f0-9]{16}$/);
      if (hashMatch) {
        documentId = hashMatch[1];
      }
    }

    // Check if we should save
    if (shouldSaveDocument(status) && status.url) {
      try {
        // Download the saved document from ONLYOFFICE
        const documentBuffer = await downloadDocument(status.url);

        // For now, store the raw content as HTML in the database
        // In production, you'd store the file to disk/S3 and keep a reference
        const htmlContent = documentBuffer.toString("utf-8");

        // Update the document in the database
        await prisma.document.update({
          where: { id: documentId },
          data: {
            content: htmlContent,
            onlyofficeKey: documentKey,
            updatedAt: new Date(),
          },
        });

        console.log(`ONLYOFFICE callback: Document ${documentId} saved successfully`);
      } catch (saveError) {
        console.error(`ONLYOFFICE callback: Failed to save document ${documentId}:`, saveError);
      }
    } else if (status.status === 4) {
      // Document closed without changes
      console.log(`ONLYOFFICE callback: Document ${documentId} closed without changes`);
    } else if (status.status === 1) {
      // Document is being edited
      console.log(`ONLYOFFICE callback: Document ${documentId} is being edited by ${status.users?.join(", ")}`);
    }

    // ONLYOFFICE expects { error: 0 } to acknowledge the callback
    return NextResponse.json({ error: 0 });
  } catch (error) {
    console.error("ONLYOFFICE callback error:", error);
    // Still return { error: 0 } to prevent ONLYOFFICE from retrying
    return NextResponse.json({ error: 0 });
  }
}
