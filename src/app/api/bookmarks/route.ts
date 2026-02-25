import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error("Bookmarks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, notes, category, documentRef } = body;

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const bookmark = await prisma.bookmark.create({
      data: {
        title,
        notes: notes || null,
        category: category || "jurisprudence",
        documentRef: documentRef || "",
        userId: user.id,
      },
    });

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error("Bookmarks POST error:", error);
    return NextResponse.json({ error: "Failed to create bookmark" }, { status: 500 });
  }
}
