"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  FileText,
  Trash2,
  MoreHorizontal,
  Clock,
  FilePlus,
  Grid2X2,
  List,
  ChevronDown,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
  createdAt: string;
  author?: { name: string; email: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  civil: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  criminal: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  administrative: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  commercial: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  labor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  general: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [filterCategory]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setShowDeleteId(null);
      }
    } catch {
      // silently fail
    }
  };

  const getWordCount = (content: string) => {
    const stripped = content.replace(/<[^>]*>/g, "");
    return stripped.split(/\s+/).filter(Boolean).length;
  };

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-4 sm:space-y-6" id="tour-documents">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Documents</h1>
          <p className="text-sm text-text-secondary mt-1">Create and manage your legal documents</p>
        </div>
        <Link
          href="/documents/new"
          className="flex items-center gap-2 bg-primary-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Document</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="input pl-10 pr-4 py-2 text-sm"
          />
        </div>

        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input py-2 text-sm pr-8 appearance-none"
            title="Filter by category"
          >
            <option value="all">All Categories</option>
            <option value="civil">Civil</option>
            <option value="criminal">Criminal</option>
            <option value="administrative">Administrative</option>
            <option value="commercial">Commercial</option>
            <option value="labor">Labor</option>
            <option value="general">General</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 rounded-lg transition-colors", viewMode === "list" ? "bg-surface-tertiary text-text-primary" : "text-text-secondary hover:bg-surface-secondary")}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 rounded-lg transition-colors", viewMode === "grid" ? "bg-surface-tertiary text-text-primary" : "text-text-secondary hover:bg-surface-secondary")}
            title="Grid view"
          >
            <Grid2X2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Documents */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No documents yet"
          description="Create your first legal document using our AI-powered editor"
          action={
            <Link
              href="/documents/new"
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              Create Document
            </Link>
          }
        />
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div key={doc.id} className="relative">
              <Link href={`/documents/${doc.id}`}>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary-300 hover:shadow-sm transition-all bg-surface group">
                  <div className="w-10 h-10 rounded-xl bg-surface-tertiary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary-600 truncate">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <Badge className={cn("text-[10px] px-1.5", CATEGORY_COLORS[doc.category] || "bg-gray-100 text-gray-700")}>
                        {doc.category}
                      </Badge>
                      <span className="text-xs text-text-tertiary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {getWordCount(doc.content)} words
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeleteId(doc.id === showDeleteId ? null : doc.id);
                    }}
                    className="p-2 hover:bg-surface-tertiary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </Link>

              {/* Actions dropdown */}
              {showDeleteId === doc.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDeleteId(null)} />
                  <div className="absolute right-2 top-14 z-20 bg-surface rounded-xl shadow-xl border border-border p-1 w-40">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="p-5 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-tertiary flex items-center justify-center">
                    <FileText className="w-4 h-4 text-text-secondary" />
                  </div>
                  <Badge className={cn("text-[10px]", CATEGORY_COLORS[doc.category] || "bg-gray-100 text-gray-700")}>
                    {doc.category}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm text-text-primary line-clamp-2 mb-2">{doc.title}</h3>
                <div
                  className="text-xs text-text-tertiary line-clamp-2 mb-3"
                  dangerouslySetInnerHTML={{ __html: doc.content.slice(0, 100) || "Empty document" }}
                />
                <div className="flex items-center justify-between text-xs text-text-tertiary mt-auto">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  <span>{getWordCount(doc.content)} words</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
