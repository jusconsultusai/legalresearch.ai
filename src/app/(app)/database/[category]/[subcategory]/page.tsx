"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Skeleton, EmptyState } from "@/components/ui";
import { LEGAL_DATABASE_STRUCTURE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  FileText,
  Sparkles,
  Scale,
  Copy,
  Clock,
  SortAsc,
  Calendar,
  ChevronDown,
  ExternalLink,
  Info,
  Tag,
  BookOpen,
  CheckCircle,
  List,
  X,
  Maximize2,
  ChevronLeft,
  Loader2,
} from "lucide-react";

interface FileEntry {
  id: string;
  title: string;
  number: string;
  year: string;
  date?: string; // full date string (e.g. "August 8, 1901") or just year
  filename: string;
  relativePath: string;
  excerpt?: string;
  relevantText?: string; // snippet from search for highlighting
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* Subcategory-specific title accent colors */
const SUBCATEGORY_ACCENT: Record<string, string> = {
  decisions: "bg-green-100 text-green-900 border-green-300",
  acts: "bg-pink-100 text-pink-900 border-pink-300",
  batas_pambansa: "bg-pink-100 text-pink-900 border-pink-300",
  commonwealth_act: "bg-pink-100 text-pink-900 border-pink-300",
  constitutions: "bg-purple-100 text-purple-900 border-purple-300",
  general_order: "bg-red-100 text-red-900 border-red-300",
  letter_of_implementation: "bg-amber-100 text-amber-900 border-amber-300",
  letter_of_instruction: "bg-amber-100 text-amber-900 border-amber-300",
  presidential_decree: "bg-pink-100 text-pink-900 border-pink-300",
  republic_acts: "bg-pink-100 text-pink-900 border-pink-300",
  rules_of_court: "bg-blue-100 text-blue-900 border-blue-300",
  administrative_orders: "bg-orange-100 text-orange-900 border-orange-300",
  executive_orders: "bg-violet-100 text-violet-900 border-violet-300",
  memorandum_circulars: "bg-orange-100 text-orange-900 border-orange-300",
  memorandum_orders: "bg-orange-100 text-orange-900 border-orange-300",
  national_admin_register: "bg-orange-100 text-orange-900 border-orange-300",
  presidential_proclamations: "bg-indigo-100 text-indigo-900 border-indigo-300",
  bilateral: "bg-cyan-100 text-cyan-900 border-cyan-300",
  regional: "bg-teal-100 text-teal-900 border-teal-300",
};

export default function SubcategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const subcategory = params.subcategory as string;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "year">("year");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [yearFilter, setYearFilter] = useState("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [listOpen, setListOpen] = useState(true);

  // AI summary state
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  // AI Research state (context-aware search for this subcategory)
  const [aiResearchQuery, setAiResearchQuery] = useState("");
  const [aiResearchResult, setAiResearchResult] = useState<string>("");
  const [aiResearchLoading, setAiResearchLoading] = useState(false);
  const [showAiResearch, setShowAiResearch] = useState(false);

  // Text selection popup
  const [selectionPopup, setSelectionPopup] = useState<{ text: string; action: null | "copy" | "search" } | null>(null);

  // Iframe ref
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const categoryData = LEGAL_DATABASE_STRUCTURE[category as keyof typeof LEGAL_DATABASE_STRUCTURE];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subcategoryData = (categoryData?.subcategories as any)?.[subcategory] as { label: string; icon: string } | undefined;
  const titleAccent = SUBCATEGORY_ACCENT[subcategory] ?? "bg-primary-100 text-primary-900 border-primary-300";

  /* Fetch available years for the year-filter dropdown */
  useEffect(() => {
    fetch(`/api/legal-files?category=${category}&subcategory=${subcategory}&yearsOnly=true`)
      .then((r) => r.json())
      .then((d) => setAvailableYears(d.years || []))
      .catch(() => {});
  }, [category, subcategory]);

  const fetchFiles = useCallback(
    async (page = 1, query = searchQuery, year = yearFilter, sort = sortBy, order = sortOrder) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          category,
          subcategory,
          page: page.toString(),
          limit: "20",
          sortBy: sort,
          sortOrder: order,
        });
        if (query) p.set("search", query);
        if (year && year !== "all") p.set("year", year);

        const res = await fetch(`/api/legal-files?${p.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
          setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [category, subcategory, searchQuery, yearFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchFiles(pagination.page, searchQuery, yearFilter, sortBy, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory, pagination.page, sortBy, sortOrder, yearFilter]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPagination((p) => ({ ...p, page: 1 }));
    fetchFiles(1, searchInput, yearFilter, sortBy, sortOrder);
  };

  const selectFile = (file: FileEntry) => {
    setSelectedFile(file);
    setAiSummary("");
    setAiGenerated(false);
    setMetaOpen(false);
    setListOpen(false); // collapse list to give full space to the reader
  };

  const generateAiSummary = async () => {
    if (!selectedFile || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/legal-files/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFile.relativePath,
          title: selectedFile.title,
          number: selectedFile.number,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary || "No summary generated.");
        setAiGenerated(true);
      } else {
        setAiSummary("Failed to generate summary. Please try again.");
        setAiGenerated(true);
      }
    } catch {
      setAiSummary("An error occurred while generating the summary.");
      setAiGenerated(true);
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-generate AI summary when a file is selected
  useEffect(() => {
    if (selectedFile) {
      generateAiSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const handleAIResearch = async () => {
    if (!aiResearchQuery.trim()) return;
    setAiResearchLoading(true);
    setAiResearchResult("");
    setShowAiResearch(true);
    try {
      const res = await fetch("/api/ai/legal-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${aiResearchQuery} [Category: ${subcategoryData?.label || subcategory}]`,
          deep: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResearchResult(data.answer || "No results found.");
      } else {
        setAiResearchResult("Search failed. Please try again.");
      }
    } catch {
      setAiResearchResult("Network error. Please check your connection.");
    } finally {
      setAiResearchLoading(false);
    }
  };

  // Listen for text selection postMessages from the document iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, text } = event.data as { type: string; text: string };
      if (type === "legal-copy") {
        // Already copied inside iframe; just show toast
        setSelectionPopup({ text, action: "copy" });
        setTimeout(() => setSelectionPopup(null), 2500);
      } else if (type === "legal-search") {
        setSelectionPopup({ text, action: "search" });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const copyLink = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(
        window.location.origin + `/api/legal-files/serve?path=${encodeURIComponent(selectedFile.relativePath)}`
      );
    }
  };

  const serveUrl = selectedFile
    ? (() => {
        const base = `/api/legal-files/serve?path=${encodeURIComponent(selectedFile.relativePath)}`;
        // Use relevantText from RAG search, or fall back to the keywords typed in the search box
        const hl = selectedFile.relevantText?.trim() || (searchQuery.trim() ? searchQuery.trim() : "");
        return hl ? `${base}&highlight=${encodeURIComponent(hl)}` : base;
      })()
    : "";

  return (
    <div className="h-full flex flex-col">
      {/* Text-selection popup / toast */}
      {selectionPopup && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {selectionPopup.action === "copy" && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium pointer-events-auto animate-fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Copied to clipboard
            </div>
          )}
          {selectionPopup.action === "search" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-120 max-w-[95vw] bg-slate-800 text-white rounded-xl shadow-2xl overflow-hidden pointer-events-auto animate-fade-in">
              <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-700">
                <Search className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-300 mb-0.5">Search in Legal Database</p>
                  <p className="text-sm text-white leading-snug line-clamp-2">&ldquo;{selectionPopup.text}&rdquo;</p>
                </div>
                <button
                  onClick={() => setSelectionPopup(null)}
                  className="text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button
                  onClick={() => {
                    if (selectionPopup.text) {
                      navigator.clipboard.writeText(selectionPopup.text);
                    }
                    setSelectionPopup(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy text
                </button>
                <button
                  onClick={() => {
                    const q = encodeURIComponent(selectionPopup.text);
                    window.open(`/database?search=${q}`, "_blank");
                    setSelectionPopup(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search database
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Header */}
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
          <Link href="/database" className="hover:text-primary-600 transition-colors">
            Legal Database
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span>{categoryData?.label}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-primary font-medium">{subcategoryData?.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{subcategoryData?.label || subcategory}</h1>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative flex-1 min-w-48 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={`Search in ${subcategoryData?.label || subcategory}...`}
              className="input pl-10 pr-4 py-2 text-sm w-full"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="pl-8 pr-8 py-2 text-xs font-medium rounded-lg border border-border bg-white hover:bg-surface-secondary appearance-none cursor-pointer transition-colors"
            >
              <option value="all">Year: All</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
          </div>

          <button
            onClick={() => {
              if (sortBy === "title") {
                setSortBy("year");
              } else {
                setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                setSortBy("title");
              }
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-surface-secondary transition-colors"
          >
            {sortBy === "year" ? <Calendar className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
            Sort: {sortBy === "year" ? "Year ↓" : `Title ${sortOrder === "asc" ? "A-Z" : "Z-A"}`}
          </button>

          {/* AI Research button */}
          <button
            onClick={() => setShowAiResearch((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ml-auto",
              showAiResearch ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300" : "border-border hover:bg-surface-secondary text-text-secondary"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Research
          </button>
        </div>

        {/* AI Research Panel */}
        {showAiResearch && (
          <div className="mt-3 p-3 rounded-xl border border-purple-200 dark:border-purple-700/40 bg-purple-50 dark:bg-purple-900/20 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiResearchQuery}
                onChange={(e) => setAiResearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAIResearch(); }}
                placeholder={`Ask a question about ${subcategoryData?.label || subcategory}…`}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-purple-200 dark:border-purple-600/50 bg-white dark:bg-surface focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-700"
              />
              <button
                onClick={handleAIResearch}
                disabled={!aiResearchQuery.trim() || aiResearchLoading}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {aiResearchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Ask AI
              </button>
            </div>
            {aiResearchLoading && (
              <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Researching…
              </div>
            )}
            {!aiResearchLoading && aiResearchResult && (
              <div className="text-xs text-text-primary leading-relaxed bg-white/70 dark:bg-surface/70 rounded-lg p-3 border border-purple-100 dark:border-purple-700/30 max-h-48 overflow-auto whitespace-pre-wrap">
                {aiResearchResult}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <div className="px-6 py-2 bg-surface-secondary border-b border-border">
          <span className="text-xs text-text-secondary font-medium">
            Results <span className="text-text-primary">({pagination.total.toLocaleString()})</span>
          </span>
        </div>
      )}

      {/* Content: List + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document List */}
        <div className={cn("overflow-auto border-r border-border", selectedFile ? "w-1/2" : "w-full")}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="w-12 h-12" />}
                title="No documents found"
                description={
                  searchQuery
                    ? "Try a different search query"
                    : "No documents available in this subcategory yet"
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => selectFile(file)}
                  className={cn(
                    "w-full text-left px-5 py-4 hover:bg-surface-secondary transition-colors group",
                    selectedFile?.id === file.id
                      ? "bg-primary-50 border-l-2 border-l-primary-600"
                      : "border-l-2 border-l-transparent"
                  )}
                >
                  {/* Title from extracted metadata */}
                  <div className={cn("inline-block px-2.5 py-1.5 rounded border text-sm font-bold text-left max-w-full", titleAccent)}>
                    <span className="line-clamp-2">{file.title}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-text-secondary">
                Page {pagination.page} of {pagination.totalPages.toLocaleString()}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Document Detail Panel — two-panel: left summary/meta, right full-text iframe */}
        {selectedFile && (
          <div className="flex-1 flex overflow-hidden animate-fade-in">

            {/* Left Panel: AI Summary + Metadata */}
            <div className="w-1/2 shrink-0 flex flex-col overflow-hidden border-r border-border bg-white">

              {/* Doc header */}
              <div className="px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="accent" className="text-xs">{categoryData?.label || category}</Badge>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-surface-tertiary rounded-lg transition-colors text-text-tertiary"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedFile.number && (
                  <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-1">
                    {selectedFile.number}
                  </p>
                )}
                <div className={cn("px-2.5 py-1.5 rounded-md border text-sm font-bold", titleAccent)}>
                  <span className="line-clamp-3">{selectedFile.title}</span>
                </div>
                {selectedFile.year && (
                  <p className="text-xs text-text-tertiary mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedFile.year}
                  </p>
                )}
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-auto">

                {/* AI Summary */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary-500 shrink-0" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">AI Summary</span>
                  </div>

                  {aiLoading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <p className="text-xs text-text-secondary animate-pulse">Analyzing document…</p>
                    </div>
                  )}

                  {!aiLoading && !aiGenerated && (
                    <p className="text-xs text-text-tertiary text-center py-4">Preparing summary…</p>
                  )}

                  {!aiLoading && aiGenerated && (
                    <div>
                      <div
                        className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: aiSummary
                            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                            .replace(/^(\d+\.\s)/gm, "<br/>$1"),
                        }}
                      />

                    </div>
                  )}
                </div>

                {/* Metadata accordion */}
                <div className="px-4 py-3">
                  <button
                    onClick={() => setMetaOpen((o) => !o)}
                    className="flex items-center justify-between w-full mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-text-tertiary shrink-0" />
                      <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Metadata</span>
                    </div>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-text-tertiary transition-transform", metaOpen && "rotate-180")} />
                  </button>
                  {metaOpen && (
                    <div className="space-y-2.5">
                      {[
                        { label: "Document Number", value: selectedFile.number || "—" },
                        { label: "Year / Date", value: selectedFile.year || "—" },
                        { label: "Category", value: categoryData?.label || category },
                        { label: "Subcategory", value: subcategoryData?.label || subcategory },
                        { label: "Source", value: "Philippine Legal Database" },
                        { label: "Filename", value: selectedFile.filename },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">{label}</span>
                          <span className="text-xs text-text-primary break-all">{value}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border">
                        <a
                          href={serveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline break-all flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          Open source file
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Full Document iframe */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  Full text — original legal document
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={serveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                  </a>
                  <button
                    onClick={copyLink}
                    className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                </div>
              </div>
              <iframe
                ref={iframeRef}
                src={serveUrl}
                className="flex-1 w-full border-none"
                title={selectedFile.title}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
