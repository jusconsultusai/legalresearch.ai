import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LEGAL_DB_ROOT = path.join(process.cwd(), "data", "legal-database");

/** Injected CSS to improve the look of served HTML files */
const INJECTED_STYLE = `
<style id="jusconsultus-viewer">
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 15px;
    line-height: 1.75;
    color: #374151;
    background: #ffffff;
    padding: 32px 48px 64px 48px;
    max-width: 860px;
  }
  /* Document header block */
  body > center:first-child, body > div.law-header, .intro-block {
    text-align: center;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e5e7eb;
  }
  /* Titles and headings */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Segoe UI', sans-serif;
    color: #111827;
    margin-top: 1.4em;
    margin-bottom: 0.5em;
    line-height: 1.35;
  }
  h1 { font-size: 1.35rem; font-weight: 700; text-transform: uppercase; text-align: center; letter-spacing: 0.02em; }
  h2 { font-size: 1.2rem; font-weight: 700; text-transform: uppercase; text-align: center; }
  h3 { font-size: 1.05rem; font-weight: 600; }
  /* Paragraphs and body text */
  p {
    margin: 0.75em 0;
    text-align: justify;
    hyphens: auto;
    color: #374151;
  }
  /* Section labels (SECTION 1., etc.) */
  p > b:first-child,
  p > strong:first-child {
    color: #111827;
    display: block;
    margin-bottom: 4px;
    font-weight: 700;
  }
  /* Indented subsections */
  blockquote, .subsection {
    margin: 10px 28px;
    color: #4b5563;
  }
  /* Tables */
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  td, th { padding: 6px 10px; vertical-align: top; border: 1px solid #e5e7eb; font-size: 0.95rem; }
  th { background: #f9fafb; font-weight: 600; color: #111827; }
  /* Links */
  a { color: #1d4ed8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  /* Horizontal rules */
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  /* Italic / emphasis */
  em, i { color: #4b5563; font-style: italic; }
  /* CENTER tags common in old Philippine legal docs */
  center { margin: 16px 0; }
  /* Hide nav bars from old e-library templates */
  td.bar, .navbar, table.bar, #nav, .topnav, .header-nav { display: none !important; }
  /* Text selection highlight color */
  ::selection { background: #bfdbfe; color: #1e3a8a; }
  /* Approval / signature block */
  .approval-info, p:last-child[align="right"] {
    text-align: right;
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    font-weight: 600;
    color: #111827;
  }
</style>
`;

/** Script injected for text selection → postMessage to parent */
const INJECTED_SCRIPT = `
<script id="jusconsultus-select">
(function() {
  var popup = null;
  function removePopup() { if (popup && popup.parentNode) { popup.parentNode.removeChild(popup); popup = null; } }
  document.addEventListener('mouseup', function(e) {
    removePopup();
    var sel = window.getSelection();
    if (!sel) return;
    var text = sel.toString().trim();
    if (text.length < 3) return;
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    // Create inline popup
    popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;z-index:9999;background:#1e293b;color:#fff;border-radius:8px;padding:6px 4px;display:flex;gap:4px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.35);font-family:Segoe UI,sans-serif;font-size:13px;';
    var left = Math.min(rect.left + rect.width/2 - 70, window.innerWidth - 180);
    var top = rect.top > 60 ? rect.top - 52 : rect.bottom + 8;
    popup.style.left = Math.max(8, left) + 'px';
    popup.style.top = top + 'px';
    var copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy';
    copyBtn.style.cssText = 'background:#334155;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600;';
    copyBtn.onmouseenter = function(){this.style.background='#475569';};
    copyBtn.onmouseleave = function(){this.style.background='#334155';};
    copyBtn.onclick = function(ev) { ev.stopPropagation(); navigator.clipboard && navigator.clipboard.writeText(text); window.parent.postMessage({type:'legal-copy',text:text},'*'); removePopup(); };
    var searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 Search Database';
    searchBtn.style.cssText = 'background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600;';
    searchBtn.onmouseenter = function(){this.style.background='#1d4ed8';};
    searchBtn.onmouseleave = function(){this.style.background='#2563eb';};
    searchBtn.onclick = function(ev) { ev.stopPropagation(); window.parent.postMessage({type:'legal-search',text:text},'*'); removePopup(); };
    popup.appendChild(copyBtn);
    popup.appendChild(searchBtn);
    document.body.appendChild(popup);
  });
  document.addEventListener('mousedown', function(e) { if (popup && !popup.contains(e.target)) removePopup(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') removePopup(); });
})();
<\/script>
`;

/** Remove tags that reference external scripts/images not relevant in viewer */
function sanitizeHtml(html: string): string {
  return html
    // Remove script tags entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Remove external stylesheet links (keep inline styles)
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "")
    // Remove robots meta (not needed)
    .replace(/<meta[^>]+robots[^>]*>/gi, "")
    // Remove the old body style block (we inject our own)
    .replace(/<style[^>]*>\s*body\s*\{[^}]*\}\s*<\/style>/gi, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";

  if (!relPath) {
    return new NextResponse("Missing path parameter", { status: 400 });
  }

  // Security: ensure path stays within LEGAL_DB_ROOT
  const absPath = path.resolve(LEGAL_DB_ROOT, relPath);
  if (!absPath.startsWith(LEGAL_DB_ROOT)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Only allow html files
  if (!/\.html?$/i.test(absPath)) {
    return new NextResponse("Only HTML files are served", { status: 400 });
  }

  let content: string;
  try {
    content = await fs.readFile(absPath, "utf-8");
  } catch {
    // Try latin1 (some older legal docs use windows-1252)
    try {
      const buf = await fs.readFile(absPath);
      content = buf.toString("latin1");
    } catch {
      return new NextResponse("File not found", { status: 404 });
    }
  }

  const sanitized = sanitizeHtml(content);

  // Inject our viewer styles right before </head> or at the top of the body
  let final: string;
  const injection = INJECTED_STYLE + INJECTED_SCRIPT;
  if (/<\/head>/i.test(sanitized)) {
    final = sanitized.replace(/<\/head>/i, `${injection}</head>`);
  } else if (/<head>/i.test(sanitized)) {
    final = sanitized.replace(/<head>/i, `<head>${injection}`);
  } else {
    // No head tags — wrap the whole thing
    final = `<!DOCTYPE html><html><head><meta charset="utf-8">${injection}</head><body>${sanitized}</body></html>`;
  }

  return new NextResponse(final, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
