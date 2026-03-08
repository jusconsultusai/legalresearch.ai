import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LEGAL_DB_ROOT = path.join(process.cwd(), "data", "legal-database");

/** Injected CSS to improve the look of served HTML files */
const INJECTED_STYLE = `
<style id="jusconsultus-viewer">
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --jus-base-font: 15px; }
  html, body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: var(--jus-base-font);
    line-height: 1.75;
    color: #374151;
    background: #ffffff;
    padding: 24px clamp(16px, 4vw, 48px) 64px clamp(16px, 4vw, 48px);
    max-width: 100%;
    width: 100%;
    overflow-x: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
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
  table { border-collapse: collapse; width: 100%; margin: 1em 0; overflow-x: auto; display: block; }
  td, th { padding: 6px 10px; vertical-align: top; border: 1px solid #e5e7eb; font-size: 0.95rem; word-break: break-word; }
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
  /* ── Footnote / citation styles ── */
  nt { display: none; } /* hide raw <nt> tags until JS converts them */
  a.jus-fn, a.nt { color: #1d4ed8; text-decoration: none; cursor: pointer; font-size: inherit; }
  a.jus-fn:hover, a.nt:hover { text-decoration: underline; color: #1e40af; }
  a.jus-fn sup, a.nt sup, a.jus-fn, a.nt {
    vertical-align: super;
    font-size: 0.65em;
    line-height: 0;
    font-weight: 700;
    padding: 0 1px;
    position: relative;
    top: -0.4em;
  }
  /* Reset positioning for the anchor itself when it wraps a <sup> */
  a.jus-fn:has(sup), a.nt:has(sup) {
    vertical-align: baseline;
    font-size: inherit;
    top: 0;
    position: static;
  }
  a.jus-fn sup, a.nt sup {
    vertical-align: super;
    font-size: 0.65em;
    line-height: 0;
    font-weight: 700;
    padding: 0 2px;
    position: relative;
    top: -0.3em;
  }
  /* Footnote section styling */
  .jus-footnotes-section { border-top: 1px solid #d1d5db; margin-top: 2em; padding-top: 1em; }
  .jus-footnotes-section p { font-size: 0.92em; line-height: 1.6; color: #4b5563; }
  .jus-footnotes-section a.jus-fn, .jus-footnotes-section a.nt,
  .jus-footnotes-section a.jus-fn sup, .jus-footnotes-section a.nt sup {
    font-size: 0.75em; top: -0.2em;
  }
  /* Smooth scroll target highlight */
  :target { animation: jus-target-flash 1.5s ease; }
  @keyframes jus-target-flash { 0%,30% { background: #fef08a; } 100% { background: transparent; } }
  /* Cross-reference links */
  a.jus-xref { color: #2563eb; text-decoration: none; border-bottom: 1px dashed #93c5fd; }
  a.jus-xref:hover { color: #1d4ed8; border-bottom-style: solid; }
</style>
`;

/** Script injected for text selection + highlight from ?highlight= URL param */
const INJECTED_SCRIPT = `
<script id="jusconsultus-select">
(function() {
  /* ── Highlight relevant passages from ?highlight= URL param ── */
  (function highlightPassages() {
    var params = new URLSearchParams(location.search);
    var raw = params.get('highlight') || '';
    if (!raw.trim()) return;
    var STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','was','are','were','be','been','being','it','its','this','that','which','who','whom','how','when','where','what','why','not','no','have','has','had','do','does','did','will','shall','may','can','could','would','should','must','upon','any','all','each','every','such','under','over','after','before','between','through','without','within','their','they','them','these','those','also','into','about','more','than','then','there','here','so','if','even','only','both','just','its','his','her','our','your','said','been']);
    var terms = raw.split(/[\s,;.!?()\/\[\]{}"+&*<>\\]+/)
      .map(function(t){ return t.toLowerCase().replace(/[^a-z0-9]/g,''); })
      .filter(function(t){ return t.length >= 4 && !STOP.has(t); })
      .filter(function(t,i,a){ return a.indexOf(t)===i; })
      .slice(0, 20);
    if (terms.length === 0) return;
    var escaped = terms.map(function(t){ return t; }); // terms are already stripped to [a-z0-9], no regex escaping needed
    var pattern = new RegExp('('+escaped.join('|')+')', 'gi');
    /* Walk text nodes, skip scripts/styles/existing marks */
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName.toUpperCase();
        if (tag==='SCRIPT'||tag==='STYLE'||tag==='MARK'||tag==='NOSCRIPT'||tag==='TEXTAREA') return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(tn){
      if (!pattern.test(tn.nodeValue)) return;
      pattern.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0;
      var text = tn.nodeValue;
      var m;
      while ((m = pattern.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var mk = document.createElement('mark');
        mk.className = 'jus-hl';
        mk.textContent = m[0];
        frag.appendChild(mk);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if (frag.childNodes.length > 0) tn.parentNode.replaceChild(frag, tn);
    });
    var marks = Array.from(document.querySelectorAll('mark.jus-hl'));
    if (marks.length === 0) return;
    /* Styles */
    var s = document.createElement('style');
    s.textContent = 'mark.jus-hl{background:#fef08a;color:#713f12;border-radius:3px;padding:1px 3px;font-style:normal;}mark.jus-hl.jus-current{background:#f97316;color:#fff;outline:2px solid #ea580c;border-radius:3px;}';
    document.head.appendChild(s);
    /* Badge */
    var cur = 0;
    marks[0].classList.add('jus-current');
    setTimeout(function(){ marks[0].scrollIntoView({behavior:'smooth',block:'center'}); }, 300);
    var badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#1e40af;color:#fff;border-radius:12px;padding:6px 10px;display:flex;align-items:center;gap:6px;font-family:Segoe UI,sans-serif;font-size:12px;font-weight:700;box-shadow:0 4px 24px rgba(0,0,0,0.35);user-select:none;';
    var lbl = document.createElement('span');
    lbl.id='jus-hl-lbl';
    lbl.textContent = '🔍 1 / '+marks.length+' matches';
    function goTo(idx){
      marks[cur].classList.remove('jus-current');
      cur = ((idx % marks.length) + marks.length) % marks.length;
      marks[cur].classList.add('jus-current');
      marks[cur].scrollIntoView({behavior:'smooth',block:'center'});
      lbl.textContent = '🔍 '+(cur+1)+' / '+marks.length+' matches';
    }
    function mkBtn(txt, fn){
      var b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1;padding:0;flex-shrink:0;';
      b.onmouseenter=function(){this.style.background='rgba(255,255,255,0.35)';};
      b.onmouseleave=function(){this.style.background='rgba(255,255,255,0.2)';};
      b.onclick=fn;
      return b;
    }
    var prev = mkBtn('↑', function(){ goTo(cur-1); });
    var next = mkBtn('↓', function(){ goTo(cur+1); });
    var close = mkBtn('✕', function(){ badge.remove(); marks.forEach(function(m){ var t=document.createTextNode(m.textContent); m.parentNode.replaceChild(t,m); }); });
    badge.appendChild(lbl);
    badge.appendChild(prev);
    badge.appendChild(next);
    badge.appendChild(close);
    document.body.appendChild(badge);
    /* Listen for postMessage highlight updates (e.g. chat panel changes source) */
    window.addEventListener('message', function(ev){
      if (!ev.data || ev.data.type !== 'jus-highlight') return;
      badge.remove();
      document.querySelectorAll('mark.jus-hl').forEach(function(m){
        var t = document.createTextNode(m.textContent);
        m.parentNode.replaceChild(t, m);
      });
    });
  })();

  /* ── Text selection popup ── */
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
    copyBtn.onclick = function(ev) { ev.stopPropagation(); navigator.clipboard && navigator.clipboard.writeText(text); window.parent.postMessage({type:'legal-copy',text:text},window.location.origin); removePopup(); };
    var searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 Search Database';
    searchBtn.style.cssText = 'background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600;';
    searchBtn.onmouseenter = function(){this.style.background='#1d4ed8';};
    searchBtn.onmouseleave = function(){this.style.background='#2563eb';};
    searchBtn.onclick = function(ev) { ev.stopPropagation(); window.parent.postMessage({type:'legal-search',text:text},window.location.origin); removePopup(); };
    popup.appendChild(copyBtn);
    popup.appendChild(searchBtn);
    document.body.appendChild(popup);
  });
  document.addEventListener('mousedown', function(e) { if (popup && !popup.contains(e.target)) removePopup(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') removePopup(); });

  /* ── Zoom / font-size via postMessage ── */
  window.addEventListener('message', function(ev) {
    if (!ev.data || ev.data.type !== 'jus-zoom') return;
    var level = parseFloat(ev.data.zoom);
    if (isNaN(level) || level < 50 || level > 200) return;
    document.documentElement.style.setProperty('--jus-base-font', (15 * level / 100) + 'px');
  });

  /* ── Footnote/Citation Linking ── */
  (function linkFootnotes() {
    var ntTags = document.querySelectorAll('nt');
    if (ntTags.length === 0) return;

    /* Find the "Footnotes" header to split body citations from footnote entries */
    var fnHeader = null;
    var allPs = document.querySelectorAll('p');
    for (var i = 0; i < allPs.length; i++) {
      var txt = allPs[i].textContent.trim();
      if (/^Footnotes?:?\s*$/i.test(txt)) { fnHeader = allPs[i]; break; }
    }

    /* Determine which <nt> tags are in the footnotes section vs body */
    var bodyNts = [];
    var footNts = [];

    if (fnHeader) {
      /* Mark footnotes section for styling */
      var fnSection = fnHeader.parentElement;
      if (fnSection && fnSection.tagName !== 'BODY') {
        fnSection.classList.add('jus-footnotes-section');
      } else {
        fnHeader.classList.add('jus-footnotes-section');
      }

      var fnHeaderRect = fnHeader.getBoundingClientRect();
      for (var j = 0; j < ntTags.length; j++) {
        var ntRect = ntTags[j].getBoundingClientRect();
        if (ntRect.top >= fnHeaderRect.top) {
          footNts.push(ntTags[j]);
        } else {
          bodyNts.push(ntTags[j]);
        }
      }
    } else {
      /* No explicit Footnotes header — try heuristic: <nt> inside <p class="jn"> or <dir> at end */
      for (var k = 0; k < ntTags.length; k++) {
        var par = ntTags[k].closest('p');
        if (par && (par.classList.contains('jn') || par.parentElement && par.parentElement.tagName === 'DIR')) {
          /* Check if this <nt> is the first child (i.e., starts a footnote line) */
          var prevSib = ntTags[k].previousSibling;
          var isFirst = !prevSib || (prevSib.nodeType === 3 && !prevSib.textContent.trim());
          if (isFirst) {
            footNts.push(ntTags[k]);
            continue;
          }
        }
        bodyNts.push(ntTags[k]);
      }
    }

    /* Build footnote number set for validation */
    var footNumSet = {};
    footNts.forEach(function(nt) {
      var num = nt.textContent.trim();
      if (/^\d+$/.test(num)) footNumSet[num] = true;
    });

    /* Convert body <nt> to clickable superscript links */
    bodyNts.forEach(function(nt) {
      var num = nt.textContent.trim();
      if (!/^\d+$/.test(num)) return;
      var anchor = document.createElement('a');
      anchor.className = 'jus-fn';
      anchor.href = '#jus-fnt' + num;
      anchor.id = 'jus-rnt' + num;
      anchor.title = 'Go to footnote ' + num;
      var sup = document.createElement('sup');
      sup.textContent = num;
      anchor.appendChild(sup);
      nt.parentNode.replaceChild(anchor, nt);
    });

    /* Convert footnote <nt> to anchor targets with back-links */
    footNts.forEach(function(nt) {
      var num = nt.textContent.trim();
      if (!/^\d+$/.test(num)) return;
      var anchor = document.createElement('a');
      anchor.className = 'jus-fn';
      anchor.href = '#jus-rnt' + num;
      anchor.id = 'jus-fnt' + num;
      anchor.title = 'Back to text';
      var sup = document.createElement('sup');
      sup.textContent = num;
      anchor.appendChild(sup);
      nt.parentNode.replaceChild(anchor, nt);
    });

    /* Also fix old-style <a class="nt"> that lack <sup> wrapping */
    var oldAnchors = document.querySelectorAll('a.nt');
    oldAnchors.forEach(function(a) {
      if (a.querySelector('sup')) return; /* already has sup */
      var text = a.textContent.trim();
      if (!/^\d+$/.test(text)) return;
      a.innerHTML = '';
      var sup = document.createElement('sup');
      sup.textContent = text;
      a.appendChild(sup);
      a.classList.add('jus-fn');
    });

    /* Smooth scroll for anchor clicks */
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a.jus-fn, a.nt');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var target = document.getElementById(href.slice(1)) || document.querySelector('[name="' + href.slice(1) + '"]');
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        /* Flash effect */
        target.style.transition = 'background 0.3s';
        target.style.background = '#fef08a';
        var par = target.closest('p') || target.parentElement;
        if (par) { par.style.transition = 'background 0.3s'; par.style.background = '#fef9c3'; }
        setTimeout(function() {
          target.style.background = '';
          if (par) par.style.background = '';
        }, 2000);
      }
    });
  })();

  /* ── Cross-Referencing: Link legal document identifiers ── */
  (function crossReference() {
    /* Patterns for Philippine legal document identifiers */
    var patterns = [
      { re: /\b(G\.?\s*R\.?\s*(?:No(?:s)?\.?\s*)?(?:L-?)?\d[\d\-,\s&andNo.]*)/gi, type: 'gr' },
      { re: /\b(A\.?\s*C\.?\s*No\.?\s*\d[\d\-]*)/gi, type: 'ac' },
      { re: /\b(A\.?\s*M\.?\s*No\.?\s*[\w\d][\d\-\.]*)/gi, type: 'am' },
      { re: /\b(Republic\s+Act\s+(?:No\.?\s*)?\d[\d\-]*)/gi, type: 'ra' },
      { re: /\b(R\.?\s*A\.?\s*(?:No\.?\s*)?\d{2,})/gi, type: 'ra' },
      { re: /\b(Executive\s+Order\s+(?:No\.?\s*)?\d[\d\-]*)/gi, type: 'eo' },
      { re: /\b(E\.?\s*O\.?\s*(?:No\.?\s*)?\d{2,})/gi, type: 'eo' },
      { re: /\b(Presidential\s+Decree\s+(?:No\.?\s*)?\d[\d\-]*)/gi, type: 'pd' },
      { re: /\b(P\.?\s*D\.?\s*(?:No\.?\s*)?\d{2,})/gi, type: 'pd' },
      { re: /\b(Batas\s+Pambansa\s+(?:Blg\.?\s*|No\.?\s*)?\d[\d\-]*)/gi, type: 'bp' },
      { re: /\b(B\.?\s*P\.?\s*(?:Blg\.?\s*|No\.?\s*)?\d{2,})/gi, type: 'bp' },
      { re: /\b(Commonwealth\s+Act\s+(?:No\.?\s*)?\d[\d\-]*)/gi, type: 'ca' },
      { re: /\b(Administrative\s+Order\s+(?:No\.?\s*)?\d[\d\-]*)/gi, type: 'ao' }
    ];

    /* Walk text nodes in body, skip already-linked text and scripts */
    function walkAndLink() {
      patterns.forEach(function(pat) {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: function(node) {
            var p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            var tag = p.tagName.toUpperCase();
            if (tag==='SCRIPT'||tag==='STYLE'||tag==='A'||tag==='MARK'||tag==='NOSCRIPT'||tag==='TEXTAREA'||tag==='SUP') return NodeFilter.FILTER_REJECT;
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        var textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(function(tn) {
          pat.re.lastIndex = 0;
          if (!pat.re.test(tn.nodeValue)) return;
          pat.re.lastIndex = 0;
          var frag = document.createDocumentFragment();
          var last = 0;
          var text = tn.nodeValue;
          var m;
          while ((m = pat.re.exec(text)) !== null) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            var a = document.createElement('a');
            a.className = 'jus-xref';
            a.textContent = m[1];
            a.title = 'Search: ' + m[1];
            a.href = '#';
            a.setAttribute('data-xref', m[1]);
            a.onclick = function(ev) {
              ev.preventDefault();
              window.parent.postMessage({ type: 'legal-search', text: this.getAttribute('data-xref') }, window.location.origin);
            };
            frag.appendChild(a);
            last = m.index + m[0].length;
          }
          if (last === 0) return; /* no actual matches in this pass */
          if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
          if (frag.childNodes.length > 0 && tn.parentNode) tn.parentNode.replaceChild(frag, tn);
        });
      });
    }
    walkAndLink();
  })();
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

  // Only allow html and pdf files
  if (!/\.(html?|pdf)$/i.test(absPath)) {
    return new NextResponse("Only HTML and PDF files are served", { status: 400 });
  }

  // Serve PDF files directly
  if (/\.pdf$/i.test(absPath)) {
    let pdfBuf: Buffer;
    try {
      pdfBuf = await fs.readFile(absPath);
    } catch {
      return new NextResponse("File not found", { status: 404 });
    }
    return new NextResponse(pdfBuf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "public, max-age=3600",
      },
    });
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
