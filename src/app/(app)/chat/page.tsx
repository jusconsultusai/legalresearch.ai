"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Send, Scale, ThumbsUp, ThumbsDown, MessageSquare, FileText, BookOpen,
  Clock, X, ArrowRight, Calendar, SortAsc, Loader2, AlertCircle,
  Search, Lightbulb, PenTool, BookOpenCheck, BarChart3, Brain,
  Paperclip, ToggleLeft, ToggleRight, Sparkles, Check, ChevronDown, ListChecks,
} from "lucide-react";
import { useChatManagement } from "@/stores";
import DocumentAnalysisModal from "@/components/document/DocumentAnalysisModal";

/* ---------- Types ---------- */

interface RAGSource {
  documentId: string; title: string; category: string; subcategory: string;
  number?: string; date?: string; summary?: string; relevantText: string;
  score: number; relativePath?: string;
}
interface DeepSearchStep {
  type: "decompose" | "search" | "evaluate" | "synthesize";
  label: string;
  detail: string;
  startedAt: number;
  completedAt?: number;
}
interface DeepSearchMeta {
  subQueries?: string[];
  totalSourcesScanned?: number;
  steps?: DeepSearchStep[];
}
interface ChatMessage {
  id: string; chatId: string; role: "user" | "assistant";
  content: string; sources?: RAGSource[]; createdAt: string;
  deepSearchMeta?: DeepSearchMeta;
}
interface Chat {
  id: string; title: string; mode: string; sources: string;
  createdAt: string; updatedAt: string; messages: ChatMessage[];
}
type ChatMode = "find" | "explain" | "draft" | "digest" | "analyze";
type ContextVersion = "standard_v2" | "standard" | "context_v1" | "concise" | "professional" | "educational" | "simple";
type DigestFormat = "IRAC" | "standard";

/* ---------- Config ---------- */

const MODES: { id: ChatMode; icon: typeof Search; label: string; description: string }[] = [
  { id: "find",    icon: Search,        label: "Find",    description: "Search legal documents" },
  { id: "explain", icon: Lightbulb,     label: "Explain", description: "Get plain-language explanations" },
  { id: "draft",   icon: PenTool,       label: "Draft",   description: "Generate legal documents & letters" },
  { id: "digest",  icon: BookOpenCheck, label: "Digest",  description: "Structured case / law digest" },
  { id: "analyze", icon: BarChart3,     label: "Analyze", description: "In-depth legal analysis" },
];

const MODE_PREFIXES: Record<ChatMode, string> = {
  find:    "Find: ",
  explain: "Explain: ",
  draft:   "Draft: ",
  digest:  "Digest: ",
  analyze: "Analyze: ",
};

const CONTEXT_VERSIONS: { id: ContextVersion; label: string; description: string; isNew?: boolean }[] = [
  { id: "context_v1",   label: "Context Aware v1",              description: "Context-aware multi-turn conversations that remember prior exchanges for deeper analysis" },
  { id: "standard_v2",  label: "Standard v2",      isNew: true,  description: "For maximum legal accuracy and clarity, powered by our upgraded system" },
  { id: "standard",     label: "Standard",                       description: "Our classic JusConsultus experience — kept for those who prefer its original tone and flow. For maximum accuracy, try Standard v2" },
  { id: "concise",      label: "Concise",                        description: "For lawyers and professionals needing ultra-efficient legal summaries" },
  { id: "professional", label: "Professional",                   description: "For legal practitioners who need detailed legal analysis, risk assessments, and practical guidance" },
  { id: "educational",  label: "Educational",                    description: "For law students, bar examinees, and legal scholars" },
  { id: "simple",       label: "Simple English",                  description: "For non-lawyers, the general public, and individuals with limited legal knowledge" },
];

type CapabilityAction =
  | { type: "mode"; mode: ChatMode; prompt?: string }
  | { type: "upload" }
  | { type: "doc-analysis" }
  | { type: "trend-analysis" }
  | { type: "navigate"; path: string }
  | { type: "deep-research"; prompt?: string };

const CAPABILITIES: { icon: typeof Search; label: string; description: string; bg: string; text: string; action: CapabilityAction }[] = [
  { icon: PenTool,       label: "Legal Document Drafting",   description: "Quick-start drafting for any document type — letters, contracts, pleadings, and more. Linked to Document Builder.",
    bg: "bg-purple-100 dark:bg-purple-900/30",  text: "text-purple-600 dark:text-purple-400",
    action: { type: "navigate", path: "/documents/new" } },
  { icon: FileText,      label: "Document Analysis",         description: "Comprehensive AI review that identifies risks, key clauses, and issues in any legal document you upload.",
    bg: "bg-blue-100 dark:bg-blue-900/30",      text: "text-blue-600 dark:text-blue-400",
    action: { type: "doc-analysis" } },
  { icon: BookOpen,      label: "Contextual Legal Research", description: "Vast knowledge database delivering tailored legal insights — identifying relevant case law and regulations instantly.",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",text: "text-emerald-600 dark:text-emerald-400",
    action: { type: "mode", mode: "find", prompt: "Find: " } },
  { icon: Lightbulb,     label: "Pinpoint Citations",        description: "AI-validated answers with pinpoint citations. Click any citation to verify the answer in the underlying primary document.",
    bg: "bg-amber-100 dark:bg-amber-900/30",    text: "text-amber-600 dark:text-amber-400",
    action: { type: "mode", mode: "find", prompt: "Find relevant cases and citations for: " } },
  { icon: Sparkles,      label: "Live Contract Editing",     description: "Redlines, refined. Live contract editing with world-leading Legal AI. Leverage your precedent to review with finesse.",
    bg: "bg-rose-100 dark:bg-rose-900/30",      text: "text-rose-600 dark:text-rose-400",
    action: { type: "navigate", path: "/documents/new" } },
  { icon: BookOpenCheck, label: "Precedent Library",         description: "Leverage every legal document you've ever negotiated or created. Precedents are easily uncovered and re-used through the library.",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",  text: "text-indigo-600 dark:text-indigo-400",
    action: { type: "navigate", path: "/my-files" } },
  { icon: Scale,         label: "Authoritative Sources",     description: "Get answers to research questions using publicly available, authoritative Philippine legal sources.",
    bg: "bg-teal-100 dark:bg-teal-900/30",      text: "text-teal-600 dark:text-teal-400",
    action: { type: "deep-research", prompt: "Find: " } },
  { icon: BarChart3,     label: "Trend & Pattern Analysis",  description: "Identify trends, spot patterns, and answer questions about related documents and contract families across your entire library.",
    bg: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-600 dark:text-orange-400",
    action: { type: "trend-analysis" } },
];

/* ---------- Helpers ---------- */

function renderLegalContent(raw: string): string {
  /* ── Safety: escape user-visible HTML ── */
  let h = raw.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ── Bottom Line callout (before other processing to avoid stripping **) ── */
  h = h.replace(
    /\*\*Bottom[- ]?[Ll]ine[:\s]*\*\*\s*([^\n]+)/g,
    '<div class="flex items-start gap-3 my-4 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/40">' +
      '<span class="shrink-0 mt-0.5 text-lg">⚖️</span>' +
      '<div><p class="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wide mb-1">Bottom Line</p>' +
      '<p class="text-sm text-text-primary leading-relaxed font-medium">$1</p></div></div>'
  );

  /* ── Template citation tags ── */
  h = h.replace(/\{\{law:\s*(.+?)\}\}/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mx-0.5 border border-emerald-200 dark:border-emerald-700/30">📜 $1</span>');
  h = h.replace(/\{\{case:\s*(.+?)\}\}/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold mx-0.5 border border-blue-200 dark:border-blue-700/30">⚖️ $1</span>');

  /* ── Auto-detected legal citations ── */
  // G.R. No. → Jurisprudence badge
  h = h.replace(/\b(G\.?R\.?\s*No\.?\s*[\d,\s-]+(?:\s*\(\d{4}\))?)/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold mx-0.5 border border-blue-200 dark:border-blue-700/30">⚖️ $1</span>');
  // Republic Act / R.A. → Law badge
  h = h.replace(/\b(Republic\s+Act\s*(?:No\.?\s*)?\d+(?:\s*\(\d{4}\))?)/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mx-0.5 border border-emerald-200 dark:border-emerald-700/30">📜 $1</span>');
  h = h.replace(/\b(R\.A\.?\s*(?:No\.?\s*)?\d+(?:\s*\(\d{4}\))?)/g,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mx-0.5 border border-emerald-200 dark:border-emerald-700/30">📜 $1</span>');
  // Presidential Decree / P.D. → Executive badge
  h = h.replace(/\b(Presidential\s+Decree\s*(?:No\.?\s*)?\d+(?:\s*\(\d{4}\))?)/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-semibold mx-0.5 border border-orange-200 dark:border-orange-700/30">🏛️ $1</span>');
  h = h.replace(/\b(P\.D\.?\s*(?:No\.?\s*)?\d+(?:\s*\(\d{4}\))?)/g,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-semibold mx-0.5 border border-orange-200 dark:border-orange-700/30">🏛️ $1</span>');
  // Executive Order / E.O. → Executive badge
  h = h.replace(/\b(Executive\s+Order\s*(?:No\.?\s*)?\d+(?:\s*\(\d{4}\))?)/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-semibold mx-0.5 border border-orange-200 dark:border-orange-700/30">🏛️ $1</span>');
  h = h.replace(/\b(E\.O\.?\s*(?:No\.?\s*)?\d+(?:\s*\(\d{4}\))?)/g,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-semibold mx-0.5 border border-orange-200 dark:border-orange-700/30">🏛️ $1</span>');
  // Batas Pambansa / B.P. → Law badge
  h = h.replace(/\b(Batas\s+Pambansa\s+(?:Blg\.?\s*)?\d+(?:\s*\(\d{4}\))?)/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-xs font-semibold mx-0.5 border border-teal-200 dark:border-teal-700/30">📜 $1</span>');

  /* ── Section headings ── */
  h = h.replace(/^####\s+(.+)$/gm,
    '<p class="text-xs font-bold text-text-secondary uppercase tracking-widest mt-4 mb-1.5">$1</p>');
  h = h.replace(/^###\s+(.+)$/gm,
    '<h4 class="text-sm font-bold text-text-primary mt-5 mb-2 pb-1 border-b border-border/50">$1</h4>');
  h = h.replace(/^##\s+(.+)$/gm,
    '<h3 class="text-base font-bold text-text-primary mt-6 mb-2 pb-1.5 border-b border-border">$1</h3>');
  h = h.replace(/^#\s+(.+)$/gm,
    '<h2 class="text-lg font-bold text-text-primary mt-6 mb-3">$1</h2>');

  /* ── Blockquotes ── */
  h = h.replace(/^&gt;\s*(.+)$/gm,
    '<blockquote class="my-3 pl-4 py-3 border-l-4 border-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-r-lg">' +
      '<p class="text-sm italic text-text-secondary leading-relaxed">$1</p>' +
    '</blockquote>');

  /* ── Inline formatting ── */
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold italic">$1</strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>');
  h = h.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic text-text-secondary">$1</em>');
  h = h.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-secondary dark:bg-surface-tertiary text-[11px] font-mono text-primary-700 dark:text-primary-300 border border-border/50">$1</code>');

  /* ── Lists  ── */
  h = h.replace(/^(\d+)\.\s+(.+)$/gm,
    '<div class="flex gap-3 my-1.5 items-start">' +
      '<span class="shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-bold flex items-center justify-center mt-0.5">$1</span>' +
      '<span class="text-sm text-text-primary leading-relaxed flex-1">$2</span>' +
    '</div>');
  h = h.replace(/^[-*•]\s+(.+)$/gm,
    '<div class="flex gap-3 my-1.5 items-start ml-2">' +
      '<span class="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400 dark:bg-primary-500 mt-2"></span>' +
      '<span class="text-sm text-text-primary leading-relaxed flex-1">$1</span>' +
    '</div>');

  /* ── Horizontal rules ── */
  h = h.replace(/^---+$/gm, '<hr class="my-4 border-border" />');

  /* ── Paragraphs and line breaks ── */
  h = h.replace(/\n\n+/g, '</p><p class="text-sm text-text-primary leading-relaxed my-2.5">');
  h = h.replace(/\n/g, "<br/>");

  return `<div class="legal-content space-y-1"><p class="text-sm text-text-primary leading-relaxed my-2.5">${h}</p></div>`;
}

function extractFollowUps(content: string): { cleanContent: string; topics: string[] } {
  const m = content.match(/##\s*Suggested Follow[- ]?Up Topics?\s*\n([\s\S]*?)$/i);
  if (!m) return { cleanContent: content, topics: [] };
  const cleanContent = content.slice(0, m.index).trim();
  const topics = m[1].trim().split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter((l) => l.length > 3);
  return { cleanContent, topics };
}

/* ================================================================== */
/* CHAT INPUT — defined outside ChatPage so React never remounts it   */
/* ================================================================== */

interface ChatInputProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  sending: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSend: (text?: string) => void;
  activeMode: ChatMode;
  attachedFile: File | null;
  setAttachedFile: (f: File | null) => void;
  onOpenDocAnalysis: () => void;
  fileError: string;
  setFileError: (v: string) => void;
  contextVersion: ContextVersion;
  setContextVersion: (v: ContextVersion) => void;
  showContextDropdown: boolean;
  setShowContextDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  contextDropdownRef: React.RefObject<HTMLDivElement | null>;
  deepThinkEnabled: boolean;
  setDeepThinkEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  handleFileSelect: (f: File) => void;
  compact?: boolean;
}

const ChatInput = memo(function ChatInput({
  inputValue, setInputValue, sending, handleKeyDown, handleSend,
  activeMode, attachedFile, setAttachedFile, onOpenDocAnalysis, fileError, setFileError,
  contextVersion, setContextVersion, showContextDropdown, setShowContextDropdown,
  contextDropdownRef, deepThinkEnabled, setDeepThinkEnabled,
  fileInputRef, textareaRef, handleFileSelect, compact = false,
}: ChatInputProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-sm", compact && "rounded-xl")}>
      <div className="relative p-3 pb-1">
        <textarea
          ref={compact ? undefined : textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={compact ? 2 : 3}
          placeholder={
            activeMode === "draft" ? "Describe the legal document you need..." :
            activeMode === "explain" ? "What legal concept or law would you like explained?" :
            activeMode === "digest" ? "Enter a case name or citation to digest..." :
            activeMode === "analyze" ? "Describe the legal situation you want analyzed..." :
            "Ask a legal question or search for cases, laws, and issuances..."
          }
          className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm resize-none focus:outline-none disabled:opacity-50"
        />
        {!compact && <p className="text-right text-[10px] text-text-tertiary opacity-50 pr-1 pb-1">Shift+Enter for new line</p>}
      </div>

      {attachedFile && (
        <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30">
          <Paperclip className="w-3.5 h-3.5 text-primary-500 shrink-0" />
          <span className="text-xs text-primary-700 dark:text-primary-300 flex-1 truncate">{attachedFile.name}</span>
          <button onClick={onOpenDocAnalysis}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold hover:bg-purple-200 transition-colors shrink-0">
            <Sparkles className="w-3 h-3" /> Full Analysis
          </button>
          <button onClick={() => { setAttachedFile(null); setFileError(""); }}>
            <X className="w-3.5 h-3.5 text-primary-400 hover:text-primary-600" />
          </button>
        </div>
      )}
      {fileError && (
        <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-xs text-red-600 dark:text-red-400 flex-1">{fileError}</span>
          <button onClick={() => setFileError("")}><X className="w-3 h-3 text-red-400" /></button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative group/upload">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors">
              <Paperclip className="w-3.5 h-3.5" />{!compact && <span>Upload</span>}
            </button>
            <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] whitespace-nowrap pointer-events-none opacity-0 group-hover/upload:opacity-100 transition-opacity z-50 shadow-lg">
              Upload up to 10 MB only
              <div className="text-[10px] text-gray-400 mt-0.5">PDF · Word · RTF · HTML · TXT · Images</div>
            </div>
          </div>

          <div className="relative" ref={contextDropdownRef}>
            <button
              onClick={() => setShowContextDropdown((v) => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors select-none whitespace-nowrap",
                showContextDropdown
                  ? "bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300"
                  : "bg-surface-secondary border-border text-text-secondary hover:bg-surface-tertiary hover:text-text-primary")}>
              <span>{CONTEXT_VERSIONS.find((cv) => cv.id === contextVersion)?.label ?? "Standard v2"}</span>
              {CONTEXT_VERSIONS.find((cv) => cv.id === contextVersion)?.isNew && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[9px] font-bold leading-none">New</span>
              )}
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", showContextDropdown && "rotate-180")} />
            </button>
            {showContextDropdown && (
              <div className="absolute top-full mt-2 left-0 z-50 w-120 max-w-[90vw] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-border/50">
                  <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Response Style</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Choose how JusConsultus formats and delivers answers</p>
                </div>
                <div className="grid grid-cols-2 gap-0 p-1">
                  {CONTEXT_VERSIONS.map((cv) => (
                    <button key={cv.id} onClick={() => { setContextVersion(cv.id); setShowContextDropdown(false); }}
                      className={cn("relative text-left px-4 py-3.5 rounded-xl transition-all",
                        contextVersion === cv.id ? "bg-primary-50 dark:bg-primary-900/20" : "hover:bg-surface-secondary")}>
                      {contextVersion === cv.id && <Check className="absolute top-3 right-3 w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />}
                      <div className="flex items-center gap-2 mb-1">
                        <p className={cn("text-xs font-bold", contextVersion === cv.id ? "text-primary-700 dark:text-primary-300" : "text-text-primary")}>{cv.label}</p>
                        {cv.isNew && <span className="px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[9px] font-bold leading-none">New</span>}
                      </div>
                      <p className="text-[11px] text-text-tertiary leading-snug">{cv.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setDeepThinkEnabled((v) => !v)}
            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              deepThinkEnabled ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/30" : "border-transparent text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary")}>
            <Brain className={cn("w-3.5 h-3.5", deepThinkEnabled && "animate-pulse")} />
            {!compact && <span>Deep Think</span>}
            {deepThinkEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
        </div>

        <button onClick={() => handleSend()} disabled={!inputValue.trim() || sending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-900 text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">
          {sending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Thinking...</span></> : <><Send className="w-4 h-4" /><span>Send</span></>}
        </button>
      </div>
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.txt,.html,.htm,.rtf,.jpg,.jpeg,.png,.gif,.webp,.tiff"
        onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
});

/* ================================================================== */
/* COMPONENT                                                           */
/* ================================================================== */

export default function ChatPage() {
  const router = useRouter();
  const { activeChatId, triggerRefresh } = useChatManagement();

  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [deepSearchSteps, setDeepSearchSteps] = useState<DeepSearchStep[]>([]);

  const [activeMode, setActiveMode] = useState<ChatMode>("find");
  const [contextVersion, setContextVersion] = useState<ContextVersion>("standard_v2");
  const [digestFormat, setDigestFormat] = useState<DigestFormat>("IRAC");
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [fileError, setFileError] = useState("");
  const [showDocAnalysis, setShowDocAnalysis] = useState(false);
  // When true, closing the analysis modal after a completed analysis
  // redirects to the document editor instead of staying in chat
  const [docAnalysisRedirectToEditor, setDocAnalysisRedirectToEditor] = useState(false);


  const [lastDeepMeta, setLastDeepMeta] = useState<DeepSearchMeta | null>(null);

  const [selectedSource, setSelectedSource] = useState<RAGSource | null>(null);
  const [sourceTab, setSourceTab] = useState<"fulltext" | "summary">("fulltext");
  const [sourceSummary, setSourceSummary] = useState("");
  const [sourceSummaryLoading, setSourceSummaryLoading] = useState(false);

  const [activeMessageTab, setActiveMessageTab] = useState<Record<string, "answer" | "sources">>({});
  const [sourceSortBy, setSourceSortBy] = useState<"relevance" | "date">("relevance");
  const [sourceFilterType, setSourceFilterType] = useState<"all" | "law" | "jurisprudence">("all");
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (activeChatId) loadChat(activeChatId); }, [activeChatId]); // eslint-disable-line
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* Advance DeepSearch step indicators while waiting for the response */
  useEffect(() => {
    if (!sending) return;
    const STEP_LABELS: DeepSearchStep["type"][] = ["decompose", "search", "evaluate", "synthesize"];
    const STEP_DELAYS = [600, 1800, 3400, 5500];
    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => {
        setDeepSearchSteps((prev) => {
          if (prev.length <= i) return [...prev, { type: STEP_LABELS[i], label: "", detail: "", startedAt: Date.now() }];
          return prev;
        });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [sending]);

  const loadChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chat/${chatId}`);
      if (res.ok) { const d = await res.json(); setCurrentChat(d.chat); setMessages(d.chat.messages || []); setSelectedSource(null); }
    } catch { /* ignore */ }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || inputValue).trim();
    if (!msg || sending) return;
    setInputValue("");
    setSending(true);
    setDeepSearchSteps([{ type: "decompose", label: "", detail: "", startedAt: Date.now() }]);
    setLastDeepMeta(null);
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, chatId: currentChat?.id || "", role: "user", content: msg, createdAt: new Date().toISOString() }]);
    try {
      const res = currentChat
        ? await fetch(`/api/chat/${currentChat.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, chatMode: activeMode, deepThink: deepThinkEnabled }),
          })
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: msg,
              mode: contextVersion,
              chatMode: activeMode,
              digestFormat: activeMode === "digest" ? digestFormat : undefined,
              deepThink: deepThinkEnabled,
              sources: "law,jurisprudence",
            }),
          });
      if (res.ok) {
        const d = await res.json();
        if (d.deepSearchMeta) setLastDeepMeta(d.deepSearchMeta);
        if (d.chat) {
          setCurrentChat(d.chat);
          setMessages(d.chat.messages || []);
          triggerRefresh();
        } else if (d.message) {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== tempId),
            { ...d.message, sources: d.message.sources || [], deepSearchMeta: d.deepSearchMeta },
          ]);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: `err-${Date.now()}`, chatId: currentChat?.id || "", role: "assistant", content: err.error || "An error occurred.", createdAt: new Date().toISOString() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        { id: `err-${Date.now()}`, chatId: currentChat?.id || "", role: "assistant", content: "Network error. Please check your connection.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
      setDeepSearchSteps([]);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleFollowUp = (topic: string) => handleSend(topic);
  const startNewChat = () => { setCurrentChat(null); setMessages([]); setSelectedSource(null); setInputValue(""); textareaRef.current?.focus(); };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_EXTS = [".pdf",".doc",".docx",".txt",".html",".htm",".rtf",".jpg",".jpeg",".png",".gif",".webp",".tiff"];
  const ACCEPTED_MIME = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain","text/html","text/rtf","application/rtf","image/jpeg","image/png","image/gif","image/webp","image/tiff"];

  const handleFileSelect = (file: File) => {
    setFileError("");
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXTS.includes(ext)) { setFileError("Unsupported file type. Please upload PDF, Word, RTF, HTML, TXT, or an image."); return; }
    if (file.size > MAX_FILE_SIZE) { setFileError("File exceeds the 10 MB limit."); return; }
    setAttachedFile(file);
    setShowDocAnalysis(true);
  };

  const openSourceDetail = (source: RAGSource) => { setSelectedSource(source); setSourceTab("fulltext"); setSourceSummary(""); };

  const loadSourceSummary = async (source: RAGSource) => {
    if (!source.relativePath) return;
    setSourceSummaryLoading(true);
    try {
      const res = await fetch("/api/legal-files/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: source.relativePath, title: source.title, number: source.number || "" }) });
      setSourceSummary(res.ok ? (await res.json()).summary || "No summary available." : "Failed to generate summary.");
    } catch { setSourceSummary("Error loading summary."); } finally { setSourceSummaryLoading(false); }
  };

  useEffect(() => { if (sourceTab === "summary" && selectedSource && !sourceSummary) loadSourceSummary(selectedSource); }, [sourceTab, selectedSource]); // eslint-disable-line
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (contextDropdownRef.current && !contextDropdownRef.current.contains(e.target as Node)) setShowContextDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getFilteredSources = useCallback((sources: RAGSource[]) => {
    let f = sources;
    if (sourceFilterType === "law") f = f.filter((s) => s.category === "laws" || s.category === "executive_issuances");
    else if (sourceFilterType === "jurisprudence") f = f.filter((s) => s.category === "supreme_court");
    return sourceSortBy === "date" ? [...f].sort((a, b) => (b.date || "").localeCompare(a.date || "")) : [...f].sort((a, b) => b.score - a.score);
  }, [sourceFilterType, sourceSortBy]);

  const serveUrl = useMemo(() => {
    if (!selectedSource?.relativePath) return "";
    const base = `/api/legal-files/serve?path=${encodeURIComponent(selectedSource.relativePath)}`;
    const hl = selectedSource.relevantText?.trim();
    return hl ? `${base}&highlight=${encodeURIComponent(hl)}` : base;
  }, [selectedSource]);

  const hasMessages = messages.length > 0;

  /* ── Mode click: set mode AND insert prefix into input ── */
  const handleModeClick = (mode: ChatMode) => {
    setActiveMode(mode);
    const allPrefixes = Object.values(MODE_PREFIXES);
    const existingPrefix = allPrefixes.find((p) => inputValue.startsWith(p));
    const rest = existingPrefix ? inputValue.slice(existingPrefix.length) : inputValue;
    setInputValue(MODE_PREFIXES[mode] + rest);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  /* ── Trend & Pattern Analysis: calls dedicated API, injects result as chat message ── */
  const handleTrendAnalysis = async (focusQuery = "") => {
    if (sending) return;
    setSending(true);
    setDeepSearchSteps([{ type: "decompose", label: "", detail: "", startedAt: Date.now() }]);
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        chatId: currentChat?.id || "",
        role: "user",
        content: focusQuery ? `Trend & Pattern Analysis: ${focusQuery}` : "Trend & Pattern Analysis — Scanning my document library…",
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const res = await fetch("/api/ai/trend-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: focusQuery }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.deepSearchMeta) setLastDeepMeta(d.deepSearchMeta);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          {
            id: `trend-${Date.now()}`,
            chatId: currentChat?.id || "",
            role: "assistant",
            content: d.answer,
            sources: d.sources || [],
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: `err-${Date.now()}`, chatId: currentChat?.id || "", role: "assistant", content: err.error || "Trend analysis failed.", createdAt: new Date().toISOString() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        { id: `err-${Date.now()}`, chatId: currentChat?.id || "", role: "assistant", content: "Network error during trend analysis.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
      setDeepSearchSteps([]);
    }
  };

  /* ── Capability card click handler ── */
  const handleCapabilityClick = (action: CapabilityAction) => {
    switch (action.type) {
      case "mode":
        setActiveMode(action.mode);
        setInputValue(action.prompt || MODE_PREFIXES[action.mode]);
        setTimeout(() => textareaRef.current?.focus(), 0);
        break;
      case "upload":
        fileInputRef.current?.click();
        break;
      case "doc-analysis":
        // Trigger file picker; after analysis completes the modal will
        // save results to sessionStorage and navigate to the document editor
        setDocAnalysisRedirectToEditor(true);
        fileInputRef.current?.click();
        break;
      case "navigate":
        router.push(action.path);
        break;
      case "deep-research":
        setActiveMode("find");
        setDeepThinkEnabled(true);
        setInputValue(action.prompt || "Find: ");
        setTimeout(() => textareaRef.current?.focus(), 0);
        break;
      case "trend-analysis":
        handleTrendAnalysis();
        break;
    }
  };

  /* ── Props bundle passed to the external ChatInput component ── */
  const chatInputProps: Omit<ChatInputProps, "compact"> = {
    inputValue, setInputValue, sending, handleKeyDown, handleSend,
    activeMode, attachedFile, setAttachedFile, onOpenDocAnalysis: () => setShowDocAnalysis(true),
    fileError, setFileError,
    contextVersion, setContextVersion, showContextDropdown, setShowContextDropdown,
    contextDropdownRef, deepThinkEnabled, setDeepThinkEnabled,
    fileInputRef, textareaRef, handleFileSelect,
  };

  /* ================================================================== */
  /* RENDER                                                              */
  /* ================================================================== */

  return (
    <>
    <div className="h-full flex bg-surface">

      {/* ===================== MAIN AREA ===================== */}
      <div className={cn("flex flex-col min-w-0", selectedSource ? "w-1/2" : "flex-1")}>

        {!hasMessages ? (
          /* =========== EMPTY / LANDING STATE =========== */
          <div className="flex-1 overflow-auto flex flex-col">

            {/* Hero + input: centered in the visible area */}
            <div className="flex flex-col items-center justify-center flex-none px-4 pt-16 pb-10">
              <div className="w-full max-w-2xl">

                {/* Hero */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2 whitespace-nowrap">Ask and it will be given to you — <span className="text-primary-700 dark:text-primary-400">Ask&nbsp;JusConsultus</span></h1>
                </div>

                {/* Main search box */}
                <ChatInput {...chatInputProps} />

                {/* Mode buttons */}
                <div className="hidden">
                  {MODES.map((mode) => (
                    <button key={mode.id} onClick={() => handleModeClick(mode.id)} title={mode.description}
                      className={cn("flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all",
                        activeMode === mode.id
                          ? "bg-primary-100 dark:bg-primary-600/30 border-primary-300 dark:border-primary-500/50 text-primary-700 dark:text-primary-300"
                          : "bg-surface border-border text-text-secondary hover:bg-surface-tertiary hover:text-text-primary")}>
                      <mode.icon className="w-3.5 h-3.5" /><span>{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Digest format (only when digest mode) */}
                {activeMode === "digest" && (
                  <div className="mt-4 p-3 rounded-xl border border-border bg-surface-secondary">
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpenCheck className="w-3.5 h-3.5 text-primary-500" /> Case Digest Format
                    </p>
                    <div className="flex gap-2">
                      {(["IRAC", "standard"] as DigestFormat[]).map((fmt) => (
                        <button key={fmt} onClick={() => setDigestFormat(fmt)}
                          className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                            digestFormat === fmt ? "bg-primary-700 text-white border-primary-700 shadow" : "bg-surface border-border text-text-secondary hover:border-primary-300")}>
                          <div className="font-bold">{fmt}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{fmt === "IRAC" ? "For Practitioners" : "For Students"}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-2">
                      {digestFormat === "IRAC" ? "Issue → Rule → Application → Conclusion" : "Facts → Issues → Ruling → Doctrine"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Capabilities grid — scrolls below the chat input */}
            <div className="px-4 pb-12">
              <div className="max-w-2xl mx-auto">
                <p className="text-xs font-semibold text-text-tertiary text-center uppercase tracking-wider mb-1">What JusConsultus can do for you</p>
                <p className="text-xs text-text-tertiary text-center mb-6">AI-powered legal work — from research and drafting to analysis and citations</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {CAPABILITIES.map((cap) => (
                    <button
                      key={cap.label}
                      onClick={() => handleCapabilityClick(cap.action)}
                      className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-surface hover:bg-surface-secondary hover:border-primary-300 hover:shadow-md transition-all text-left group cursor-pointer"
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cap.bg)}>
                        <cap.icon className={cn("w-4 h-4", cap.text)} />
                      </div>
                      <p className="text-xs font-bold text-text-primary leading-snug group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{cap.label}</p>
                      <p className="text-[11px] text-text-tertiary leading-relaxed">{cap.description}</p>
                      <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {cap.action.type === "navigate" ? "Open" : cap.action.type === "upload" ? "Upload a file" : "Get started"}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* =========== ACTIVE CHAT =========== */
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface shrink-0">
              <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center">
                <Image src="/logo.png" alt="JusConsultus AI" width={24} height={24} className="rounded-lg" />
              </div>
              <span className="text-sm font-bold text-text-primary flex-1 truncate">{currentChat?.title || "JusConsultus AI"}</span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                activeMode === "find" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                activeMode === "explain" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                activeMode === "draft" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" :
                activeMode === "digest" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300")}>
                {MODES.find((m) => m.id === activeMode)?.label}
              </span>
              {deepThinkEnabled && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                  <Brain className="w-2.5 h-2.5 animate-pulse" /> Deep Think
                </span>
              )}
              <button onClick={startNewChat} className="ml-2 text-xs text-primary-600 dark:text-primary-400 hover:underline">New Chat</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {messages.map((msg) => {
                  if (msg.role === "user") return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[80%] bg-primary-900 text-white rounded-2xl rounded-br-md px-5 py-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );

                  const msgTab = activeMessageTab[msg.id] || "answer";
                  const { cleanContent, topics } = extractFollowUps(msg.content);
                  const sources = msg.sources || [];
                  const filteredSources = getFilteredSources(sources);

                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[90%] w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center">
                            <Image src="/logo.png" alt="JusConsultus AI" width={24} height={24} className="rounded-lg" />
                          </div>
                          <span className="text-xs font-bold text-text-primary">JusConsultus AI</span>
                          <span className="text-[10px] text-text-tertiary">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        {sources.length > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            {(["answer", "sources"] as const).map((tab) => (
                              <button key={tab} onClick={() => setActiveMessageTab((p) => ({ ...p, [msg.id]: tab }))}
                                className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize",
                                  msgTab === tab ? "bg-primary-900 text-white" : "bg-surface-secondary dark:bg-surface-tertiary text-text-secondary hover:text-text-primary")}>
                                {tab === "sources" ? `Sources (${sources.length})` : tab}
                              </button>
                            ))}
                          </div>
                        )}

                        {msgTab === "answer" && (
                          <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                            <div dangerouslySetInnerHTML={{ __html: renderLegalContent(cleanContent) }} />
                            {/* Deep Search meta: sub-queries used */}
                            {msg.deepSearchMeta?.subQueries && msg.deepSearchMeta.subQueries.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-border/50">
                                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Brain className="w-3 h-3" />
                                  Searched {msg.deepSearchMeta.totalSourcesScanned ?? 0} sources via {msg.deepSearchMeta.subQueries.length} queries
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.deepSearchMeta.subQueries.map((q, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-surface-secondary dark:bg-surface-tertiary text-[10px] text-text-secondary border border-border/50">
                                      <Search className="w-2.5 h-2.5 mr-1 text-text-tertiary shrink-0" />{q}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                              <span className="text-xs text-text-tertiary">Was that helpful?</span>
                              <button onClick={() => setFeedback((p) => ({ ...p, [msg.id]: "up" }))} className={cn("p-1.5 rounded-lg transition-colors", feedback[msg.id] === "up" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "hover:bg-surface-secondary text-text-tertiary")}><ThumbsUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setFeedback((p) => ({ ...p, [msg.id]: "down" }))} className={cn("p-1.5 rounded-lg transition-colors", feedback[msg.id] === "down" ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "hover:bg-surface-secondary text-text-tertiary")}><ThumbsDown className="w-3.5 h-3.5" /></button>
                            </div>
                            {topics.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-semibold text-text-tertiary mb-2 uppercase tracking-wide">Explore related topics</p>
                                <div className="flex flex-wrap gap-2">
                                  {topics.map((topic) => (
                                    <button key={topic} onClick={() => handleFollowUp(topic)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-secondary hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 text-xs text-text-secondary hover:text-primary-700 transition-all">
                                      <ArrowRight className="w-3 h-3" />{topic}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        )}

                        {msgTab === "sources" && (
                          <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex items-center gap-1">
                                {(["all", "law", "jurisprudence"] as const).map((type) => (
                                  <button key={type} onClick={() => setSourceFilterType(type)}
                                    className={cn("px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors capitalize",
                                      sourceFilterType === type ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300" : "text-text-tertiary hover:bg-surface-secondary")}>
                                    {type}
                                  </button>
                                ))}
                              </div>
                              <div className="ml-auto">
                                <button onClick={() => setSourceSortBy(sourceSortBy === "relevance" ? "date" : "relevance")}
                                  className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md text-text-tertiary hover:bg-surface-secondary transition-colors">
                                  {sourceSortBy === "relevance" ? <SortAsc className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                  {sourceSortBy === "relevance" ? "Relevance" : "Date"}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {filteredSources.map((source, idx) => (
                                <button key={source.documentId} onClick={() => openSourceDetail(source)}
                                  className={cn("w-full text-left p-3 rounded-lg border transition-all hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/10",
                                    selectedSource?.documentId === source.documentId ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20" : "border-border")}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{idx + 1}</span>
                                    {source.date && <><span className="w-px h-3 bg-border inline-block" /><span className="flex items-center gap-1 text-[10px] text-text-tertiary"><Calendar className="w-2.5 h-2.5" />{source.date}</span></>}
                                    {source.number && <><span className="w-px h-3 bg-border inline-block" /><span className="text-[10px] font-medium text-text-secondary">{source.number}</span></>}
                                  </div>
                                  <p className="text-xs font-semibold text-text-primary line-clamp-2 mb-1">{source.title}</p>
                                  {source.summary && <p className="text-[10px] text-text-tertiary line-clamp-2 leading-relaxed">{source.summary}</p>}
                                  <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium mt-1.5",
                                    source.category === "supreme_court" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300")}>
                                    {source.category === "supreme_court" ? "Jurisprudence" : "Law"}
                                  </span>
                                </button>
                              ))}
                              {filteredSources.length === 0 && <p className="text-xs text-text-tertiary text-center py-4">No sources found for this filter.</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center">
                          <Image src="/logo.png" alt="JusConsultus AI" width={24} height={24} className="rounded-lg" />
                        </div>
                        <span className="text-xs font-bold text-text-primary">JusConsultus AI</span>
                        {deepThinkEnabled && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"><Brain className="w-2.5 h-2.5 animate-pulse" />Deep Think</span>}
                      </div>
                      <div className={cn("border border-border rounded-2xl rounded-tl-md px-5 py-4 bg-surface shadow-sm",
                        deepThinkEnabled && "border-purple-200 dark:border-purple-700/30 bg-linear-to-br from-purple-50/50 to-surface dark:from-purple-900/10")}>
                        <div className="space-y-3">
                          {([
                            { icon: Brain,      label: "Decomposing your query",   detail: "Breaking question into targeted sub-queries…",          color: "text-purple-500",  bg: "bg-purple-100 dark:bg-purple-900/30" },
                            { icon: Search,     label: "Searching legal database",  detail: "Scanning laws, jurisprudence & executive issuances…",  color: "text-blue-500",    bg: "bg-blue-100 dark:bg-blue-900/30" },
                            { icon: ListChecks, label: "Evaluating sources",        detail: "Ranking and filtering relevant documents…",             color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
                            { icon: Sparkles,   label: "Synthesizing answer",       detail: "Generating comprehensive legal analysis…",              color: "text-amber-500",   bg: "bg-amber-100 dark:bg-amber-900/30" },
                          ] as const).map((step, i) => (
                            <div key={step.label} className={cn("flex items-start gap-3 transition-opacity", i > deepSearchSteps.length - 1 ? "opacity-30" : "opacity-100")}>
                              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", i < deepSearchSteps.length ? step.bg : "bg-surface-secondary")}>
                                {i < deepSearchSteps.length
                                  ? (i === deepSearchSteps.length - 1
                                    ? <step.icon className={cn("w-3.5 h-3.5 animate-pulse", step.color)} />
                                    : <Check className="w-3.5 h-3.5 text-emerald-500" />)
                                  : <step.icon className="w-3.5 h-3.5 text-text-tertiary" />}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-xs font-semibold", i < deepSearchSteps.length ? "text-text-primary" : "text-text-tertiary")}>{step.label}</p>
                                <p className={cn("text-[10px] leading-relaxed", i < deepSearchSteps.length ? "text-text-secondary" : "text-text-tertiary")}>{step.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Loader2 className={cn("w-3.5 h-3.5 animate-spin", deepThinkEnabled ? "text-purple-400" : "text-primary-400")} />
                          <span className={cn("text-[10px]", deepThinkEnabled ? "text-purple-600 dark:text-purple-400" : "text-text-tertiary")}>
                            {deepThinkEnabled ? "Deep thinking in progress…" : "Analyzing…"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom input bar */}
            <div className="border-t border-border bg-surface px-4 py-3 shrink-0">
              <div className="max-w-4xl mx-auto">
                <div className="hidden">
                  {MODES.map((mode) => (
                    <button key={mode.id} onClick={() => handleModeClick(mode.id)}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg border transition-colors",
                        activeMode === mode.id
                          ? "bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300"
                          : "border-border text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary")}>
                      <mode.icon className="w-3 h-3" />{mode.label}
                    </button>
                  ))}
                </div>
                <ChatInput {...chatInputProps} compact />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===================== SOURCE DETAIL PANEL ===================== */}
      {selectedSource && (
        <div className="w-1/2 flex flex-col border-l border-border bg-surface shrink-0 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="min-w-0 flex-1">
              {selectedSource.number && <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wide mb-0.5">{selectedSource.number}</p>}
              <h3 className="text-sm font-bold text-text-primary line-clamp-2">{selectedSource.title}</h3>
              {selectedSource.date && <p className="text-[10px] text-text-tertiary mt-0.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{selectedSource.date}</p>}
            </div>
            <button onClick={() => setSelectedSource(null)} className="p-1.5 hover:bg-surface-tertiary rounded-lg text-text-tertiary shrink-0 ml-2"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex border-b border-border shrink-0">
            {(["fulltext", "summary"] as const).map((tab) => (
              <button key={tab} onClick={() => setSourceTab(tab)}
                className={cn("flex-1 py-2.5 text-xs font-medium text-center transition-colors",
                  sourceTab === tab ? "border-b-2 border-primary-600 text-primary-700 dark:text-primary-400" : "text-text-tertiary hover:text-text-secondary")}>
                {tab === "fulltext" ? "Full Text" : "AI Summary"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {sourceTab === "fulltext" && serveUrl && <iframe src={serveUrl} className="w-full h-full border-0" title={selectedSource.title} sandbox="allow-same-origin allow-scripts" />}
            {sourceTab === "summary" && (
              <div className="p-4 overflow-auto h-full">
                {sourceSummaryLoading
                  ? <div className="flex flex-col items-center justify-center py-12 gap-3"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /><p className="text-xs text-text-secondary animate-pulse">Generating AI summary...</p></div>
                  : <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sourceSummary.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/^(\d+\.\s)/gm, "<br/>$1") }} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ===================== DOCUMENT ANALYSIS MODAL ===================== */}
    <DocumentAnalysisModal
      isOpen={showDocAnalysis}
      onClose={() => {
        setShowDocAnalysis(false);
        setAttachedFile(null);
        setDocAnalysisRedirectToEditor(false);
      }}
      initialFile={attachedFile ?? undefined}
      onInsertText={(text) => {
        if (!docAnalysisRedirectToEditor) {
          setShowDocAnalysis(false);
          setInputValue(text.length > 300 ? text.substring(0, 300) + "…" : text);
          setTimeout(() => textareaRef.current?.focus(), 0);
        }
      }}
      onAnalysisComplete={(analysis, extractedText) => {
        if (docAnalysisRedirectToEditor) {
          localStorage.setItem(
            "jusconsultus-pending-analysis",
            JSON.stringify({ analysis, extractedText })
          );
          setShowDocAnalysis(false);
          setAttachedFile(null);
          setDocAnalysisRedirectToEditor(false);
          router.push("/documents/new");
        }
      }}
    />
    </>
  );
}
