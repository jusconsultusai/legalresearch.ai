"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Bookmark, Search, Trash2, ExternalLink, Scale, FileText, Grid2X2, List, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

interface BookmarkItem {
  id: string;
  title: string;
  type: "document" | "case" | "law";
  category?: string;
  url?: string;
  notes?: string;
  createdAt: string;
}

const TYPE_COLORS = {
  document: "bg-blue-100 text-blue-700",
  case: "bg-green-100 text-green-700",
  law: "bg-purple-100 text-purple-700",
};

const TYPE_ICONS = {
  document: <FileText className="w-4 h-4" />,
  case: <Scale className="w-4 h-4" />,
  law: <BookOpen className="w-4 h-4" />,
};

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    // Fetch bookmarks from API
    const fetchBookmarks = async () => {
      try {
        const res = await fetch("/api/bookmarks");
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data.bookmarks || []);
        }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchBookmarks();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      if (res.ok) setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch { /* silently fail */ }
  };

  const filtered = bookmarks.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || b.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6" id="tour-bookmarks">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-500" />
            Bookmarks
          </h1>
          <p className="text-sm text-text-secondary mt-1">Your saved legal documents and cases</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="input pl-10 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "document", "case", "law"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                filterType === t ? "bg-primary-50 text-primary-700 border border-primary-200" : "hover:bg-surface-secondary text-text-secondary"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg", viewMode === "list" ? "bg-surface-tertiary" : "hover:bg-surface-secondary")} title="List view">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-lg", viewMode === "grid" ? "bg-surface-tertiary" : "hover:bg-surface-secondary")} title="Grid view">
            <Grid2X2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-12 h-12 text-amber-400" />}
          title="No bookmarks yet"
          description="Save legal documents and cases by clicking the bookmark icon when browsing"
        />
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filtered.map((bookmark) => (
            <Card key={bookmark.id} className="p-4 flex items-center gap-4 hover:shadow-sm transition-shadow group">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", TYPE_COLORS[bookmark.type])}>
                {TYPE_ICONS[bookmark.type]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-text-primary truncate">{bookmark.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={cn("text-[10px]", TYPE_COLORS[bookmark.type])}>{bookmark.type}</Badge>
                  {bookmark.category && <span className="text-xs text-text-tertiary">{bookmark.category}</span>}
                  <span className="text-xs text-text-tertiary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {bookmark.url && (
                  <Link href={bookmark.url} className="p-2 hover:bg-surface-tertiary rounded-lg">
                    <ExternalLink className="w-4 h-4 text-text-secondary" />
                  </Link>
                )}
                <button onClick={() => handleDelete(bookmark.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete bookmark">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((bookmark) => (
            <Card key={bookmark.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", TYPE_COLORS[bookmark.type])}>
                  {TYPE_ICONS[bookmark.type]}
                </div>
                <button onClick={() => handleDelete(bookmark.id)} className="p-1.5 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100" title="Delete bookmark">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
              <h4 className="font-medium text-sm text-text-primary line-clamp-2 mb-2">{bookmark.title}</h4>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[10px]", TYPE_COLORS[bookmark.type])}>{bookmark.type}</Badge>
                <span className="text-xs text-text-tertiary ml-auto">{new Date(bookmark.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
