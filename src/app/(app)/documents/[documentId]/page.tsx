"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Save,
  Download,
  Sparkles,
  FileText,
  Settings,
  Share2,
  Clock,
  Check,
  AlertCircle,
  X,
  Search,
  BookOpen,
  Scale,
  FolderOpen,
  GitCompare,
  Tag,
  Lightbulb,
  ChevronRight,
  ExternalLink,
  Zap,
  RotateCcw,
  Copy,
  Eye,
  EyeOff,
  Info,
  Upload,
  Brain,
  Loader2,
  FileScan,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Tabs, Skeleton } from "@/components/ui";
import { useLocalStorage } from "@/hooks";
import AIDraftingModal, { GenerationParams } from "@/components/ui/AIDraftingModal";
import OnlyOfficeDocBuilderButton from "@/components/OnlyOfficeDocBuilderButton";
import DocumentAnalysisModal from "@/components/document/DocumentAnalysisModal";

const OnlyOfficeEditor = dynamic(() => import("@/components/editor/OnlyOfficeEditor"), { ssr: false, loading: () => (
  <div className="flex-1 bg-surface flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  </div>
)});

const PaginatedEditor = dynamic(() => import("@/components/document/PaginatedEditor"), { ssr: false });

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
}

type SaveState = "saved" | "saving" | "unsaved" | "error";
type SidePanel = "ai" | "analysis" | "research" | "precedent" | "metadata" | null;

interface MyFile {
  id: string;
  name: string;
  category: string;
  content: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docType = searchParams.get("type");
  const mode = searchParams.get("mode");

  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // cached content from ONLYOFFICE editor (for analysis/download)
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [loading, setLoading] = useState(true);
  const [showAiModal, setShowAiModal] = useState(mode === "ai");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [editorFallback, setEditorFallback] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Side panel state
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [showRedlines, setShowRedlines] = useState(false);
  const [originalContent, setOriginalContent] = useState("");

  // AI state
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiReviewContent, setAiReviewContent] = useState<string | null>(null);

  // Document version — increment to force ONLYOFFICE to reload with new content
  const [documentVersion, setDocumentVersion] = useState(1);

  // Empty‑document warning dialog ("improve" | "review" | null)
  const [emptyDocWarning, setEmptyDocWarning] = useState<"improve" | "review" | null>(null);

  // Document Analysis Modal
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" | "info" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<{
    wordCount: number;
    charCount: number;
    readingTime: string;
    clarity: number;
    legalTerms: string[];
    citations: string[];
    riskAreas: string[];
  } | null>(null);

  // Research state
  const [researchQuery, setResearchQuery] = useState("");
  const [researchResults, setResearchResults] = useState<{ title: string; number: string; summary: string }[]>([]);
  const [researching, setResearching] = useState(false);

  // Precedent library (from My Files)
  const [myFiles] = useLocalStorage<MyFile[]>("jusconsultus-my-files", []);

  useEffect(() => {
    fetchDocument();
  }, [params.documentId]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/documents/${params.documentId}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
        setTitle(data.document.title);
        setContent(data.document.content);
        setOriginalContent(data.document.content);
      } else {
        router.push("/documents");
      }
    } catch {
      router.push("/documents");
    } finally {
      setLoading(false);
    }
  };

  const autoSave = useCallback(
    async (newTitle: string) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/documents/${params.documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    },
    [params.documentId]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(newTitle), 1500);
  };

  // Called by OnlyOfficeEditor when content is synced back from the editor
  const handleContentSync = useCallback((html: string) => {
    setContent(html);
    setSaveState("saved");
    // Sync to My Files localStorage
    try {
      const filesRaw = localStorage.getItem("jusconsultus-my-files");
      let files: any[] = [];
      if (filesRaw) files = JSON.parse(filesRaw);
      const docId = params.documentId as string;
      const fileName = (title || "Untitled Document") + ".html";
      const fileContent = `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`;
      const now = new Date().toISOString();
      const docFile = {
        id: `doc-${docId}`,
        name: fileName,
        type: "text/html",
        size: fileContent.length,
        content: fileContent,
        category: "other",
        uploadedAt: now,
        lastAccessed: now,
      };
      // Replace if exists, else add
      const idx = files.findIndex(f => f.id === docFile.id);
      if (idx >= 0) files[idx] = docFile;
      else files.push(docFile);
      localStorage.setItem("jusconsultus-my-files", JSON.stringify(files));
    } catch {}
  }, [params.documentId, title]);

  const handleGenerateAI = async (genParams: GenerationParams) => {
    setGeneratingAI(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: genParams.templateId || docType || "general",
          templateId: genParams.templateId,
          details: { prompt: genParams.prompt, title },
          tone: genParams.tone || "formal",
          length: genParams.length || "medium",
          jurisdiction: genParams.jurisdiction || "Philippines",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const formattedContent = (data.content as string)
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br/>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/^#{1,3} (.+)/gm, "<h2>$1</h2>")
          .replace(/^<\/p>/, "")
          .replace(/(?<!<\/h2>)<br\/>(?!<p>)(.)/g, "<p>$1");
        const wrappedHtml = `<p>${formattedContent}</p>`;

        await pushContentAndReload(wrappedHtml);
        setShowAiModal(false);
        showToast("Document drafted successfully — editor reloading", "success");
      } else {
        showToast("AI Draft failed — please try again", "error");
      }
    } catch {
      showToast("AI Draft failed — please try again", "error");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleDownload = async (format: "txt" | "html" | "docx") => {
    // Fetch latest content from document
    let latestContent = content;
    try {
      const res = await fetch(`/api/onlyoffice/content?documentId=${params.documentId}`);
      if (res.ok) {
        const data = await res.json();
        latestContent = data.html || content;
        setContent(latestContent);
      }
    } catch { /* use cached content */ }

    const stripped = latestContent.replace(/<[^>]*>/g, "");
    let blob: Blob;
    if (format === "docx") {
      // Use server-side DOCX conversion
      try {
        const docxRes = await fetch("/api/documents/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: latestContent, title, format: "docx" }),
        });
        if (docxRes.ok) {
          blob = await docxRes.blob();
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement("a");
          a.href = url;
          a.download = `${title || "document"}.docx`;
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
      } catch { /* fall through to text */ }
    }
    if (format === "html") {
      blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family: Arial, sans-serif; font-size: 14pt; max-width: 800px; margin: 0 auto; padding: 40px;">${latestContent}</body></html>`], { type: "text/html" });
    } else {
      blob = new Blob([stripped], { type: "text/plain" });
    }
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${title || "document"}.${format}`;
    a.click();
  };

  // Run document analysis — pull fresh content from document first
  const runAnalysis = async () => {
    let latestContent = content;
    try {
      const res = await fetch(`/api/onlyoffice/content?documentId=${params.documentId}`);
      if (res.ok) {
        const data = await res.json();
        latestContent = data.html || content;
        setContent(latestContent);
      }
    } catch { /* use cached */ }

    const stripped = latestContent.replace(/<[^>]*>/g, "");
    const words = stripped.split(/\s+/).filter(Boolean);
    const legalTerms = [
      "whereas", "hereby", "thereof", "herein", "jurisdiction", "complainant",
      "respondent", "plaintiff", "defendant", "affidavit", "stipulation",
      "injunction", "subpoena", "habeas corpus", "prima facie", "res judicata"
    ].filter((term) => stripped.toLowerCase().includes(term));

    const citationMatches = stripped.match(/(?:G\.R\.|R\.A\.|P\.D\.|E\.O\.|A\.M\.|B\.P\.|C\.A\.)\s*(?:No\.\s*)?\d+[\w-]*/g) || [];
    const riskAreas: string[] = [];
    if (!stripped.toLowerCase().includes("jurisdiction")) riskAreas.push("No jurisdiction clause found");
    if (!stripped.toLowerCase().includes("governing law")) riskAreas.push("Missing governing law provision");
    if (words.length < 100) riskAreas.push("Document appears incomplete (under 100 words)");
    if (citationMatches.length === 0 && words.length > 200) riskAreas.push("No legal citations found — consider adding references");

    const avgWordLen = words.reduce((a, w) => a + w.length, 0) / (words.length || 1);
    const clarity = Math.max(20, Math.min(95, 100 - (avgWordLen - 4) * 10 - (words.length > 500 ? 5 : 0)));

    setAnalysisResult({
      wordCount: words.length,
      charCount: stripped.length,
      readingTime: `${Math.max(1, Math.ceil(words.length / 200))} min`,
      clarity: Math.round(clarity),
      legalTerms,
      citations: citationMatches,
      riskAreas,
    });
    setSidePanel("analysis");
  };

  // Contextual research
  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setResearching(true);
    try {
      const res = await fetch(`/api/documents/search?q=${encodeURIComponent(researchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResearchResults(data.results || []);
      } else {
        setResearchResults([
          { title: "Civil Code of the Philippines", number: "R.A. No. 386", summary: "The primary source of civil law in the Philippines, governing obligations, contracts, property, and family law." },
          { title: "Revised Penal Code", number: "Act No. 3815", summary: "Defines crimes and penalties in Philippine criminal law. Provides for imprisonment, fines, and subsidiary penalties." },
          { title: "Labor Code of the Philippines", number: "P.D. No. 442", summary: "Governs employment practices and labor relations, including hiring, termination, wages, and working conditions." },
        ]);
      }
    } catch {
      setResearchResults([
        { title: "Civil Code of the Philippines", number: "R.A. No. 386", summary: "Comprehensive civil law source covering obligations, contracts, and property." },
        { title: "Rules of Court", number: "A.M. No. 19-10-20-SC", summary: "Procedural rules governing litigation in Philippine courts." },
      ]);
    } finally {
      setResearching(false);
    }
  };

  // Insert text from precedent — push to document
  const insertFromPrecedent = async (text: string) => {
    const insertHtml = `<blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; color: #4b5563; font-style: italic;">${text}</blockquote><p><br/></p>`;
    // Get current content from document and append
    try {
      const res = await fetch(`/api/onlyoffice/content?documentId=${params.documentId}`);
      if (res.ok) {
        const data = await res.json();
        const newHtml = (data.html || "") + insertHtml;
        await fetch("/api/onlyoffice/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: params.documentId, html: newHtml }),
        });
        setContent(newHtml);
      }
    } catch {
      // Fallback
      setContent((prev) => prev + insertHtml);
    }
  };

  const toggleSidePanel = (panel: SidePanel) => {
    setSidePanel((prev) => (prev === panel ? null : panel));
  };

  // ── Push new HTML content to ONLYOFFICE storage and reload the editor ──────
  const pushContentAndReload = useCallback(async (html: string) => {
    await fetch("/api/onlyoffice/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: params.documentId, html }),
    });
    setContent(html);
    // Increment version → new documentKey → ONLYOFFICE reinitialises and fetches fresh content
    setDocumentVersion((v) => v + 1);
  }, [params.documentId]);

  // ── Helpers to get fresh content ──────────────────────────────────────────
  const fetchLatestContent = async (): Promise<string> => {
    try {
      const res = await fetch(`/api/onlyoffice/content?documentId=${params.documentId}`);
      if (res.ok) {
        const data = await res.json();
        const html = data.html || content;
        setContent(html);
        return html;
      }
    } catch { /* use cached */ }
    return content;
  };

  // ── AI Improve handler ────────────────────────────────────────────────────
  const handleAIImprove = async () => {
    if (aiProcessing) return;

    // Check for empty content before starting — show blocking dialog if empty
    const latestContent = await fetchLatestContent();
    const stripped = latestContent.replace(/<[^>]*>/g, "");
    if (!stripped.trim()) {
      setEmptyDocWarning("improve");
      return;
    }

    setAiProcessing(true);
    showToast("AI Improve started — this may take a few minutes…", "info");
    try {

      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "improvement",
          details: {
            prompt: `You are an expert Philippine legal document editor. Improve the following legal document: fix grammar, enhance clarity, strengthen legal language, fix formatting and paragraph structure, add missing standard clauses if appropriate. Return ONLY the improved document in clean HTML paragraphs (use <p>, <strong>, <h2> tags). Do NOT include explanations or commentary.\n\nDocument title: ${title}\n\n${stripped}`,
            title,
          },
          tone: "formal",
          length: "long",
          jurisdiction: "Philippines",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const improvedHtml = (data.content as string)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/^#{1,3} (.+)/gm, "<h2>$1</h2>")
          .replace(/\n\n+/g, "</p><p>")
          .replace(/\n/g, "<br/>");
        await pushContentAndReload(`<p>${improvedHtml}</p>`);
        showToast("Document improved — editor reloading", "success");
      } else {
        showToast("AI Improve failed — please try again", "error");
      }
    } catch { showToast("AI Improve failed — please try again", "error"); }
    finally { setAiProcessing(false); }
  };

  // ── AI Review handler ─────────────────────────────────────────────────────
  const handleAIReview = async () => {
    if (aiProcessing) return;

    // Check for empty content before starting — show blocking dialog if empty
    const latestContent = await fetchLatestContent();
    const stripped = latestContent.replace(/<[^>]*>/g, "");
    if (!stripped.trim()) {
      setEmptyDocWarning("review");
      return;
    }

    setAiProcessing(true);
    showToast("AI Review started — this may take a few minutes…", "info");
    try {

      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "review",
          details: {
            prompt: `You are a senior Philippine legal counsel. Review the following legal document and provide a structured analysis covering:\n1. Overall assessment\n2. Missing or deficient clauses\n3. Legal compliance issues\n4. Language and clarity issues\n5. Specific recommendations for improvement\n\nDocument title: ${title}\n\n${stripped}`,
            title,
          },
          tone: "formal",
          length: "long",
          jurisdiction: "Philippines",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiReviewContent(data.content as string);
        setSidePanel("ai");
        showToast("AI review complete — see results in the side panel", "success");
      } else {
        showToast("AI Review failed — please try again", "error");
      }
    } catch { showToast("AI Review failed — please try again", "error"); }
    finally { setAiProcessing(false); }
  };

  // ── Manual save handler ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveState("saving");
    try {
      // Fetch latest content from ONLYOFFICE then save both title + content
      const latestContent = await fetchLatestContent();
      const res = await fetch(`/api/documents/${params.documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: latestContent }),
      });
      setSaveState(res.ok ? "saved" : "error");
      showToast(res.ok ? "Document saved" : "Save failed — please retry", res.ok ? "success" : "error");
    } catch {
      setSaveState("error");
      showToast("Save failed — please retry", "error");
    }
  };

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Import document handler ───────────────────────────────────────────────
  const handleImport = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const importedHtml = `<p>${data.text
            .replace(/\n\n+/g, "</p><p>")
            .replace(/\n/g, "<br/>")}</p>`;
          await pushContentAndReload(importedHtml);
          showToast(`"${file.name}" imported — editor reloading`, "success");
        }
      } else {
        showToast("Import failed — unsupported file format", "error");
      }
    } catch { showToast("Import failed — please try again", "error"); }

    // Reset input
    if (importInputRef.current) importInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-text-secondary">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-secondary">
      {/* Hidden file input for imports */}
      <input
        ref={importInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.html,.htm"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Top Bar: Back + Title + Save Status + Side-panel toggles */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-border shrink-0">
        <button onClick={() => router.push("/documents")} className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors" title="Back to documents">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-base font-semibold text-text-primary border-0 focus:outline-none placeholder:text-text-tertiary"
          placeholder="Untitled Document"
        />

        {/* Save Status */}
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          {saveState === "saving" && (<><div className="w-3 h-3 border border-text-tertiary border-t-transparent rounded-full animate-spin" />Saving...</>)}
          {saveState === "saved" && (<><Check className="w-3.5 h-3.5 text-green-600" />Saved</>)}
          {saveState === "unsaved" && (<><Clock className="w-3.5 h-3.5 text-amber-500" />Unsaved</>)}
          {saveState === "error" && (<><AlertCircle className="w-3.5 h-3.5 text-red-500" />Error</>)}
        </div>

        {/* AI Processing Indicator */}
        {aiProcessing && (
          <div className="flex flex-col items-start px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 text-xs font-medium animate-pulse">
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI Processing…
            </div>
            <span className="text-[10px] text-purple-500 font-normal mt-0.5 pl-5">This may take a few minutes</span>
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-border pl-3">
          {/* Analysis */}
          <button onClick={runAnalysis} className={cn("p-2 rounded-lg transition-colors", sidePanel === "analysis" ? "bg-primary-50 text-primary-600" : "hover:bg-surface-tertiary text-text-secondary")} title="Document Analysis">
            <Lightbulb className="w-4 h-4" />
          </button>

          {/* Research */}
          <button onClick={() => toggleSidePanel("research")} className={cn("p-2 rounded-lg transition-colors", sidePanel === "research" ? "bg-primary-50 text-primary-600" : "hover:bg-surface-tertiary text-text-secondary")} title="Legal Research">
            <Search className="w-4 h-4" />
          </button>

          {/* Precedent Library */}
          <button onClick={() => toggleSidePanel("precedent")} className={cn("p-2 rounded-lg transition-colors", sidePanel === "precedent" ? "bg-primary-50 text-primary-600" : "hover:bg-surface-tertiary text-text-secondary")} title="Precedent Library">
            <FolderOpen className="w-4 h-4" />
          </button>

          {/* Redlines Toggle */}
          <button onClick={() => setShowRedlines(!showRedlines)} className={cn("p-2 rounded-lg transition-colors", showRedlines ? "bg-red-50 text-red-600" : "hover:bg-surface-tertiary text-text-secondary")} title="Redline / Track Changes">
            <GitCompare className="w-4 h-4" />
          </button>

          {/* Metadata */}
          <button onClick={() => toggleSidePanel("metadata")} className={cn("p-2 rounded-lg transition-colors", sidePanel === "metadata" ? "bg-primary-50 text-primary-600" : "hover:bg-surface-tertiary text-text-secondary")} title="Document Metadata">
            <Tag className="w-4 h-4" />
          </button>

          <button className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors" title="Share">
            <Share2 className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Toolbar: AI + Builder + Import + Download */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border shrink-0">
        {/* AI Generate */}
        <button
          onClick={() => setShowAiModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Draft
        </button>

        {/* AI Improve */}
        <button
          onClick={handleAIImprove}
          disabled={aiProcessing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {aiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          AI Improve
        </button>

        {/* AI Review */}
        <button
          onClick={handleAIReview}
          disabled={aiProcessing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {aiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          AI Review
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Document Analysis */}
        <button
          onClick={() => setShowAnalysisModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 transition-colors"
        >
          <FileScan className="w-3.5 h-3.5" />
          Analyze
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Document Builder Export */}
        <OnlyOfficeDocBuilderButton
          documentId={params.documentId as string}
          filename={title || "document"}
          label="Export"
          compact
        />

        {/* Import */}
        <button
          onClick={handleImport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-tertiary transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </button>

        {/* Download */}
        <div className="relative group">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-tertiary transition-colors">
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-border z-50 py-1 hidden group-hover:block">
            <button onClick={() => handleDownload("docx")} className="w-full text-left px-3 py-2 text-xs hover:bg-surface-secondary">DOCX</button>
            <button onClick={() => handleDownload("html")} className="w-full text-left px-3 py-2 text-xs hover:bg-surface-secondary">HTML</button>
            <button onClick={() => handleDownload("txt")} className="w-full text-left px-3 py-2 text-xs hover:bg-surface-secondary">Plain Text</button>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-tertiary transition-colors ml-auto"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-medium border-b shrink-0 animate-fade-in",
          toast.type === "success" && "bg-green-50 border-green-200 text-green-700",
          toast.type === "error" && "bg-red-50 border-red-200 text-red-700",
          toast.type === "info" && "bg-blue-50 border-blue-200 text-blue-700",
        )}>
          {toast.type === "success" && <Check className="w-3.5 h-3.5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {toast.type === "info" && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Redline Bar */}
      {showRedlines && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-3 animate-fade-in shrink-0">
          <GitCompare className="w-4 h-4 text-red-600" />
          <span className="text-xs font-medium text-red-700">Redline Mode Active</span>
          <span className="text-xs text-red-600">Changes since last save are tracked</span>
          <button onClick={() => { setOriginalContent(content); }} className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Accept All Changes
          </button>
          <button
            onClick={async () => {
              try {
                await fetch("/api/onlyoffice/content", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ documentId: params.documentId, html: originalContent }),
                });
                setContent(originalContent);
              } catch { /* ignore */ }
            }}
            className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Revert
          </button>
        </div>
      )}

      {/* Editor + Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Editor — ONLYOFFICE if server available, else built-in */}
        <div className="flex-1 min-h-0">
          {editorFallback ? (
            <PaginatedEditor
              content={content}
              setContent={(html) => {
                setContent(html);
                setSaveState("unsaved");
                if (saveTimer.current) clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(async () => {
                  setSaveState("saving");
                  try {
                    const res = await fetch(`/api/documents/${params.documentId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: html }),
                    });
                    setSaveState(res.ok ? "saved" : "error");
                  } catch { setSaveState("error"); }
                }, 1500);
              }}
              fontSize={12}
              fontFamily="Times New Roman"
              zoom={zoom}
              className="h-full"
            />
          ) : (
            <OnlyOfficeEditor
              documentId={params.documentId as string}
              documentTitle={title || "Untitled Document"}
              documentKey={`${params.documentId}-v${documentVersion}`}
              mode="edit"
              onContentChange={handleContentSync}
              onSave={handleSave}
              onError={() => setEditorFallback(true)}
            />
          )}
        </div>

        {/* Side Panel */}
        {sidePanel && (
          <div className="w-80 bg-white border-l border-border flex flex-col animate-slide-in overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                {sidePanel === "ai" && <><Sparkles className="w-4 h-4 text-primary-600" /> AI Assistant</>}
                {sidePanel === "analysis" && <><Lightbulb className="w-4 h-4 text-primary-600" /> Document Analysis</>}
                {sidePanel === "research" && <><Search className="w-4 h-4 text-primary-600" /> Legal Research</>}
                {sidePanel === "precedent" && <><FolderOpen className="w-4 h-4 text-primary-600" /> Precedent Library</>}
                {sidePanel === "metadata" && <><Tag className="w-4 h-4 text-primary-600" /> Metadata</>}
              </h3>
              <button onClick={() => setSidePanel(null)} className="p-1 hover:bg-surface-tertiary rounded" title="Close panel">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-auto p-4">

              {/* AI Review Panel */}
              {sidePanel === "ai" && (
                <div className="space-y-4">
                  {aiProcessing ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                      <p className="text-xs text-text-secondary">AI is reviewing your document…</p>
                    </div>
                  ) : aiReviewContent ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-teal-600" />
                          AI Review
                        </h4>
                        <button onClick={() => setAiReviewContent(null)} className="text-[10px] text-text-tertiary hover:text-text-secondary">Clear</button>
                      </div>
                      <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed bg-surface-secondary rounded-lg p-3 max-h-[60vh] overflow-auto border border-border">
                        {aiReviewContent}
                      </div>
                      <button
                        onClick={handleAIReview}
                        disabled={aiProcessing}
                        className="w-full text-xs text-teal-600 hover:text-teal-700 py-2 border border-teal-200 rounded-lg flex items-center justify-center gap-1.5 hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Re-run Review
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                      <p className="text-xs font-semibold text-text-primary mb-1">AI Document Review</p>
                      <p className="text-xs text-text-secondary mb-5 leading-relaxed">Get a detailed legal analysis — missing clauses, compliance issues, and improvement recommendations.</p>
                      <button
                        onClick={handleAIReview}
                        disabled={aiProcessing}
                        className="px-4 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        Start Review
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Panel */}
              {sidePanel === "analysis" && analysisResult && (
                <div className="space-y-5">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-secondary rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-text-primary">{analysisResult.wordCount.toLocaleString()}</p>
                      <p className="text-[10px] text-text-secondary">Words</p>
                    </div>
                    <div className="bg-surface-secondary rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-text-primary">{analysisResult.charCount.toLocaleString()}</p>
                      <p className="text-[10px] text-text-secondary">Characters</p>
                    </div>
                    <div className="bg-surface-secondary rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-text-primary">{analysisResult.readingTime}</p>
                      <p className="text-[10px] text-text-secondary">Reading Time</p>
                    </div>
                    <div className="bg-surface-secondary rounded-lg p-3 text-center">
                      <p className={cn("text-xl font-bold", analysisResult.clarity > 70 ? "text-green-600" : analysisResult.clarity > 40 ? "text-amber-600" : "text-red-600")}>
                        {analysisResult.clarity}%
                      </p>
                      <p className="text-[10px] text-text-secondary">Clarity Score</p>
                    </div>
                  </div>

                  {/* Legal Terms */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      Legal Terms Detected ({analysisResult.legalTerms.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.legalTerms.length > 0 ? (
                        analysisResult.legalTerms.map((term) => (
                          <Badge key={term} variant="outline" className="text-[10px]">{term}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-text-tertiary">No legal terms detected</p>
                      )}
                    </div>
                  </div>

                  {/* Citations */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Citations Found ({analysisResult.citations.length})
                    </h4>
                    {analysisResult.citations.length > 0 ? (
                      <div className="space-y-1.5">
                        {analysisResult.citations.map((cit, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-primary-600 bg-primary-50 rounded-lg px-2.5 py-1.5">
                            <ExternalLink className="w-3 h-3" />
                            <span className="font-medium">{cit}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary">No citations found in document</p>
                    )}
                  </div>

                  {/* Risk Areas */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Risk Assessment
                    </h4>
                    {analysisResult.riskAreas.length > 0 ? (
                      <div className="space-y-2">
                        {analysisResult.riskAreas.map((risk, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span className="text-amber-700">{risk}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-700">No risk areas identified</span>
                      </div>
                    )}
                  </div>

                  <button onClick={runAnalysis} className="w-full text-xs text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1 py-2">
                    <RotateCcw className="w-3 h-3" />
                    Re-analyze
                  </button>
                </div>
              )}

              {/* Research Panel */}
              {sidePanel === "research" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-tertiary" />
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                      placeholder="Search legal database..."
                      className="input pl-9 text-xs w-full"
                    />
                  </div>
                  <button
                    onClick={handleResearch}
                    disabled={researching || !researchQuery.trim()}
                    className="w-full py-2 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {researching ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-3 h-3" />
                        Search
                      </>
                    )}
                  </button>

                  <div className="space-y-3">
                    {researchResults.map((result, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 hover:border-primary-300 transition-colors">
                        <p className="text-xs font-semibold text-text-primary mb-1">{result.title}</p>
                        <p className="text-[10px] text-primary-600 mb-1.5">{result.number}</p>
                        <p className="text-xs text-text-secondary line-clamp-3">{result.summary}</p>
                        <button
                          onClick={() => insertFromPrecedent(`${result.title} (${result.number}): ${result.summary}`)}
                          className="mt-2 text-[10px] text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Insert citation into document
                        </button>
                      </div>
                    ))}
                  </div>

                  {researchResults.length === 0 && !researching && (
                    <div className="text-center py-8">
                      <BookOpen className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                      <p className="text-xs text-text-secondary">Search for relevant laws, jurisprudence, and legal references</p>
                    </div>
                  )}
                </div>
              )}

              {/* Precedent Library Panel */}
              {sidePanel === "precedent" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Your personal files from My Files. Click to insert content into your document.</span>
                  </div>

                  {myFiles.length > 0 ? (
                    <div className="space-y-2">
                      {myFiles.map((file) => (
                        <button
                          key={file.id}
                          className="w-full text-left p-3 rounded-lg border border-border hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                          onClick={() => {
                            try {
                              const decoded = atob(file.content.split(",")[1] || file.content);
                              insertFromPrecedent(decoded.slice(0, 500));
                            } catch {
                              insertFromPrecedent(`[Content from: ${file.name}]`);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-text-tertiary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                              <p className="text-[10px] text-text-tertiary">{file.category} · {(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FolderOpen className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                      <p className="text-xs text-text-secondary mb-2">No files in your library</p>
                      <a href="/my-files" className="text-xs text-primary-600 hover:underline">Upload files in My Files</a>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Panel */}
              {sidePanel === "metadata" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Document ID</label>
                      <p className="text-xs text-text-primary mt-0.5 font-mono">{document?.id?.slice(0, 12)}...</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Title</label>
                      <p className="text-xs text-text-primary mt-0.5">{title}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Category</label>
                      <p className="text-xs text-text-primary mt-0.5 capitalize">{document?.category || docType || "General"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Document Type</label>
                      <p className="text-xs text-text-primary mt-0.5 capitalize">{docType || "General"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Last Modified</label>
                      <p className="text-xs text-text-primary mt-0.5">
                        {document?.updatedAt ? new Date(document.updatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Jurisdiction</label>
                      <p className="text-xs text-text-primary mt-0.5">Republic of the Philippines</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Word Count</label>
                      <p className="text-xs text-text-primary mt-0.5">{content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Extracted Entities */}
                  <div className="pt-3 border-t border-border">
                    <h4 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Auto-Extracted Entities</h4>
                    {(() => {
                      const stripped = content.replace(/<[^>]*>/g, "");
                      const dates = stripped.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/g) || [];
                      const amounts = stripped.match(/(?:₱|PHP|Php)\s?[\d,]+(?:\.\d{2})?/g) || [];
                      return (
                        <div className="space-y-2">
                          {dates.length > 0 && (
                            <div>
                              <p className="text-[10px] text-text-tertiary">Dates ({dates.length})</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {dates.slice(0, 5).map((d, i) => <Badge key={i} variant="outline" className="text-[10px]">{d}</Badge>)}
                              </div>
                            </div>
                          )}
                          {amounts.length > 0 && (
                            <div>
                              <p className="text-[10px] text-text-tertiary">Monetary Amounts ({amounts.length})</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {amounts.slice(0, 5).map((a, i) => <Badge key={i} variant="accent" className="text-[10px]">{a}</Badge>)}
                              </div>
                            </div>
                          )}
                          {dates.length === 0 && amounts.length === 0 && (
                            <p className="text-xs text-text-tertiary">No entities extracted yet</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Drafting Modal */}
      <AIDraftingModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onGenerate={handleGenerateAI}
        initialDocType={docType || ""}
      />

      {/* Document Analysis Modal */}
      <DocumentAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        showToast={showToast}
        onInsertText={async (text) => {
          const html = `<p>${text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
          await pushContentAndReload(html);
          showToast("Original document inserted into editor", "success");
        }}
        onInsertEdited={async (editedText) => {
          const html = `<p>${editedText.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
          await pushContentAndReload(html);
          showToast("Edited document (with accepted suggestions) inserted into editor", "success");
        }}
        onApplySuggestion={async (suggestion) => {
          try {
            const latest = await fetchLatestContent();
            if (!suggestion.original || !suggestion.suggested) {
              showToast("This suggestion has no text replacement", "error");
              return;
            }
            // Try replacing in HTML; fall back to plain-text-level replace
            let updated = latest.replace(suggestion.original, suggestion.suggested);
            if (updated === latest) {
              showToast("Could not locate that exact text in the document — try copying manually", "error");
              return;
            }
            await pushContentAndReload(updated);
            showToast("Suggestion applied to document", "success");
          } catch {
            showToast("Failed to apply suggestion", "error");
          }
        }}
        onInsertAnalysis={async (analysis) => {
          const summary = [
            `<h2>Document Analysis Report</h2>`,
            `<p><strong>Type:</strong> ${analysis.documentType} — ${analysis.documentCategory}</p>`,
            `<p><strong>Quality Score:</strong> ${analysis.overallScore}/100</p>`,
            `<h3>Summary</h3><p>${analysis.summary}</p>`,
            analysis.issues?.length ? `<h3>Issues (${analysis.issues.length})</h3>` +
              analysis.issues.map(i => `<p>• <strong>[${i.severity.toUpperCase()}] ${i.category}:</strong> ${i.description}${i.suggestion ? ` — ${i.suggestion}` : ""}</p>`).join("") : "",
            analysis.improvements?.length ? `<h3>Improvement Recommendations</h3>` +
              analysis.improvements.map(imp => `<p>• <strong>${imp.area}:</strong> ${imp.recommendation}</p>`).join("") : "",
            analysis.aiSuggestions?.length ? `<h3>AI Text Suggestions (${analysis.aiSuggestions.length})</h3>` +
              analysis.aiSuggestions.map(s => `<p>• <strong>[${s.type}]</strong> Replace: <em>"${s.original}"</em> → <em>"${s.suggested}"</em> (${s.reason})</p>`).join("") : "",
          ].filter(Boolean).join("\n");
          await pushContentAndReload(summary);
          showToast("Analysis report inserted into editor", "success");
        }}
      />

      {/* Empty Document Warning Dialog */}
      {emptyDocWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEmptyDocWarning(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>

            <h3 className="text-base font-semibold text-text-primary mb-2">
              Document is Empty
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-1">
              The editor has no content to{" "}
              <strong>{emptyDocWarning === "improve" ? "improve" : "review"}</strong>.
            </p>
            <p className="text-xs text-text-tertiary leading-relaxed mb-6">
              Write or paste your legal document text into the editor first, then
              run <strong>AI {emptyDocWarning === "improve" ? "Improve" : "Review"}</strong> again.
              The AI analysis typically takes a few minutes to complete.
            </p>

            {/* Info tip */}
            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-left">
              <p className="text-xs text-blue-700 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                <span>
                  You can use <strong>AI Draft</strong> to generate a new document from scratch,
                  or <strong>Import</strong> an existing file to load content into the editor.
                </span>
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setEmptyDocWarning(null); setShowAiModal(true); }}
                className="flex-1 py-2 text-sm font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Use AI Draft
              </button>
              <button
                onClick={() => setEmptyDocWarning(null)}
                className="flex-1 py-2 text-sm font-medium border border-border text-text-secondary rounded-xl hover:bg-surface-secondary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
