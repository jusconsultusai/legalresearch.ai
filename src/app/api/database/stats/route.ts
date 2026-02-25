import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Return available years for a specific subcategory
    if (type === "years") {
      const category = searchParams.get("category");
      const subcategory = searchParams.get("subcategory");
      if (!category || !subcategory) {
        return NextResponse.json({ years: [] });
      }
      // Use raw SQL to get distinct years from date column (SQLite strftime)
      const rows = await prisma.$queryRawUnsafe<{ year: string }[]>(
        `SELECT DISTINCT strftime('%Y', date) as year
         FROM legal_documents
         WHERE category = ? AND subcategory = ? AND date IS NOT NULL
         ORDER BY year DESC`,
        category,
        subcategory
      );
      return NextResponse.json({ years: rows.map((r) => r.year).filter(Boolean) });
    }

    // Default: return category/subcategory counts for the database overview
    const categories = await prisma.legalDocument.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const subcategories = await prisma.legalDocument.groupBy({
      by: ["category", "subcategory"],
      _count: { id: true },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      subcategories: subcategories.map((s) => ({
        category: s.category,
        subcategory: s.subcategory,
        count: s._count.id,
      })),
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
