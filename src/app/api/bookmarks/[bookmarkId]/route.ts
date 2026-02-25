import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bookmarkId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookmarkId } = await params;
    await prisma.bookmark.deleteMany({
      where: { id: bookmarkId, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bookmark DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
  }
}
