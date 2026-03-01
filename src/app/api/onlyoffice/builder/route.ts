// /api/onlyoffice/builder/route.ts
// ONLYOFFICE Document Builder API endpoint
// Generates documents using Document Builder scripts
// See: https://api.onlyoffice.com/docs/document-builder/builder-framework/

import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { htmlToDocxBuffer } from "@/lib/docspace";

/**
 * Generate a Document Builder script for creating documents
 * This uses the CDocBuilder API to programmatically create documents:
 * https://api.onlyoffice.com/docs/document-builder/builder-framework/Java/CDocBuilder/
 */
function generateBuilderScript(options: {
  templateId?: string;
  title?: string;
  content?: string;
  outputType?: string;
  data?: Record<string, any>;
}): string {
  const { templateId, title = "Document", content = "", outputType = "docx", data = {} } = options;

  // Escape content for safe embedding in script
  const escapedContent = content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");

  const escapedTitle = title.replace(/"/g, '\\"');

  // Template-specific scripts using CDocBuilder API
  switch (templateId) {
    case "legal-pleading":
      return `
builder.CreateFile("${outputType}");
var oDocument = Api.GetDocument();
var oStyle = oDocument.GetStyle("Heading 1");

// Title
var oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("REPUBLIC OF THE PHILIPPINES");
oParagraph.SetBold(true);
oParagraph.SetFontSize(28);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("${data.court || "REGIONAL TRIAL COURT"}");
oParagraph.SetBold(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("${data.branch || "Branch ___"}");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

// Spacing
oParagraph = Api.CreateParagraph();
oDocument.Push(oParagraph);

// Case caption
oParagraph = Api.CreateParagraph();
oParagraph.AddText("${data.plaintiff || "[PLAINTIFF NAME]"},");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("— versus —");
oParagraph.SetItalic(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("${data.defendant || "[DEFENDANT NAME]"},");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

// Case number
oParagraph = Api.CreateParagraph();
oParagraph.SetJc("right");
oParagraph.AddText("${data.caseNumber || "Civil Case No. ___"}");
oParagraph.SetBold(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

// Divider
oParagraph = Api.CreateParagraph();
oParagraph.AddText("x - - - - - - - - - - - - - - - - - - - - - - - - - - - - - x");
oParagraph.SetJc("center");
oDocument.Push(oParagraph);

// Document title
oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("${escapedTitle}");
oParagraph.SetBold(true);
oParagraph.SetFontSize(28);
oDocument.Push(oParagraph);

// Content
${content ? `
oParagraph = Api.CreateParagraph();
oParagraph.AddText("${escapedContent}");
oParagraph.SetFontSize(24);
oParagraph.SetSpacingAfter(200);
oDocument.Push(oParagraph);
` : `
oParagraph = Api.CreateParagraph();
oParagraph.AddText("[Body of the pleading]");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);
`}

// Prayer
oParagraph = Api.CreateParagraph();
oParagraph.AddText("PRAYER");
oParagraph.SetJc("center");
oParagraph.SetBold(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("WHEREFORE, premises considered, it is respectfully prayed that this Honorable Court:");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

// Signature block
oParagraph = Api.CreateParagraph();
oDocument.Push(oParagraph);
oParagraph = Api.CreateParagraph();
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.SetJc("right");
oParagraph.AddText("Respectfully submitted,");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.SetJc("right");
oParagraph.AddText("${data.counsel || "[COUNSEL NAME]"}");
oParagraph.SetBold(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

builder.SaveFile("${outputType}", "${escapedTitle}.${outputType}");
builder.CloseFile();`;

    case "contract":
      return `
builder.CreateFile("${outputType}");
var oDocument = Api.GetDocument();

var oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("${escapedTitle}");
oParagraph.SetBold(true);
oParagraph.SetFontSize(32);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("KNOW ALL MEN BY THESE PRESENTS:");
oParagraph.SetBold(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("This ${escapedTitle} is entered into this ${data.date || "_____ day of __________, 20__"}, by and between:");
oParagraph.SetFontSize(24);
oParagraph.SetSpacingAfter(200);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("${data.party1 || "[FIRST PARTY]"} (hereinafter referred to as the \\"First Party\\")");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.SetJc("center");
oParagraph.AddText("— and —");
oParagraph.SetItalic(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("${data.party2 || "[SECOND PARTY]"} (hereinafter referred to as the \\"Second Party\\")");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

${content ? `
oParagraph = Api.CreateParagraph();
oParagraph.AddText("${escapedContent}");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);
` : `
// Recitals
oParagraph = Api.CreateParagraph();
oParagraph.AddText("WITNESSETH: That —");
oParagraph.SetBold(true);
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("WHEREAS, [recitals];");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

oParagraph = Api.CreateParagraph();
oParagraph.AddText("NOW, THEREFORE, for and in consideration of the foregoing premises and the mutual covenants herein contained, the parties agree as follows:");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);
`}

// Signature
oParagraph = Api.CreateParagraph();
oDocument.Push(oParagraph);
oParagraph = Api.CreateParagraph();
oParagraph.AddText("IN WITNESS WHEREOF, the parties have hereunto set their hands this _____ day of __________, 20__, at ___________, Philippines.");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);

builder.SaveFile("${outputType}", "${escapedTitle}.${outputType}");
builder.CloseFile();`;

    case "export-pdf":
      return `
builder.CreateFile("docx");
var oDocument = Api.GetDocument();
${content ? `
var oParagraph = Api.CreateParagraph();
oParagraph.AddText("${escapedContent}");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);
` : ""}
builder.SaveFile("pdf", "${escapedTitle}.pdf");
builder.CloseFile();`;

    case "blank-document":
    default:
      return `
builder.CreateFile("${outputType}");
var oDocument = Api.GetDocument();

${content ? `
var oParagraph = Api.CreateParagraph();
oParagraph.AddText("${escapedContent}");
oParagraph.SetFontSize(24);
oDocument.Push(oParagraph);
` : `
var oParagraph = Api.CreateParagraph();
oParagraph.AddText("${escapedTitle}");
oParagraph.SetBold(true);
oParagraph.SetFontSize(28);
oParagraph.SetJc("center");
oDocument.Push(oParagraph);
`}

builder.SaveFile("${outputType}", "${escapedTitle}.${outputType}");
builder.CloseFile();`;
  }
}

// ─── HTML template generators (used by the DocSpace / html-to-docx primary path) ────

function generateTemplateHtml(options: {
  templateId?: string;
  title?: string;
  content?: string;
  data?: Record<string, any>;
}): string {
  const { templateId, title = "Document", content = "", data = {} } = options;

  switch (templateId) {
    case "legal-pleading":
      return `
<div style="font-family: 'Times New Roman', serif; font-size: 12pt; margin: 1in;">
  <p style="text-align:center; font-weight:bold; font-size:14pt;">REPUBLIC OF THE PHILIPPINES</p>
  <p style="text-align:center; font-weight:bold;">${data.court || "REGIONAL TRIAL COURT"}</p>
  <p style="text-align:center;">${data.branch || "Branch ___"}</p>
  <br/>
  <p>${data.plaintiff || "[PLAINTIFF NAME]"},</p>
  <p style="text-align:center; font-style:italic;">— versus —</p>
  <p>${data.defendant || "[DEFENDANT NAME]"},</p>
  <p style="text-align:right; font-weight:bold;">${data.caseNumber || "Civil Case No. ___"}</p>
  <p style="text-align:center;">x - - - - - - - - - - - - - - - x</p>
  <p style="text-align:center; font-weight:bold; font-size:14pt;">${title}</p>
  <br/>
  ${content ? `<p>${content.replace(/\n/g, "</p><p>")}</p>` : "<p>[Body of the pleading]</p>"}
  <br/>
  <p style="font-weight:bold; text-align:center;">PRAYER</p>
  <p>WHEREFORE, premises considered, it is respectfully prayed that this Honorable Court:</p>
  <br/><br/>
  <p style="text-align:right;">Respectfully submitted,</p>
  <p style="text-align:right; font-weight:bold;">${data.counsel || "[COUNSEL NAME]"}</p>
</div>`;

    case "contract":
      return `
<div style="font-family: 'Times New Roman', serif; font-size: 12pt; margin: 1in;">
  <p style="text-align:center; font-weight:bold; font-size:16pt;">${title}</p>
  <br/>
  <p><strong>KNOW ALL MEN BY THESE PRESENTS:</strong></p>
  <p>This ${title} is entered into this ${data.date || "_____ day of __________, 20__"}, by and between:</p>
  <p>${data.party1 || "[FIRST PARTY]"} (hereinafter referred to as the &quot;First Party&quot;)</p>
  <p style="text-align:center; font-style:italic;">— and —</p>
  <p>${data.party2 || "[SECOND PARTY]"} (hereinafter referred to as the &quot;Second Party&quot;)</p>
  <br/>
  ${content
    ? `<p>${content.replace(/\n/g, "</p><p>")}</p>`
    : `<p><strong>WITNESSETH: That —</strong></p>
       <p>WHEREAS, [recitals];</p>
       <p>NOW, THEREFORE, for and in consideration of the foregoing premises and the mutual covenants herein contained, the parties agree as follows:</p>`}
  <br/>
  <p>IN WITNESS WHEREOF, the parties have hereunto set their hands this _____ day of __________, 20__, at ___________, Philippines.</p>
</div>`;

    case "export-pdf":
    case "blank-document":
    default:
      return `
<div style="font-family: 'Times New Roman', serif; font-size: 12pt; margin: 1in;">
  <p style="text-align:center; font-weight:bold; font-size:14pt;">${title}</p>
  <br/>
  ${content ? `<p>${content.replace(/\n/g, "</p><p>")}</p>` : "<p></p>"}
</div>`;
  }
}

/**
 * POST /api/onlyoffice/builder
 * Generate a document using DocSpace (primary) or Docker Document Server (fallback).
 *
 * Priority order:
 *  1. DocSpace — convert HTML → DOCX via html-to-docx (no Docker required, always available)
 *  2. Docker Document Builder — POST /docbuilder with a .docbuilder script URL
 *  3. Minimal OOXML fallback
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      templateId,
      outputType = "docx",
      data = {},
      documentId,
      builderScript: customScript,
    } = body;

    // Fetch document content from DB if documentId provided
    let title = data.title || "Document";
    let rawHtml = "";
    let plainContent = "";

    if (documentId) {
      const document = await prisma.document.findFirst({
        where: { id: documentId, userId: user.id },
      });
      if (document) {
        title = document.title || title;
        rawHtml = document.content || "";
        plainContent = rawHtml.replace(/<[^>]*>/g, "");
      }
    }

    const contentTypeMap: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      pdf: "application/pdf",
      odt: "application/vnd.oasis.opendocument.text",
    };

    // ── 1. PRIMARY: DocSpace html-to-docx ─────────────────────────────────────
    // Works without Docker. Converts an HTML template (or raw document HTML) to
    // a properly-formatted .docx buffer and returns it for download.
    if (!customScript && outputType === "docx") {
      try {
        // If we have the real HTML from the DB, use it directly;
        // otherwise generate a template-specific HTML structure.
        const htmlSource = rawHtml.trim()
          ? rawHtml
          : generateTemplateHtml({ templateId, title, content: plainContent, data });

        const docxBuf = await htmlToDocxBuffer(htmlSource, title);

        return new NextResponse(docxBuf, {
          status: 200,
          headers: {
            "Content-Type": contentTypeMap.docx,
            "Content-Disposition": `attachment; filename="${title}.docx"`,
            "X-Generator": "docspace",
          },
        });
      } catch (docspaceErr) {
        console.warn("[builder] DocSpace html-to-docx failed, falling back to Docker:", docspaceErr);
      }
    }

    // ── 2. FALLBACK: Docker Document Server /docbuilder ───────────────────────
    const builderUrl = process.env.ONLYOFFICE_BUILDER_URL || process.env.ONLYOFFICE_SERVER_URL || "http://localhost:8000";
    const hostUrl = process.env.ONLYOFFICE_HOST_URL || "http://host.docker.internal:3000";

    const script = customScript || generateBuilderScript({
      templateId,
      title,
      content: plainContent,
      outputType,
      data,
    });

    const scriptId = randomUUID();
    const scriptFilename = `builder-${scriptId}.docbuilder`;
    const tempDir = path.join(process.cwd(), "public", "temp");
    const scriptPath = path.join(tempDir, scriptFilename);
    const scriptUrl = `${hostUrl}/temp/${scriptFilename}`;

    try {
      await mkdir(tempDir, { recursive: true });
      await writeFile(scriptPath, script, "utf-8");

      const response = await fetch(`${builderUrl}/docbuilder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ async: false, url: scriptUrl }),
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.urls) {
          const fileUrl = Object.values(result.urls)[0] as string;
          const fileRes = await fetch(fileUrl);
          if (fileRes.ok) {
            const arrayBuffer = await fileRes.arrayBuffer();
            return new NextResponse(arrayBuffer, {
              status: 200,
              headers: {
                "Content-Type": contentTypeMap[outputType] || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${title}.${outputType}"`,
                "X-Generator": "docker-builder",
              },
            });
          }
        }
      }
    } catch (dockerErr) {
      console.warn("[builder] Docker docbuilder failed, using minimal DOCX fallback:", dockerErr);
    } finally {
      unlink(scriptPath).catch(() => {});
    }

    // ── 3. LAST RESORT: minimal OOXML ─────────────────────────────────────────
    const strippedContent = plainContent || title;
    const docxml = generateMinimalDocx(title, strippedContent);

    return new NextResponse(Buffer.from(docxml, "utf-8"), {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[outputType] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${title}.${outputType}"`,
        "X-Generator": "minimal-fallback",
      },
    });
  } catch (error) {
    console.error("Document Builder error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}

/**
 * Generate a minimal valid DOCX XML (fallback when Document Builder is unavailable)
 */
function generateMinimalDocx(title: string, content: string): string {
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Split content into paragraphs
  const paragraphs = escapedContent
    .split(/\n/)
    .filter(Boolean)
    .map(
      (p) => `
    <w:p>
      <w:pPr><w:rPr><w:sz w:val="24"/></w:rPr></w:pPr>
      <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${p}</w:t></w:r>
    </w:p>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:mv="urn:schemas-microsoft-com:mac:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
        <w:t>${escapedTitle}</w:t>
      </w:r>
    </w:p>
    <w:p/>
    ${paragraphs}
  </w:body>
</w:document>`;
}
