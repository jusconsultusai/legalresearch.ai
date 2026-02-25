// /api/onlyoffice/config/route.ts
// Generate signed editor configuration for the ONLYOFFICE Document Editor
// This endpoint creates a JWT-signed config that the editor component uses

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getCurrentUser } from "@/lib/auth";
import { generateEditorConfig, DocumentType, generateFileKey } from "@/lib/onlyoffice";

// Base URL that ONLYOFFICE Document Server (inside Docker) can reach.
// On Windows/Mac Docker Desktop: host.docker.internal resolves to the host.
// Override via ONLYOFFICE_HOST_URL in .env.local for other environments.
const ONLYOFFICE_HOST_URL =
  process.env.ONLYOFFICE_HOST_URL || "http://host.docker.internal:3000";

const JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || "";

/**
 * POST /api/onlyoffice/config
 * Generate a signed ONLYOFFICE editor configuration
 *
 * Body:
 *  - documentId: string
 *  - documentTitle: string
 *  - documentFileType: string (default "docx")
 *  - documentKey: string
 *  - documentUrl: string
 *  - callbackUrl: string
 *  - mode: "edit" | "view" (default "edit")
 *  - userId: string (optional, overrides session user)
 *  - userName: string (optional, overrides session user)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
    }

    const {
      documentId,
      documentTitle = "Untitled Document",
      documentFileType = "docx",
      documentKey,
      // callbackUrl/documentUrl from client use window.location.origin (localhost)
      // which is unreachable from inside Docker — we rebuild them below.
      callbackUrl: _clientCallbackUrl,
      mode = "edit",
    } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Generate a short-lived signed download token so the public /file endpoint
    // can authenticate ONLYOFFICE's file-fetch request without a session cookie.
    const fileToken = jwt.sign(
      { documentId, userId: user.id },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "4h" }
    );

    // Build URLs that ONLYOFFICE (running in Docker) can actually reach.
    // ONLYOFFICE_HOST_URL defaults to http://host.docker.internal:3000 so
    // the container can reach the Next.js dev server on the host machine.
    const resolvedDocumentUrl = `${ONLYOFFICE_HOST_URL}/api/onlyoffice/file?documentId=${documentId}&token=${encodeURIComponent(fileToken)}`;
    const resolvedCallbackUrl = `${ONLYOFFICE_HOST_URL}/api/onlyoffice/callback`;

    // Generate a unique key for version tracking if not provided
    const key = documentKey || generateFileKey(documentId);

    const config = generateEditorConfig({
      documentId,
      documentTitle: `${documentTitle}.${documentFileType}`,
      documentUrl: resolvedDocumentUrl,
      documentType: DocumentType.TEXT,
      documentKey: key,
      user: {
        id: user.id,
        name: user.name || "User",
      },
      callbackUrl: resolvedCallbackUrl,
      mode,
      permissions: {
        edit: mode === "edit",
        download: true,
        print: true,
        review: true,
        comment: true,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("ONLYOFFICE config error:", error);
    return NextResponse.json(
      { error: "Failed to generate editor configuration" },
      { status: 500 }
    );
  }
}
