import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { html, title, format } = await req.json();

    if (!html || !format) {
      return NextResponse.json({ error: "Missing html or format" }, { status: 400 });
    }

    if (format === "docx") {
      // Dynamic import to avoid bundling issues
      const HTMLtoDOCX = (await import("html-to-docx")).default;

      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || "Document"}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 14pt;
      line-height: 1.5;
    }
    h1, h2, h3 { font-family: Arial, sans-serif; }
    blockquote {
      border-left: 3px solid #6366f1;
      padding-left: 12px;
      color: #4b5563;
      font-style: italic;
    }
  </style>
</head>
<body>${html}</body>
</html>`;

      const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: "Arial",
        fontSize: 28, // half-points: 28 = 14pt
        margins: {
          top: 1728,   // 1.2 inches in twips (1 inch = 1440 twips)
          bottom: 1440, // 1 inch
          left: 2160,   // 1.5 inches
          right: 1440,  // 1 inch
        },
        title: title || "Document",
      });

      const buffer = Buffer.from(docxBuffer);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${(title || "document").replace(/"/g, "'")}.docx"`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}
