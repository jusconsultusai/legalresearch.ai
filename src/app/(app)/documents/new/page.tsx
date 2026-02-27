"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Wand2,
  ChevronRight,
  X,
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Info,
  FolderOpen,
  Brain,
  Pencil,
  Clock,
  HardDrive,
} from "lucide-react";

// ─── My Files type ────────────────────────────────────────────────────────────
interface MyFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // base64 data-URL
  category: string;
  uploadedAt: string;
  lastAccessed: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ─── AI options ───────────────────────────────────────────────────────────────
const AI_TONES = [
  { value: "formal", label: "Formal", desc: "Standard legal language" },
  { value: "persuasive", label: "Persuasive", desc: "Advocacy-focused" },
  { value: "neutral", label: "Neutral", desc: "Objective and balanced" },
  { value: "technical", label: "Technical", desc: "Precise, clause-heavy" },
];

const AI_LENGTHS = [
  { value: "short", label: "Brief", desc: "1–2 pages" },
  { value: "medium", label: "Standard", desc: "3–5 pages" },
  { value: "long", label: "Comprehensive", desc: "6+ pages" },
];

function toHtml(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,3} (.+)/gm, "<h2>$1</h2>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

const DOCUMENT_CATEGORIES = [
  {
    category: "civil",
    label: "Civil",
    icon: "⚖️",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    types: [
      { key: "complaint", label: "Complaint" },
      { key: "answer", label: "Answer" },
      { key: "reply", label: "Reply" },
      { key: "motion", label: "Motion" },
      { key: "demurrer", label: "Demurrer to Evidence" },
      { key: "memorandum", label: "Memorandum" },
      { key: "comment", label: "Comment / Opposition" },
    ],
  },
  {
    category: "criminal",
    label: "Criminal",
    icon: "🔒",
    color: "border-red-200 bg-red-50 text-red-700",
    types: [
      { key: "complaint-affidavit", label: "Complaint-Affidavit" },
      { key: "counter-affidavit", label: "Counter-Affidavit" },
      { key: "motion-dismiss", label: "Motion to Dismiss" },
      { key: "bail-petition", label: "Petition for Bail" },
    ],
  },
  {
    category: "contracts",
    label: "Contracts",
    icon: "📄",
    color: "border-green-200 bg-green-50 text-green-700",
    types: [
      { key: "contract-service", label: "Contract of Service" },
      { key: "contract-lease", label: "Contract of Lease" },
      { key: "deed-sale", label: "Deed of Absolute Sale" },
      { key: "moa", label: "Memorandum of Agreement" },
      { key: "mou", label: "Memorandum of Understanding" },
      { key: "nda", label: "Non-Disclosure Agreement" },
      { key: "employment-contract", label: "Employment Contract" },
    ],
  },
  {
    category: "corporate",
    label: "Corporate",
    icon: "🏢",
    color: "border-purple-200 bg-purple-50 text-purple-700",
    types: [
      { key: "articles-inc", label: "Articles of Incorporation" },
      { key: "bylaws", label: "By-Laws" },
      { key: "board-resolution", label: "Board Resolution" },
      { key: "secretary-cert", label: "Secretary's Certificate" },
      { key: "gis", label: "General Information Sheet" },
    ],
  },
  {
    category: "administrative",
    label: "Administrative",
    icon: "📋",
    color: "border-amber-200 bg-amber-50 text-amber-700",
    types: [
      { key: "position-paper", label: "Position Paper" },
      { key: "admin-complaint", label: "Administrative Complaint" },
      { key: "appeal", label: "Appeal" },
    ],
  },
  {
    category: "notarial",
    label: "Notarial",
    icon: "✍️",
    color: "border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-800 text-gray-700 dark:text-slate-300",
    types: [
      { key: "affidavit", label: "Affidavit" },
      { key: "spa", label: "Special Power of Attorney" },
      { key: "gpa", label: "General Power of Attorney" },
      { key: "jurat", label: "Jurat" },
    ],
  },
];

export default function NewDocumentPage() {
  const router = useRouter();

  // ── global ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<"blank" | "template" | "ai">("blank");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── shared category / type picker ────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState("civil");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTypeLabel, setSelectedTypeLabel] = useState("");

  // ── template mode ────────────────────────────────────────────────
  const [templateSource, setTemplateSource] = useState<"official" | "myfiles">("official");
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // My Files for template reuse
  const [myFiles, setMyFiles] = useState<MyFile[]>([]);
  const [myFileSearch, setMyFileSearch] = useState("");
  const [selectedMyFile, setSelectedMyFile] = useState<MyFile | null>(null);
  const [myFilePreview, setMyFilePreview] = useState<string | null>(null);
  const [showMyFilePreview, setShowMyFilePreview] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jusconsultus-my-files");
      if (raw) setMyFiles(JSON.parse(raw));
    } catch {}
  }, []);

  // ── ai mode ──────────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("formal");
  const [aiLength, setAiLength] = useState("medium");
  const [aiJurisdiction, setAiJurisdiction] = useState("Philippines");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStep, setAiStep] = useState<"form" | "generating" | "done">("form");

  // ── My Files import banner ───────────────────────────────────────
  const [importedFile, setImportedFile] = useState<{ name: string; content: string; type: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jusconsultus-import-file");
      if (raw) setImportedFile(JSON.parse(raw));
    } catch {}
  }, []);

  const clearImport = () => {
    localStorage.removeItem("jusconsultus-import-file");
    setImportedFile(null);
  };

  // ── Pending analysis from Document Analysis chat feature ──────────
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    analysis: {
      documentType: string;
      documentCategory: string;
      summary: string;
      overallScore: number;
      issues: { severity: string; category: string; description: string; suggestion: string }[];
      improvements: { area: string; recommendation: string; priority: string }[];
      aiSuggestions: { id: string; title: string; description: string }[];
      keyTerms?: string[];
    };
    extractedText: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jusconsultus-pending-analysis");
      if (raw) {
        setPendingAnalysis(JSON.parse(raw));
        localStorage.removeItem("jusconsultus-pending-analysis");
      }
    } catch {}
  }, []);

  // ── Fetch template preview when type selected ────────────────────
  useEffect(() => {
    if (mode !== "template" || !selectedType) { setTemplatePreview(null); return; }
    setLoadingPreview(true);
    setShowPreview(false);
    fetch(`/api/documents/template?type=${selectedType}`)
      .then((r) => r.json())
      .then((d) => setTemplatePreview(d.content || null))
      .catch(() => setTemplatePreview(null))
      .finally(() => setLoadingPreview(false));
  }, [mode, selectedType]);

  const currentCategory = DOCUMENT_CATEGORIES.find((c) => c.category === selectedCategory);

  const selectType = (key: string, label: string) => {
    setSelectedType(key);
    setSelectedTypeLabel(label);
    setTitle(label);
  };

  // ── Create document (blank or template) ──────────────────────────
  const handleCreate = async (initialHtml?: string) => {
    setError(null);
    setCreating(true);
    try {
      const documentTitle = title.trim() || selectedTypeLabel || "Untitled Document";
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: documentTitle, content: "", category: selectedCategory || "general" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create document."); return; }
      const docId = data.document?.id;
      if (!docId) { setError("No document ID returned."); return; }
      if (initialHtml) {
        await fetch("/api/onlyoffice/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: docId, html: initialHtml }),
        });
      }
      router.push(`/documents/${docId}`);
    } catch { setError("Network error. Please try again."); }
    finally { setCreating(false); }
  };

  // ── Use pre-built template ────────────────────────────────────────
  const handleUseTemplate = () => {
    if (templateSource === "official") {
      if (!selectedType) { setError("Select a document type first."); return; }
      handleCreate(templatePreview || undefined);
    } else {
      if (!selectedMyFile) { setError("Select one of your files first."); return; }
      let html = "";
      try {
        const decoded = atob(selectedMyFile.content.split(",")[1] || "");
        html = decoded.startsWith("<")
          ? decoded
          : `<p>${decoded.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
      } catch { html = "<p>Imported document</p>"; }
      if (!title.trim()) setTitle(selectedMyFile.name.replace(/\.[^.]+$/, ""));
      handleCreate(html);
    }
  };

  // ── Use imported My Files content ─────────────────────────────────
  const handleUseImported = async () => {
    if (!importedFile) return;
    let html = "";
    try {
      const decoded = atob(importedFile.content.split(",")[1] || "");
      html = decoded.startsWith("<")
        ? decoded
        : `<p>${decoded.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
    } catch { html = "<p>Imported document</p>"; }
    clearImport();
    await handleCreate(html);
  };

  // ── Generate with AI (DeepSeek) ───────────────────────────────────
  const handleGenerateWithAI = async () => {
    if (!selectedType && !aiPrompt.trim()) {
      setError("Select a document type or enter a description of what you need.");
      return;
    }
    setError(null);
    setGeneratingAI(true);
    setAiStep("generating");
    try {
      const documentTitle = title.trim() || selectedTypeLabel || aiPrompt.split(" ").slice(0, 5).join(" ") || "AI-Generated Document";
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: documentTitle, content: "", category: selectedCategory || "general" }),
      });
      const docData = await docRes.json();
      if (!docRes.ok) { setError(docData.error || "Failed to create document."); setAiStep("form"); return; }
      const docId = docData.document?.id;

      const genRes = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: selectedType || "legal document",
          details: { title: documentTitle, prompt: aiPrompt.trim(), jurisdiction: aiJurisdiction },
          tone: aiTone,
          length: aiLength,
          jurisdiction: aiJurisdiction,
        }),
      });
      if (genRes.ok) {
        const genData = await genRes.json();
        const html = `<p>${toHtml(genData.content as string)}</p>`;
        await fetch("/api/onlyoffice/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: docId, html }),
        });
      }
      setAiStep("done");
      await new Promise((r) => setTimeout(r, 800));
      router.push(`/documents/${docId}`);
    } catch { setError("Generation failed. Please try again."); setAiStep("form"); }
    finally { setGeneratingAI(false); }
  };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/documents" className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New Document</h1>
          <p className="text-sm text-text-secondary">
            Start from a blank page, a Philippine legal template, or let AI draft it for you
          </p>
        </div>
      </div>

      {/* My Files import banner */}
      {importedFile && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 truncate">
              Imported from My Files: <span className="font-semibold">{importedFile.name}</span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Click &ldquo;Open in Editor&rdquo; to create a new document using this file&apos;s content.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUseImported}
              disabled={creating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
              Open in Editor
            </button>
            <button onClick={clearImport} className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5 text-amber-600" />
            </button>
          </div>
        </div>
      )}

      {/* ── Pending Document Analysis banner ─────────────────────── */}
      {pendingAnalysis && (
        <div className="border border-violet-200 bg-violet-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-violet-800">
                  Document Analysis Results
                </p>
                <p className="text-xs text-violet-600 mt-0.5">
                  {pendingAnalysis.analysis.documentType && pendingAnalysis.analysis.documentType !== "Unknown"
                    ? pendingAnalysis.analysis.documentType
                    : "Legal Document"}{" "}
                  &mdash; Overall score:{" "}
                  <span className={cn(
                    "font-bold",
                    pendingAnalysis.analysis.overallScore >= 75 ? "text-emerald-700" :
                    pendingAnalysis.analysis.overallScore >= 50 ? "text-amber-700" : "text-red-700"
                  )}>
                    {pendingAnalysis.analysis.overallScore}/100
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setPendingAnalysis(null)}
              className="p-1.5 hover:bg-violet-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5 text-violet-500" />
            </button>
          </div>

          {pendingAnalysis.analysis.summary && (
            <p className="text-xs text-violet-700 leading-relaxed line-clamp-3">
              {pendingAnalysis.analysis.summary}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs">
            {pendingAnalysis.analysis.issues?.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {pendingAnalysis.analysis.issues.length} issue{pendingAnalysis.analysis.issues.length !== 1 ? "s" : ""} found
              </div>
            )}
            {pendingAnalysis.analysis.improvements?.length > 0 && (
              <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {pendingAnalysis.analysis.improvements.length} improvement suggestion{pendingAnalysis.analysis.improvements.length !== 1 ? "s" : ""}
              </div>
            )}
            {pendingAnalysis.analysis.aiSuggestions?.length > 0 && (
              <div className="flex items-center gap-1.5 text-violet-700 font-medium">
                <Wand2 className="w-3.5 h-3.5" />
                {pendingAnalysis.analysis.aiSuggestions.length} AI suggestion{pendingAnalysis.analysis.aiSuggestions.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {pendingAnalysis.extractedText && (
            <div className="bg-white border border-violet-100 rounded-lg px-3 py-2">
              <p className="text-xs text-text-secondary font-medium mb-1">Extracted text preview</p>
              <p className="text-xs text-text-primary leading-relaxed line-clamp-2 font-mono">
                {pendingAnalysis.extractedText.substring(0, 300)}
                {pendingAnalysis.extractedText.length > 300 ? "…" : ""}
              </p>
            </div>
          )}

          <p className="text-xs text-violet-600 italic">
            The analysis results above are from your uploaded document. Create or open a document below to apply the suggestions in the editor.
          </p>
        </div>
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-4">
        {/* Blank */}
        <button
          onClick={() => { setMode("blank"); setSelectedType(null); setSelectedTypeLabel(""); }}
          className={cn(
            "p-5 rounded-xl border-2 text-left transition-all",
            mode === "blank"
              ? "border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              : "border-border hover:border-slate-300 hover:bg-surface-secondary"
          )}
        >
          <div className="mb-3 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-slate-600" />
          </div>
          <h3 className="font-semibold text-sm">Blank Document</h3>
          <p className="text-xs text-text-secondary mt-1">Start from scratch with an empty canvas</p>
        </button>

        {/* Template */}
        <button
          onClick={() => setMode("template")}
          className={cn(
            "p-5 rounded-xl border-2 text-left transition-all relative",
            mode === "template"
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-border hover:border-blue-300 hover:bg-surface-secondary"
          )}
        >
          <div className="mb-3 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-sm">Use Template</h3>
          <p className="text-xs text-text-secondary mt-1">Philippine legal templates — pre-filled, no AI</p>
          <span className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
            Instant
          </span>
        </button>

        {/* AI */}
        <button
          onClick={() => setMode("ai")}
          className={cn(
            "p-5 rounded-xl border-2 text-left transition-all relative",
            mode === "ai"
              ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
              : "border-border hover:border-primary-300 hover:bg-surface-secondary"
          )}
        >
          <div className="mb-3 w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="font-semibold text-sm">Generate with AI</h3>
          <p className="text-xs text-text-secondary mt-1">AI-assisted drafting for legal documents</p>
          <span className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-full">
            AI
          </span>
        </button>
      </div>

      {/* ─── BLANK MODE ─────────────────────────────────────────────── */}
      {mode === "blank" && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <Pencil className="w-10 h-10 text-text-tertiary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Start with a blank canvas</h3>
            <p className="text-sm text-text-secondary mt-1 max-w-md">
              A completely empty document. Write freely — you can apply templates or run AI assistance from inside the editor at any time.
            </p>
          </div>
        </div>
      )}

      {/* ─── TEMPLATE MODE ──────────────────────────────────────────── */}
      {mode === "template" && (
        <div className="space-y-4">

          {/* Source tab bar */}
          <div className="flex gap-1 bg-surface-secondary p-1 rounded-xl w-fit">
            <button
              onClick={() => {
                setTemplateSource("official");
                setSelectedMyFile(null);
                setMyFilePreview(null);
                setShowMyFilePreview(false);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                templateSource === "official"
                  ? "bg-surface text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              📋 Official Templates
            </button>
            <button
              onClick={() => {
                setTemplateSource("myfiles");
                setSelectedType(null);
                setSelectedTypeLabel("");
                setTemplatePreview(null);
                setShowPreview(false);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                templateSource === "myfiles"
                  ? "bg-surface text-amber-700 dark:text-amber-300 shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              My Files
              {myFiles.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {myFiles.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Official Templates ── */}
          {templateSource === "official" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Select a document type to load its <strong>official Philippine legal template</strong> — formatted per
                  A.M. No. 11-9-4-SC (Supreme Court Efficient Use of Paper Rule).
                  Content is pre-filled with standard clauses; just fill in the bracketed placeholders.
                  <strong className="block mt-1">No AI is used — instant &amp; works offline.</strong>
                </p>
              </div>

              <div className="flex gap-6">
                {/* Category sidebar */}
                <div className="w-48 shrink-0 space-y-1">
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.category}
                      onClick={() => { setSelectedCategory(cat.category); setSelectedType(null); setSelectedTypeLabel(""); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors",
                        selectedCategory === cat.category
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                          : "hover:bg-surface-secondary text-text-secondary"
                      )}
                    >
                      <span className="text-base">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Type grid + preview */}
                <div className="flex-1 space-y-4">
                  <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    {currentCategory?.label} Templates
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {currentCategory?.types.map((type) => (
                      <button
                        key={type.key}
                        onClick={() => selectType(type.key, type.label)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          selectedType === type.key
                            ? `${currentCategory.color} border-2 shadow-sm`
                            : "border-border hover:border-blue-300 hover:bg-blue-50/50"
                        )}
                      >
                        <FileText className="w-4 h-4 mb-2 text-current opacity-60" />
                        <p className="text-sm font-medium">{type.label}</p>
                        {selectedType === type.key && (
                          <p className="text-[10px] mt-1 opacity-70 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selected
                          </p>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Template preview toggle */}
                  {selectedType && (
                    <div className="border border-blue-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {loadingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          {loadingPreview ? "Loading preview…" : "Template Preview"}
                        </span>
                        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {showPreview && templatePreview && (
                        <div
                          className="max-h-80 overflow-auto p-4 bg-surface text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: templatePreview }}
                        />
                      )}
                      {showPreview && !templatePreview && !loadingPreview && (
                        <div className="p-4 text-xs text-text-secondary text-center">No preview available.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── My Files tab ── */}
          {templateSource === "myfiles" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <FolderOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Reuse one of your previously uploaded legal forms as the starting template for this document.
                  The file content will be loaded directly into the editor — no AI involved.
                  <strong className="block mt-1">Go to My Files to upload new templates.</strong>
                </p>
              </div>

              {myFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-border rounded-xl">
                  <FolderOpen className="w-10 h-10 text-text-tertiary mb-3 opacity-40" />
                  <p className="text-sm font-semibold text-text-primary mb-1">No files in My Files yet</p>
                  <p className="text-xs text-text-secondary mb-4 max-w-xs">
                    Upload your own legal forms, contracts, or templates in My Files and they&apos;ll appear here for reuse.
                  </p>
                  <Link
                    href="/my-files"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Go to My Files
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                    <input
                      type="text"
                      value={myFileSearch}
                      onChange={(e) => setMyFileSearch(e.target.value)}
                      placeholder="Search your files…"
                      className="input pl-9 text-sm w-full"
                    />
                  </div>

                  {/* File list */}
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {myFiles
                      .filter((f) => !myFileSearch || f.name.toLowerCase().includes(myFileSearch.toLowerCase()))
                      .map((file) => (
                        <button
                          key={file.id}
                          onClick={() => {
                            setSelectedMyFile(file);
                            setTitle(file.name.replace(/\.[^.]+$/, ""));
                            setShowMyFilePreview(false);
                            try {
                              const decoded = atob(file.content.split(",")[1] || "");
                              const preview = decoded.startsWith("<")
                                ? decoded
                                : `<p>${decoded.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
                              setMyFilePreview(preview);
                            } catch { setMyFilePreview(null); }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                            selectedMyFile?.id === file.id
                              ? "border-amber-400 bg-amber-50 shadow-sm"
                              : "border-border hover:border-amber-300 hover:bg-amber-50/40"
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            selectedMyFile?.id === file.id ? "bg-amber-100 text-amber-600" : "bg-surface-secondary text-text-tertiary"
                          )}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                            <p className="text-[10px] text-text-tertiary flex items-center gap-2 mt-0.5">
                              <HardDrive className="w-3 h-3" />{formatFileSize(file.size)}
                              <Clock className="w-3 h-3 ml-1" />{formatDate(file.uploadedAt)}
                              <span className="capitalize">{file.category.replace("-", " ")}</span>
                            </p>
                          </div>
                          {selectedMyFile?.id === file.id && (
                            <Check className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    {myFiles.filter((f) => !myFileSearch || f.name.toLowerCase().includes(myFileSearch.toLowerCase())).length === 0 && (
                      <p className="text-xs text-text-secondary text-center py-6">No files match your search.</p>
                    )}
                  </div>

                  {/* Preview for selected my-file */}
                  {selectedMyFile && myFilePreview && (
                    <div className="border border-amber-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowMyFilePreview(!showMyFilePreview)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5" />
                          Preview: {selectedMyFile.name}
                        </span>
                        {showMyFilePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {showMyFilePreview && (
                        <div
                          className="max-h-80 overflow-auto p-4 bg-surface text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: myFilePreview }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── AI MODE ────────────────────────────────────────────────── */}
      {mode === "ai" && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
            <Brain className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
            <p className="text-xs text-primary-700">
              Describe what you need and the AI will draft a complete,
              Philippine-law-compliant document. Select a type below for better accuracy, then add specific details in the prompt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: document type picker */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Document Type</label>
              <div className="flex gap-1.5 flex-wrap">
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => { setSelectedCategory(cat.category); setSelectedType(null); setSelectedTypeLabel(""); }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      selectedCategory === cat.category
                        ? "bg-primary-600 text-white border-primary-600"
                        : "border-border text-text-secondary hover:border-primary-300"
                    )}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1 max-h-52 overflow-auto pr-1">
                {currentCategory?.types.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => selectType(type.key, type.label)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border transition-colors",
                      selectedType === type.key
                        ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                        : "border-border hover:bg-surface-secondary text-text-secondary"
                    )}
                  >
                    {selectedType === type.key ? <Check className="w-3 h-3 text-primary-600 shrink-0" /> : <span className="w-3" />}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: prompt + options */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Describe What You Need
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`e.g. "Complaint for breach of a lease contract. Plaintiff: Juan dela Cruz. Defendant: ABC Corporation. The defendant failed to pay rent for 6 months totalling ₱360,000."`}
                  rows={5}
                  className="w-full input resize-none text-sm leading-relaxed"
                />
                <p className="text-[10px] text-text-tertiary mt-1">
                  The more detail you provide, the more accurate the output.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setAiTone(t.value)}
                      className={cn(
                        "p-2.5 rounded-lg border text-left transition-colors",
                        aiTone === t.value ? "border-primary-400 bg-primary-50 text-primary-700" : "border-border hover:bg-surface-secondary text-text-secondary"
                      )}
                    >
                      <p className="text-xs font-semibold">{t.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-70">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Length</label>
                <div className="grid grid-cols-3 gap-2">
                  {AI_LENGTHS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setAiLength(l.value)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition-colors",
                        aiLength === l.value ? "border-primary-400 bg-primary-50 text-primary-700" : "border-border hover:bg-surface-secondary text-text-secondary"
                      )}
                    >
                      <p className="text-xs font-semibold">{l.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-70">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Jurisdiction</label>
                <select value={aiJurisdiction} onChange={(e) => setAiJurisdiction(e.target.value)} className="input w-full text-sm" title="Jurisdiction">
                  <option value="Philippines">Philippines (default)</option>
                  <option value="Metro Manila">Metro Manila</option>
                  <option value="Cebu">Cebu</option>
                  <option value="Davao">Davao</option>
                  <option value="Iloilo">Iloilo</option>
                </select>
              </div>
            </div>
          </div>

          {aiStep === "generating" && (
            <div className="flex items-center gap-3 px-4 py-3 bg-primary-50 border border-primary-200 rounded-xl">
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary-700">DeepSeek is drafting your document…</p>
                <p className="text-xs text-primary-600 mt-0.5">This usually takes 15–30 seconds. Don&apos;t close the page.</p>
              </div>
            </div>
          )}
          {aiStep === "done" && (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-700">Document generated! Opening editor…</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Footer: title + action */}
      <div className="border-t border-border pt-6 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              mode === "ai"
                ? "Enter a title or leave blank to auto-name"
                : selectedTypeLabel
                ? `Untitled ${selectedTypeLabel}`
                : "Enter document title…"
            }
            className="input w-full"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/documents" className="px-5 py-2.5 rounded-xl border border-border text-sm hover:bg-surface-secondary transition-colors">
            Cancel
          </Link>

          {mode === "blank" && (
            <button
              onClick={() => handleCreate()}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {creating ? "Creating…" : "Create Blank"}
            </button>
          )}
          {mode === "template" && (
            <button
              onClick={handleUseTemplate}
              disabled={creating || (templateSource === "official" ? !selectedType : !selectedMyFile)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {creating
                ? "Loading…"
                : templateSource === "myfiles" && selectedMyFile
                ? `Use "${selectedMyFile.name.replace(/\.[^.]+$/, "").slice(0, 20)}${selectedMyFile.name.length > 24 ? "…" : ""}"`
                : "Use This Template"}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {mode === "ai" && (
            <button
              onClick={handleGenerateWithAI}
              disabled={generatingAI || aiStep === "done"}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : aiStep === "done" ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {generatingAI ? "Generating…" : aiStep === "done" ? "Opening Editor" : "Generate with AI"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
