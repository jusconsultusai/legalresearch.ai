"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";
import { LEGAL_DATABASE_STRUCTURE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Search,
  Scale,
  BookOpen,
  FileText,
  Globe,
  ScrollText,
  ChevronRight,
  Folder,
  ArrowRight,
  FileSearch,
  Users,
  Building,
  Shield,
  Flag,
  Mail,
  MailOpen,
  Pen,
  Landmark,
  Gavel,
  ClipboardList,
  FileSignature,
  FileSpreadsheet,
  FileStack,
  Database,
  Megaphone,
  History,
  Layers,
  FormInput,
  BookType,
  BookMarked,
  Vote,
  PenTool,
  BookText,
  ClipboardCheck,
  Newspaper,
  Handshake,
  Briefcase,
  Library,
  Sparkles,
  Brain,
  Loader2,
  X,
  Calendar,
  ExternalLink,
  Eye,
  type LucideProps,
} from "lucide-react";

type IconComponent = React.FC<LucideProps>;

const LUCIDE_ICON_MAP: Record<string, IconComponent> = {
  Scale, BookOpen, FileText, Globe, ScrollText, FileSearch,
  Users, Building, Shield, Flag, Mail, MailOpen, Pen, Landmark,
  Gavel, ClipboardList, FileSignature, FileSpreadsheet, FileStack,
  Database, Megaphone, History, Layers, FormInput, BookType,
  BookMarked, Vote, PenTool, BookText, ClipboardCheck, Newspaper,
  Handshake, Briefcase, Library,
  // aliases used in constants
  Globe2: Globe,
};

function SubcategoryIcon({ name, className = "w-5 h-5" }: { name?: string; className?: string }) {
  const Icon = name ? (LUCIDE_ICON_MAP[name] ?? FileText) : FileText;
  return <Icon className={className} />;
}

/* Build category icons dynamically from constants so they always stay in sync */
const CATEGORY_ICONS: Record<string, React.ReactNode> = Object.fromEntries(
  Object.entries(LEGAL_DATABASE_STRUCTURE).map(([key, cat]) => {
    const Icon = LUCIDE_ICON_MAP[cat.icon] ?? Folder;
    return [key, <Icon key={key} className="w-5 h-5" />];
  })
);

const CATEGORY_COLORS: Record<string, string> = {
  supreme_court: "from-green-50 to-emerald-50 border-green-200 text-green-700",
  laws: "from-blue-50 to-indigo-50 border-blue-200 text-blue-700",
  executive_issuances: "from-purple-50 to-violet-50 border-purple-200 text-purple-700",
  references: "from-amber-50 to-yellow-50 border-amber-200 text-amber-700",
  treaties: "from-rose-50 to-pink-50 border-rose-200 text-rose-700",
  international_laws: "from-cyan-50 to-sky-50 border-cyan-200 text-cyan-700",
};

// Inner component that uses useSearchParams
function DatabasePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("supreme_court");
  const [searchQuery, setSearchQuery] = useState("");
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, Record<string, number>>>({});

  // Global search state (highlight-to-search)
  interface GlobalSearchResult {
    title: string;
    number: string;
    year: string;
    category: string;
    categoryLabel: string;
    subcategory: string;
    filename: string;
    relativePath: string;
    matchSnippet: string;
    matchType: "title" | "content";
  }
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchTotal, setGlobalSearchTotal] = useState(0);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [selectedGlobalResult, setSelectedGlobalResult] = useState<GlobalSearchResult | null>(null);

  // Zoom level for viewer iframes
  const [zoomLevel, setZoomLevel] = useState(100);
  const aiIframeRef = useRef<HTMLIFrameElement>(null);
  const globalIframeRef = useRef<HTMLIFrameElement>(null);

  // AI Research state
  type AISource = { title: string; number?: string; category: string; subcategory?: string; date?: string; score: number; relevantText?: string; relativePath?: string; };
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<{ answer: string; sources: AISource[]; subQueries?: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedAISource, setSelectedAISource] = useState<AISource | null>(null);

  // Global search handler
  const handleGlobalSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGlobalSearchLoading(true);
    setGlobalSearchResults([]);
    setShowGlobalSearch(true);
    setSelectedGlobalResult(null);
    try {
      const res = await fetch(`/api/legal-files/global-search?q=${encodeURIComponent(query.trim())}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setGlobalSearchResults(data.results || []);
        setGlobalSearchTotal(data.total || 0);
      }
    } catch {
      // silently fail
    } finally {
      setGlobalSearchLoading(false);
    }
  }, []);

  // Handle ?search= URL parameter (from highlight-to-search in subcategory viewer)
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setGlobalSearchQuery(searchParam);
      handleGlobalSearch(searchParam);
    }
  }, [searchParams, handleGlobalSearch]);

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    setShowAIPanel(true);
    try {
      const res = await fetch("/api/ai/legal-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery, deep: false }),
      });
      if (res.ok) {
        setAiResult(await res.json());
      } else {
        setAiResult({ answer: "Search failed. Please try again.", sources: [] });
      }
    } catch {
      setAiResult({ answer: "Network error. Please check your connection.", sources: [] });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/database/stats")
      .then((res) => res.json())
      .then((data) => {
        const counts: Record<string, Record<string, number>> = {};
        for (const s of data.subcategories || []) {
          if (!counts[s.category]) counts[s.category] = {};
          counts[s.category][s.subcategory] = s.count;
        }
        setSubcategoryCounts(counts);
      })
      .catch(() => {});
  }, []);

  const categories = Object.entries(LEGAL_DATABASE_STRUCTURE);
  const currentCategory = LEGAL_DATABASE_STRUCTURE[activeCategory as keyof typeof LEGAL_DATABASE_STRUCTURE];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subcategoryEntries: [string, { label: string; icon: string }][] = Object.entries((currentCategory?.subcategories || {}) as any);

  const filteredSubcategories = subcategoryEntries.filter(
    ([key, sub]) => {
      const count = subcategoryCounts[activeCategory]?.[key] ?? -1;
      // Hide subcategories with 0 documents (show all if stats haven't loaded yet, indicated by -1)
      if (count === 0) return false;
      return (
        sub.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  return (
    <div className="flex h-full">
      {/* Main content — scrollable */}
      <div className={cn("flex-1 min-w-0 overflow-auto transition-all", (selectedAISource || selectedGlobalResult) ? "lg:mr-0" : "")}>
        <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Legal Database</h1>
        <p className="text-sm text-text-secondary mt-1">
          Browse and search through Philippine legal documents, jurisprudence, and legislative materials
        </p>
      </div>

      {/* AI-Powered Research — hidden from dashboard (function still usable via handleAISearch) */}
      {false && <div className="max-w-3xl">
        <div className="rounded-2xl border border-purple-200 dark:border-purple-700/40 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-purple-900 dark:text-purple-200">AI-Powered Legal Research</p>
              <p className="text-[11px] text-purple-700 dark:text-purple-400">Ask a question — AI searches the entire database</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAISearch(); }}
              placeholder="e.g. What are the elements of estafa under Philippine law?"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-purple-200 dark:border-purple-600/50 bg-white dark:bg-surface focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-700"
            />
            <button
              onClick={handleAISearch}
              disabled={!aiQuery.trim() || aiLoading}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Research
            </button>
          </div>

          {/* AI Result */}
          {showAIPanel && (
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700/40 space-y-3">
              {aiLoading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">Searching legal database…</span>
                </div>
              )}
              {!aiLoading && aiResult && (
                <>
                  {(!aiResult.sources || aiResult.sources.length === 0) && (
                    <p className="text-sm text-text-tertiary italic">No sources found. Try a different query or get a full AI analysis in Chat.</p>
                  )}
                  {aiResult.sources && aiResult.sources.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Sources Found ({aiResult.sources.length})</p>

                      {/* Source badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {aiResult.sources.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedAISource(selectedAISource?.title === s.title ? null : s)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                              selectedAISource?.title === s.title
                                ? "border-purple-500 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-400 shadow-sm ring-1 ring-purple-300 dark:ring-purple-600"
                                : "border-purple-200 dark:border-purple-700/40 bg-white dark:bg-surface text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 hover:shadow-sm"
                            )}
                            title={`${s.title}${s.number ? ` — ${s.number}` : ""}${s.date ? ` (${s.date})` : ""}\nClick to view document`}
                          >
                            <span className="w-4 h-4 rounded-full bg-purple-200 dark:bg-purple-700 text-purple-700 dark:text-purple-200 flex items-center justify-center text-[9px] font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span className="truncate max-w-50">{s.title}</span>
                            {s.number && <span className="text-purple-400 dark:text-purple-500 hidden sm:inline">· {s.number}</span>}
                            <Eye className="w-3 h-3 shrink-0 opacity-60" />
                          </button>
                        ))}
                      </div>

                      {/* Detailed source list */}
                      <div className="space-y-1.5 max-h-72 overflow-auto">
                        {aiResult.sources.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedAISource(selectedAISource?.title === s.title ? null : s)}
                            className={cn(
                              "w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-all group/src",
                              selectedAISource?.title === s.title
                                ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-sm"
                                : "border-border hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10"
                            )}
                          >
                            <span className="text-xs font-bold text-purple-500 w-4 shrink-0">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-text-primary truncate group-hover/src:text-purple-700 dark:group-hover/src:text-purple-300 transition-colors">{s.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {s.number && <span className="text-[10px] text-text-tertiary">{s.number}</span>}
                                {s.date && <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary"><Calendar className="w-2.5 h-2.5" />{s.date}</span>}
                              </div>
                              {s.relevantText && (
                                <p className="text-[10px] text-purple-600/70 dark:text-purple-400/60 mt-1 line-clamp-1 italic">&ldquo;{s.relevantText}&rdquo;</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium",
                                s.category === "supreme_court"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              )}>
                                {s.category === "supreme_court" ? "Jurisprudence" : "Law"}
                              </span>
                              <Eye className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover/src:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/chat?q=${encodeURIComponent(aiQuery)}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                    >
                      <Brain className="w-3 h-3" />
                      Get Full AI Analysis in Chat
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>}

      {/* Global Search — highlight-to-search across all files */}
      <div className="max-w-3xl">
        <div className="rounded-2xl border border-blue-200 dark:border-blue-700/40 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Search Across All Documents</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-400">Search titles and full text content across the entire legal database</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGlobalSearch(globalSearchQuery); }}
              placeholder="Search across all legal documents…"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-blue-200 dark:border-blue-600/50 bg-white dark:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
            />
            <button
              onClick={() => handleGlobalSearch(globalSearchQuery)}
              disabled={!globalSearchQuery.trim() || globalSearchLoading}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              {globalSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search All
            </button>
          </div>

          {/* Global Search Results */}
          {showGlobalSearch && (
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700/40 space-y-3">
              {globalSearchLoading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">Searching all files…</span>
                </div>
              )}
              {!globalSearchLoading && globalSearchResults.length === 0 && (
                <p className="text-sm text-text-tertiary italic">No results found. Try a different search term.</p>
              )}
              {!globalSearchLoading && globalSearchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      Results Found ({globalSearchTotal})
                    </p>
                    <button
                      onClick={() => { setShowGlobalSearch(false); setGlobalSearchResults([]); setSelectedGlobalResult(null); }}
                      className="text-[10px] text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-96 overflow-auto">
                    {globalSearchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedGlobalResult(selectedGlobalResult?.relativePath === r.relativePath ? null : r)}
                        className={cn(
                          "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all group/res",
                          selectedGlobalResult?.relativePath === r.relativePath
                            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                            : "border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                        )}
                      >
                        <span className="text-xs font-bold text-blue-500 w-4 shrink-0 mt-0.5">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-text-primary truncate group-hover/res:text-blue-700 dark:group-hover/res:text-blue-300 transition-colors">
                            {r.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {r.number && <span className="text-[10px] text-text-tertiary">{r.number}</span>}
                            {r.year && <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary"><Calendar className="w-2.5 h-2.5" />{r.year}</span>}
                            <span className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium",
                              r.category === "supreme_court"
                                ? "bg-green-100 text-green-700"
                                : r.category === "laws"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {r.categoryLabel}
                            </span>
                          </div>
                          {r.matchType === "content" && r.matchSnippet && (
                            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/60 mt-1 line-clamp-2 italic">
                              {r.matchSnippet}
                            </p>
                          )}
                        </div>
                        <Eye className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover/res:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap border transition-all",
              activeCategory === key
                ? `bg-gradient-to-r ${CATEGORY_COLORS[key]} shadow-sm`
                : "border-transparent hover:bg-surface-secondary text-text-secondary"
            )}
          >
            {CATEGORY_ICONS[key]}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Category Overview */}
      <Card className={cn("p-6 bg-gradient-to-r border", CATEGORY_COLORS[activeCategory])}>
        <div className="flex items-center gap-3 mb-2">
          {CATEGORY_ICONS[activeCategory]}
          <h2 className="text-xl font-bold">{currentCategory?.label}</h2>
        </div>
        <p className="text-sm opacity-80">
          Browse {currentCategory?.label.toLowerCase()} documents in the Philippine legal system.
          {activeCategory === "supreme_court" && " Includes decisions, resolutions, and administrative matters."}
          {activeCategory === "laws" && " Includes Republic Acts, Commonwealth Acts, and other legislative measures."}
          {activeCategory === "executive_issuances" && " Includes Executive Orders, Proclamations, and Administrative Orders."}
          {activeCategory === "references" && " Includes Rules of Court, legal forms, and other reference materials."}
          {activeCategory === "treaties" && " Includes bilateral and multilateral agreements."}
        </p>
      </Card>

      {/* Subcategories Grid */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Folder className="w-5 h-5 text-text-secondary" />
          Subcategories · {filteredSubcategories.length}
        </h3>

        {filteredSubcategories.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <p className="text-sm">No subcategories match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubcategories.map(([key, sub]) => (
              <Link
                key={key}
                href={`/database/${activeCategory}/${key}`}
              >
                <Card className="p-5 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-tertiary flex items-center justify-center text-text-secondary group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                      <SubcategoryIcon name={sub.icon} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-primary-600 transition-colors" />
                  </div>
                  <h4 className="font-semibold text-sm text-text-primary group-hover:text-primary-600 transition-colors">
                    {sub.label}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {subcategoryCounts[activeCategory]?.[key] != null
                      ? `${subcategoryCounts[activeCategory][key].toLocaleString()} documents`
                      : `Browse ${sub.label.toLowerCase()} in the ${currentCategory?.label.toLowerCase()} collection`}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Right-side document viewer panel */}
      {selectedAISource && (
        <div className="hidden lg:flex w-[480px] shrink-0 border-l border-border flex-col h-full bg-surface">
          {/* Viewer header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">{selectedAISource.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedAISource.number && <span className="text-xs text-text-tertiary">{selectedAISource.number}</span>}
                {selectedAISource.date && (
                  <span className="flex items-center gap-0.5 text-xs text-text-tertiary">
                    <Calendar className="w-3 h-3" />
                    {selectedAISource.date}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium",
                    selectedAISource.category === "supreme_court"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  {selectedAISource.category === "supreme_court" ? "Jurisprudence" : "Law"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedAISource(null)}
              className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors shrink-0"
              title="Close viewer"
            >
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-surface-secondary/50 shrink-0">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Document View</span>
            <div className="flex items-center gap-0.5 bg-surface-tertiary/70 rounded-lg px-1">
              <button
                onClick={() => {
                  const next = Math.max(50, zoomLevel - 10);
                  setZoomLevel(next);
                  aiIframeRef.current?.contentWindow?.postMessage({ type: 'jus-zoom', zoom: next }, '*');
                  globalIframeRef.current?.contentWindow?.postMessage({ type: 'jus-zoom', zoom: next }, '*');
                }}
                className="px-1.5 py-0.5 text-xs font-bold text-text-secondary hover:bg-surface-tertiary rounded transition-colors"
                title="Decrease font size"
              >
                A−
              </button>
              <span className="text-[10px] font-medium text-text-tertiary min-w-[32px] text-center">{zoomLevel}%</span>
              <button
                onClick={() => {
                  const next = Math.min(200, zoomLevel + 10);
                  setZoomLevel(next);
                  aiIframeRef.current?.contentWindow?.postMessage({ type: 'jus-zoom', zoom: next }, '*');
                  globalIframeRef.current?.contentWindow?.postMessage({ type: 'jus-zoom', zoom: next }, '*');
                }}
                className="px-1.5 py-0.5 text-xs font-bold text-text-secondary hover:bg-surface-tertiary rounded transition-colors"
                title="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          {/* Relevant text snippet */}
          {selectedAISource.relevantText && (
            <div className="px-4 py-3 border-b border-border bg-purple-50/50 dark:bg-purple-900/10">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">Relevant Excerpt</p>
              <p className="text-xs text-text-secondary leading-relaxed italic">&ldquo;{selectedAISource.relevantText}&rdquo;</p>
            </div>
          )}

          {/* Document content */}
          {selectedAISource.relativePath ? (
            <iframe
              ref={aiIframeRef}
              src={`/api/legal-files/serve?path=${encodeURIComponent(selectedAISource.relativePath)}${selectedAISource.relevantText ? `&highlight=${encodeURIComponent(selectedAISource.relevantText)}` : ""}`}
              className="flex-1 w-full border-0"
              title={selectedAISource.title}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <FileText className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                <p className="text-sm text-text-secondary">Document preview not available</p>
                <p className="text-xs text-text-tertiary mt-1">Full document path not found in search results</p>
              </div>
            </div>
          )}

          {/* Viewer footer */}
          {selectedAISource.relativePath && (
            <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-end gap-2 bg-surface-secondary">
              <button
                onClick={() => {
                  if (selectedAISource.relativePath) {
                    window.open(
                      `/api/legal-files/serve?path=${encodeURIComponent(selectedAISource.relativePath)}`,
                      "_blank"
                    );
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open in New Tab
              </button>
            </div>
          )}
        </div>
      )}

      {/* Right-side viewer panel for global search results */}
      {selectedGlobalResult && !selectedAISource && (
        <div className="hidden lg:flex w-[480px] shrink-0 border-l border-border flex-col h-full bg-surface">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">{selectedGlobalResult.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedGlobalResult.number && <span className="text-xs text-text-tertiary">{selectedGlobalResult.number}</span>}
                {selectedGlobalResult.year && (
                  <span className="flex items-center gap-0.5 text-xs text-text-tertiary">
                    <Calendar className="w-3 h-3" />
                    {selectedGlobalResult.year}
                  </span>
                )}
                <span className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium",
                  selectedGlobalResult.category === "supreme_court"
                    ? "bg-green-100 text-green-700"
                    : selectedGlobalResult.category === "laws"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                )}>
                  {selectedGlobalResult.categoryLabel}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedGlobalResult(null)}
              className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors shrink-0"
              title="Close viewer"
            >
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-surface-secondary/50 shrink-0">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Document View</span>
            <div className="flex items-center gap-0.5 bg-surface-tertiary/70 rounded-lg px-1">
              <button
                onClick={() => {
                  const next = Math.max(50, zoomLevel - 10);
                  setZoomLevel(next);
                  globalIframeRef.current?.contentWindow?.postMessage({ type: 'jus-zoom', zoom: next }, '*');
                }}
                className="px-1.5 py-0.5 text-xs font-bold text-text-secondary hover:bg-surface-tertiary rounded transition-colors"
                title="Decrease font size"
              >
                A−
              </button>
              <span className="text-[10px] font-medium text-text-tertiary min-w-[32px] text-center">{zoomLevel}%</span>
              <button
                onClick={() => {
                  const next = Math.min(200, zoomLevel + 10);
                  setZoomLevel(next);
                  globalIframeRef.current?.contentWindow?.postMessage({ type: 'jus-zoom', zoom: next }, '*');
                }}
                className="px-1.5 py-0.5 text-xs font-bold text-text-secondary hover:bg-surface-tertiary rounded transition-colors"
                title="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          {selectedGlobalResult.matchType === "content" && selectedGlobalResult.matchSnippet && (
            <div className="px-4 py-3 border-b border-border bg-blue-50/50 dark:bg-blue-900/10">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Matching Content</p>
              <p className="text-xs text-text-secondary leading-relaxed italic">{selectedGlobalResult.matchSnippet}</p>
            </div>
          )}

          <iframe
            ref={globalIframeRef}
            src={`/api/legal-files/serve?path=${encodeURIComponent(selectedGlobalResult.relativePath)}&highlight=${encodeURIComponent(globalSearchQuery)}`}
            className="flex-1 w-full border-0"
            title={selectedGlobalResult.title}
          />

          <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-end gap-2 bg-surface-secondary">
            <button
              onClick={() => router.push(`/database/${selectedGlobalResult.category}/${selectedGlobalResult.subcategory}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors"
            >
              <Folder className="w-3 h-3" />
              Browse {selectedGlobalResult.categoryLabel}
            </button>
            <button
              onClick={() => {
                window.open(
                  `/api/legal-files/serve?path=${encodeURIComponent(selectedGlobalResult.relativePath)}`,
                  "_blank"
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open in New Tab
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DatabasePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-text-tertiary" /></div>}>
      <DatabasePageInner />
    </Suspense>
  );
}
