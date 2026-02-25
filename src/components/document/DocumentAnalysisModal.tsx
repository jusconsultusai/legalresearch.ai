"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Search,
  Trash2,
  FileImage,
  FileScan,
  Scale,
  BookOpen,
  Lightbulb,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Gavel,
  Info,
  RefreshCw,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  documentType: string;
  documentCategory: string;
  summary: string;
  overallScore: number;
  issues: AnalysisIssue[];
  improvements: AnalysisImprovement[];
  legalReferences: LegalReference[];
  jurisprudenceSuggestions: JurisprudenceSuggestion[];
  readabilitySuggestions: ReadabilitySuggestion;
  keyTerms: string[];
  aiSuggestions: AISuggestion[];
  extractedText?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
    dateDetected?: string;
    ocrConfidence?: number;
  };
}

interface AnalysisIssue {
  severity: "critical" | "major" | "minor";
  category: string;
  description: string;
  location?: string;
  suggestion: string;
  originalText?: string;
  suggestedText?: string;
}

interface AnalysisImprovement {
  area: string;
  currentState: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
  current?: string;
  suggested?: string;
}

interface LegalReference {
  citation: string;
  fullCitation?: string;
  relevance: string;
  type: "statute" | "case" | "regulation" | "jurisprudence" | "other";
  summary?: string;
}

interface JurisprudenceSuggestion {
  caseName: string;
  citation: string;
  court: string;
  year: string;
  relevantPrinciple: string;
  howToApply: string;
  confidence: "high" | "medium" | "low";
}

interface ReadabilitySuggestion {
  targetAudience: string;
  currentReadability: string;
  suggestions: string[];
  rewrittenSections?: {
    original: string;
    simplified: string;
    reason: string;
  }[];
}

export interface AISuggestion {
  id: string;
  type: "grammar" | "legal" | "style" | "clarity" | "jurisprudence";
  original: string;
  suggested: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

type SuggestionFilterType = "all" | "grammar" | "legal" | "clarity";

export interface DocumentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
  onAutoPopulateSuggestions?: (suggestions: AISuggestion[]) => void;
  onApplySuggestion?: (suggestion: AISuggestion) => void;
  onInsertAnalysis?: (analysis: AnalysisResult) => void;
  /** Toast callback aligned with the editor page's built-in toast */
  showToast?: (text: string, type?: "success" | "error" | "info") => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentAnalysisModal({
  isOpen,
  onClose,
  onInsertText,
  onAutoPopulateSuggestions,
  onApplySuggestion,
  onInsertAnalysis,
  showToast,
}: DocumentAnalysisModalProps) {
  const notify = useCallback(
    (text: string, type: "success" | "error" | "info" = "info") => {
      if (showToast) {
        showToast(text, type);
      } else {
        // fallback — browser alert for standalone use
        if (type === "error") console.error(text);
        else console.info(text);
      }
    },
    [showToast]
  );

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "results" | "jurisprudence" | "text">("upload");
  const [extractedText, setExtractedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["issues", "improvements", "aiSuggestions"])
  );
  const [suggestionFilter, setSuggestionFilter] = useState<SuggestionFilterType>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
  }, []); // eslint-disable-line

  const handleFileSelection = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "txt"];
    if (!allowed.includes(ext)) {
      notify("Please upload a PDF, image (PNG/JPG), Word document, or text file.", "error");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      notify("File size must be less than 10 MB.", "error");
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview("");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
  };

  // ── Full AI analysis ────────────────────────────────────────────────────────
  const analyzeDocument = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setActiveTab("results");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("extractText", "true");
      fd.append("analyzeContent", "true");

      const res = await fetch("/api/ai/analyze-document", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.analysis);
        const text: string = data.extractedText || data.analysis?.extractedText || "";
        setExtractedText(text);
        if (onAutoPopulateSuggestions && data.analysis?.aiSuggestions?.length) {
          onAutoPopulateSuggestions(data.analysis.aiSuggestions);
        }
        if (onInsertText && text) {
          onInsertText(text);
          const words = text.trim().split(/\s+/).length;
          notify(
            `Document analyzed — ${text.length} characters (${words} words) inserted into editor.`,
            "success"
          );
        } else {
          notify("Document analyzed successfully.", "success");
        }
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (err: any) {
      notify(`Analysis failed: ${err.message}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Text extraction only ────────────────────────────────────────────────────
  const extractTextOnly = async () => {
    if (!file) return;
    setIsExtracting(true);
    notify("Extracting text from document…", "info");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("extractText", "true");
      fd.append("analyzeContent", "false");

      const res = await fetch("/api/ai/analyze-document", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Text extraction failed");
      }
      const data = await res.json();
      if (data.success && data.extractedText) {
        if (onInsertText) {
          onInsertText(data.extractedText);
          const words = data.extractedText.trim().split(/\s+/).length;
          notify(
            `Extracted ${data.extractedText.length} characters (${words} words) — inserted into editor.`,
            "success"
          );
          onClose();
        } else {
          setExtractedText(data.extractedText);
          setActiveTab("text");
          notify("Text extracted successfully.", "success");
        }
      } else {
        throw new Error(data.error || "No text extracted");
      }
    } catch (err: any) {
      notify(`Text extraction failed: ${err.message}`, "error");
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Refresh AI suggestions ──────────────────────────────────────────────────
  const refreshSuggestions = async () => {
    const textToAnalyze = extractedText || analysisResult?.extractedText || "";
    if (textToAnalyze.trim().length < 20) {
      notify("Not enough extracted content to generate suggestions.", "error");
      return;
    }
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "suggestions",
          details: {
            prompt: `Analyze this Philippine legal document and return ONLY a JSON array of improvement suggestions with these fields per item: id (string), type (grammar|legal|clarity), original (text to replace), suggested (replacement), reason, severity (high|medium|low).\n\nDocument:\n${textToAnalyze.substring(0, 5000)}`,
            title: "Suggestions",
          },
          tone: "formal",
          length: "medium",
          jurisdiction: "Philippines",
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (data.content && analysisResult) {
        let parsed: AISuggestion[] = [];
        try {
          const match = (data.content as string).match(/\[\s*\{[\s\S]*?\}\s*\]/);
          if (match) parsed = JSON.parse(match[0]);
        } catch { /* ignore parse errors */ }
        setAnalysisResult({ ...analysisResult, aiSuggestions: parsed });
        notify(`Refreshed: ${parsed.length} suggestions generated.`, "success");
      }
    } catch (err: any) {
      notify(`Refresh failed: ${err.message}`, "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-700 border-red-200";
      case "major": return "bg-orange-100 text-orange-700 border-orange-200";
      case "minor": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "high": return "bg-red-100 text-red-700";
      case "medium": return "bg-orange-100 text-orange-700";
      case "low": return "bg-green-100 text-green-700";
      default: return "bg-surface-secondary text-text-secondary";
    }
  };

  const getScoreColor = (score: number) =>
    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  const getScoreRing = (score: number) =>
    score >= 80 ? "ring-green-500" : score >= 60 ? "ring-yellow-500" : "ring-red-500";

  const getConfidenceColor = (c: string) => {
    switch (c) {
      case "high": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-orange-100 text-orange-700";
      default: return "bg-surface-secondary text-text-secondary";
    }
  };

  const getFilteredSuggestions = (): AISuggestion[] => {
    const all = analysisResult?.aiSuggestions ?? [];
    if (suggestionFilter === "grammar") return all.filter((s) => s.type === "grammar" || s.type === "style");
    if (suggestionFilter === "legal") return all.filter((s) => s.type === "legal" || s.type === "jurisprudence");
    if (suggestionFilter === "clarity") return all.filter((s) => s.type === "clarity");
    return all;
  };

  const resetModal = () => {
    setFile(null);
    setFilePreview("");
    setAnalysisResult(null);
    setExtractedText("");
    setActiveTab("upload");
    setSuggestionFilter("all");
  };

  const handleApplySuggestion = (s: AISuggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(s);
      if (analysisResult) {
        setAnalysisResult({
          ...analysisResult,
          aiSuggestions: analysisResult.aiSuggestions.filter((x) => x.id !== s.id),
        });
      }
    }
  };

  const insertTextToEditor = () => {
    if (extractedText && onInsertText) {
      onInsertText(extractedText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Extraction loading overlay */}
        {isExtracting && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="relative">
                <Loader2 className="w-14 h-14 text-green-600 animate-spin" />
                <FileText className="w-7 h-7 text-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-text-primary mb-1">Extracting text…</h3>
                <p className="text-sm text-text-secondary">Reading document and preparing for insertion</p>
                <p className="mt-3 text-xs text-green-600 flex items-center gap-1 justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No AI — fast extraction
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl">
              <FileScan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Document Analysis</h2>
              <p className="text-xs text-text-secondary">AI-powered legal document review with text extraction</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {file && (
              <button onClick={resetModal} className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors text-text-tertiary" title="Clear">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {(["upload", "results", "jurisprudence", "text"] as const).map((tab) => {
            const disabled =
              (tab === "results" && !analysisResult) ||
              (tab === "jurisprudence" && (!analysisResult?.jurisprudenceSuggestions?.length && !analysisResult?.legalReferences?.length)) ||
              (tab === "text" && !extractedText);
            const icons: Record<typeof tab, React.ReactNode> = {
              upload: <Upload className="w-3.5 h-3.5 inline-block mr-1.5" />,
              results: <Search className="w-3.5 h-3.5 inline-block mr-1.5" />,
              jurisprudence: <Gavel className="w-3.5 h-3.5 inline-block mr-1.5" />,
              text: <FileText className="w-3.5 h-3.5 inline-block mr-1.5" />,
            };
            const labels: Record<typeof tab, string> = {
              upload: "Upload",
              results: "Analysis",
              jurisprudence: "Jurisprudence",
              text: "Extracted Text",
            };
            return (
              <button
                key={tab}
                onClick={() => !disabled && setActiveTab(tab)}
                disabled={disabled}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "text-primary-600 border-b-2 border-primary-600"
                    : "text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {icons[tab]}{labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Upload Tab ── */}
          {activeTab === "upload" && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-primary-500 bg-primary-50"
                    : file
                    ? "border-green-500 bg-green-50"
                    : "border-border hover:border-primary-400 hover:bg-surface-secondary"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInput}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-3">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg shadow" />
                    ) : (
                      <FileText className="w-14 h-14 mx-auto text-green-500" />
                    )}
                    <p className="text-base font-medium text-text-primary">{file.name}</p>
                    <p className="text-xs text-text-secondary">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "Unknown type"}
                    </p>
                    <CheckCircle2 className="w-7 h-7 mx-auto text-green-500" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-4">
                      <FileImage className="w-11 h-11 text-text-tertiary" />
                      <FileText className="w-11 h-11 text-text-tertiary" />
                    </div>
                    <p className="text-base font-medium text-text-secondary">Drop your legal document here</p>
                    <p className="text-xs text-text-tertiary">or click to browse</p>
                    <p className="text-xs text-text-tertiary">PDF, DOCX, DOC, TXT, JPG, PNG (max 10 MB)</p>
                  </div>
                )}
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl">
                  <Scale className="w-5 h-5 text-blue-600 mb-2" />
                  <h4 className="text-sm font-medium text-text-primary">Legal Analysis</h4>
                  <p className="text-xs text-text-secondary mt-1">Deep review of legal content and compliance</p>
                </div>
                <div className="p-4 bg-linear-to-br from-purple-50 to-pink-50 rounded-xl">
                  <Gavel className="w-5 h-5 text-purple-600 mb-2" />
                  <h4 className="text-sm font-medium text-text-primary">Jurisprudence</h4>
                  <p className="text-xs text-text-secondary mt-1">Relevant Supreme Court cases suggested</p>
                </div>
                <div className="p-4 bg-linear-to-br from-green-50 to-emerald-50 rounded-xl">
                  <Lightbulb className="w-5 h-5 text-green-600 mb-2" />
                  <h4 className="text-sm font-medium text-text-primary">AI Suggestions</h4>
                  <p className="text-xs text-text-secondary mt-1">Auto-generated improvements for clarity</p>
                </div>
              </div>

              {/* Action buttons */}
              {file && (
                <>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={extractTextOnly}
                      disabled={isExtracting || isAnalyzing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
                    >
                      {isExtracting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Extracting…</>
                      ) : (
                        <><FileText className="w-4 h-4" /> Extract Text Only</>
                      )}
                    </button>
                    <button
                      onClick={analyzeDocument}
                      disabled={isAnalyzing || isExtracting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
                    >
                      {isAnalyzing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI…</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Analyze with AI</>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <strong>Extract Text Only</strong> — fast, no AI, inserts raw text into editor. &nbsp;
                      <strong>Analyze with AI</strong> — full AI review with issues, improvements, and jurisprudence.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Results Tab ── */}
          {activeTab === "results" && (
            <div className="space-y-5">
              {isAnalyzing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 mx-auto text-primary-500 animate-spin" />
                  <p className="mt-4 text-sm text-text-secondary">Analyzing document with AI…</p>
                  <p className="text-xs text-text-tertiary">Extracting text, identifying issues, finding jurisprudence</p>
                  <p className="mt-2 text-xs text-amber-600 font-medium">This may take up to a minute</p>
                </div>
              ) : analysisResult ? (
                <>
                  {/* Score + summary */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className={`bg-surface-secondary rounded-xl p-5 text-center ring-4 ring-opacity-30 ${getScoreRing(analysisResult.overallScore)}`}>
                      <p className="text-xs text-text-secondary mb-1">Quality Score</p>
                      <p className={`text-4xl font-bold ${getScoreColor(analysisResult.overallScore)}`}>
                        {analysisResult.overallScore}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">/100</p>
                    </div>
                    <div className="col-span-3 bg-surface-secondary rounded-xl p-5">
                      <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-widest">
                        {analysisResult.documentCategory?.replace("_", " ") || "Document"}
                      </span>
                      <p className="text-base font-semibold text-text-primary mt-1">{analysisResult.documentType}</p>
                      <p className="text-xs text-text-secondary mt-2 leading-relaxed">{analysisResult.summary}</p>
                      {analysisResult.metadata && (
                        <div className="flex gap-4 mt-3 text-xs text-text-tertiary">
                          {analysisResult.metadata.wordCount && <span>📝 {analysisResult.metadata.wordCount.toLocaleString()} words</span>}
                          {analysisResult.metadata.pageCount && <span>📄 ~{analysisResult.metadata.pageCount} pages</span>}
                          {analysisResult.metadata.language && <span>🌐 {analysisResult.metadata.language}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key terms */}
                  {analysisResult.keyTerms?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.keyTerms.slice(0, 10).map((t, i) => (
                        <span key={i} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Issues */}
                  {analysisResult.issues?.length > 0 && (
                    <div className="bg-white rounded-xl border border-border">
                      <button onClick={() => toggleSection("issues")} className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold text-text-primary">Issues Found ({analysisResult.issues.length})</span>
                          <span className="text-xs text-red-600">{analysisResult.issues.filter((i) => i.severity === "critical").length} critical</span>
                        </div>
                        {expandedSections.has("issues") ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
                      </button>
                      {expandedSections.has("issues") && (
                        <div className="px-4 pb-4 space-y-3">
                          {analysisResult.issues.map((issue, i) => (
                            <div key={i} className={`rounded-xl p-4 border ${getSeverityColor(issue.severity)}`}>
                              <div className="flex items-start gap-3">
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-current/10">{issue.severity}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{issue.category}</p>
                                  <p className="text-xs mt-1 opacity-80">{issue.description}</p>
                                  {issue.location && <p className="text-[10px] mt-1 opacity-60">📍 {issue.location}</p>}
                                  <div className="mt-3 p-3 bg-white/60 rounded-lg">
                                    <p className="text-xs font-medium text-green-700 mb-1">💡 Suggestion:</p>
                                    <p className="text-xs">{issue.suggestion}</p>
                                    {issue.originalText && issue.suggestedText && (
                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-red-50 rounded text-xs">
                                          <span className="text-red-600 font-medium">Original:</span>
                                          <p className="mt-1 wrap-break-word">{issue.originalText}</p>
                                        </div>
                                        <div className="p-2 bg-green-50 rounded text-xs">
                                          <span className="text-green-600 font-medium">Suggested:</span>
                                          <p className="mt-1 wrap-break-word">{issue.suggestedText}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {(analysisResult.aiSuggestions?.length ?? 0) > 0 && (
                    <div className="bg-white rounded-xl border border-border">
                      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
                        <button onClick={() => toggleSection("aiSuggestions")} className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-text-primary">
                            AI Suggestions ({getFilteredSuggestions().length})
                          </span>
                          {expandedSections.has("aiSuggestions") ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
                        </button>
                        <div className="flex items-center gap-2">
                          <select
                            value={suggestionFilter}
                            onChange={(e) => setSuggestionFilter(e.target.value as SuggestionFilterType)}
                            className="text-xs px-3 py-1.5 bg-white border border-border rounded-lg text-text-secondary"
                          >
                            <option value="all">All</option>
                            <option value="grammar">Grammar & Style</option>
                            <option value="legal">Legal Review</option>
                            <option value="clarity">Clarity</option>
                          </select>
                          <button
                            onClick={refreshSuggestions}
                            disabled={isRefreshing}
                            className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                            Refresh
                          </button>
                        </div>
                      </div>
                      {expandedSections.has("aiSuggestions") && (
                        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                          {getFilteredSuggestions().map((s) => (
                            <div key={s.id} className="bg-linear-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(s.severity)}`}>{s.type}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(s.severity)}`}>{s.severity}</span>
                                  </div>
                                  <p className="text-xs text-text-secondary mt-2"><strong>Reason:</strong> {s.reason}</p>
                                  {s.original && s.suggested && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      <div className="p-2 bg-white/60 rounded text-xs">
                                        <span className="text-red-600 font-medium">Original:</span>
                                        <p className="mt-1 wrap-break-word">{s.original}</p>
                                      </div>
                                      <div className="p-2 bg-green-100/60 rounded text-xs">
                                        <span className="text-green-600 font-medium">Suggested:</span>
                                        <p className="mt-1 wrap-break-word">{s.suggested}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {onApplySuggestion && s.original && s.suggested && (
                                  <button
                                    onClick={() => handleApplySuggestion(s)}
                                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shrink-0"
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {getFilteredSuggestions().length === 0 && (
                            <p className="text-xs text-center text-text-tertiary py-4">No {suggestionFilter !== "all" ? suggestionFilter : ""} suggestions.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 mx-auto text-text-tertiary" />
                  <p className="mt-4 text-sm text-text-secondary">No analysis results yet</p>
                  <p className="text-xs text-text-tertiary">Upload and analyze a document first</p>
                </div>
              )}
            </div>
          )}

          {/* ── Jurisprudence Tab ── */}
          {activeTab === "jurisprudence" && analysisResult && (
            <div className="space-y-6">
              {analysisResult.jurisprudenceSuggestions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-purple-500" /> Suggested Jurisprudence
                  </h3>
                  <div className="space-y-3">
                    {analysisResult.jurisprudenceSuggestions.map((j, i) => (
                      <div key={i} className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(j.confidence)}`}>
                                {j.confidence} confidence
                              </span>
                              <span className="text-xs text-text-tertiary">{j.year} · {j.court}</span>
                            </div>
                            <p className="text-sm font-semibold text-text-primary mt-2">{j.caseName}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{j.citation}</p>
                            <div className="mt-3">
                              <p className="text-xs font-medium text-purple-700">Relevant Principle:</p>
                              <p className="text-xs text-text-secondary mt-1">{j.relevantPrinciple}</p>
                            </div>
                            <div className="mt-2">
                              <p className="text-xs font-medium text-purple-700">How to Apply:</p>
                              <p className="text-xs text-text-secondary mt-1">{j.howToApply}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`${j.caseName}, ${j.citation}`, `juris-${i}`)}
                            className="p-2 hover:bg-white/60 rounded-lg transition-colors shrink-0"
                          >
                            {copiedId === `juris-${i}` ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-text-tertiary" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.legalReferences?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" /> Legal References Found
                  </h3>
                  <div className="space-y-3">
                    {analysisResult.legalReferences.map((ref, i) => (
                      <div key={i} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-200 text-blue-700">{ref.type}</span>
                            <p className="text-sm font-medium text-text-primary mt-2 wrap-break-word">{ref.fullCitation || ref.citation}</p>
                            <p className="text-xs text-text-secondary mt-1">{ref.relevance}</p>
                            {ref.summary && <p className="text-xs text-text-tertiary mt-2 italic">{ref.summary}</p>}
                          </div>
                          <button
                            onClick={() => copyToClipboard(ref.fullCitation || ref.citation, `ref-${i}`)}
                            className="p-2 hover:bg-white/60 rounded-lg transition-colors shrink-0"
                          >
                            {copiedId === `ref-${i}` ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-text-tertiary" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!analysisResult.jurisprudenceSuggestions?.length && !analysisResult.legalReferences?.length && (
                <div className="text-center py-12">
                  <Scale className="w-12 h-12 mx-auto text-text-tertiary" />
                  <p className="mt-4 text-sm text-text-secondary">No jurisprudence or references found</p>
                </div>
              )}
            </div>
          )}

          {/* ── Extracted Text Tab ── */}
          {activeTab === "text" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Extracted Text</h3>
                  <p className="text-xs text-text-tertiary">
                    {(extractedText.trim().split(/\s+/).length).toLocaleString()} words ·{" "}
                    OCR confidence: {analysisResult?.metadata?.ocrConfidence ?? 100}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(extractedText, "extracted-text")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-secondary text-text-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                  >
                    {copiedId === "extracted-text" ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy All</>}
                  </button>
                  {onInsertText && (
                    <button
                      onClick={insertTextToEditor}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> Insert to Editor
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-surface-secondary rounded-xl p-5 max-h-[50vh] overflow-y-auto border border-border">
                <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                  {extractedText || "No text extracted."}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-surface-secondary px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-text-secondary border border-border rounded-xl hover:bg-white transition-colors"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {extractedText && onInsertText && (
                <button
                  onClick={insertTextToEditor}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs bg-surface-tertiary text-text-primary rounded-xl font-medium hover:bg-white transition-all border border-border"
                >
                  <FileText className="w-3.5 h-3.5" /> Insert Text Only
                </button>
              )}
              {analysisResult && onInsertAnalysis && (
                <button
                  onClick={() => {
                    onInsertAnalysis(analysisResult);
                    if (onAutoPopulateSuggestions && analysisResult.aiSuggestions) {
                      onAutoPopulateSuggestions(analysisResult.aiSuggestions);
                    }
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Insert with Analysis
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
