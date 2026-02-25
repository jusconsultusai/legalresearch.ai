import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const search = searchParams.get("search");
    const year = searchParams.get("year");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (year && year !== "all") {
      where.date = {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`),
      };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { number: { contains: search } },
        { fullText: { contains: search } },
        { summary: { contains: search } },
      ];
    }

    const orderBy: Record<string, string> = {};
    if (sortBy === "date") orderBy.date = sortOrder;
    else if (sortBy === "title") orderBy.title = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [documents, total] = await Promise.all([
      prisma.legalDocument.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          category: true,
          subcategory: true,
          title: true,
          number: true,
          date: true,
          summary: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.legalDocument.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Database API error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

// Get document by ID
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const document = await prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Database document fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
