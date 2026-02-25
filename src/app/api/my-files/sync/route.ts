import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/my-files/sync
 *
 * Syncs localStorage files (My Files) to the database (UserFile model)
 * so they can be referenced by the AI Chat and DeepSearch pipeline.
 *
 * Body: { files: [{ id, name, type, size, category, content }] }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { files } = await request.json();

  if (!Array.isArray(files)) {
    return NextResponse.json({ error: "files must be an array" }, { status: 400 });
  }

  try {
    let synced = 0;

    for (const file of files) {
      if (!file.name || !file.content) continue;

      // Truncate content to prevent DB overflow (max 5MB base64)
      const contentToStore = typeof file.content === "string"
        ? file.content.slice(0, 5 * 1024 * 1024)
        : "";

      await prisma.userFile.upsert({
        where: {
          // Use a composite key pattern via findFirst + create/update
          id: file.id || `local-${user.id}-${file.name.replace(/\s+/g, "-")}`,
        },
        update: {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size || contentToStore.length,
          category: file.category || "general",
          content: contentToStore,
          updatedAt: new Date(),
        },
        create: {
          id: file.id || `local-${user.id}-${file.name.replace(/\s+/g, "-")}`,
          userId: user.id,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size || contentToStore.length,
          category: file.category || "general",
          content: contentToStore,
        },
      });

      synced++;
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error("My Files sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

/**
 * GET /api/my-files/sync
 *
 * Returns the list of synced files for this user from the DB.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await prisma.userFile.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true, size: true, category: true, uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("My Files list error:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}
