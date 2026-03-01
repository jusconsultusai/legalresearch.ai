"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks";
import { cn } from "@/lib/utils";
import ProgressBar from "@/components/ui/ProgressBar";
import DocumentAnalysisModal from "@/components/document/DocumentAnalysisModal";
import {
  FolderOpen,
  Upload,
  FileText,
  Trash2,
  Download,
  Search,
  Grid2X2,
  List,
  Eye,
  AlertTriangle,
  X,
  Clock,
  HardDrive,
  Info,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  Presentation,
  Wand2,
  Sparkles,
  Loader2,
} from "lucide-react";

interface LocalFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  category: string;
  uploadedAt: string;
  lastAccessed: string;
}

const FILE_CATEGORIES = [
  { value: "all", label: "All Files" },
  { value: "legal-forms", label: "Legal Forms" },
  { value: "contracts", label: "Contracts" },
  { value: "pleadings", label: "Pleadings" },
  { value: "affidavits", label: "Affidavits" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileIcon(type: string, size: "sm" | "lg" = "sm") {
  const cls = size === "lg" ? "w-6 h-6" : "w-5 h-5";
  if (type.startsWith("image/")) return <FileImage className={cls} />;
  if (type === "application/pdf" || type.includes("pdf")) return <FileText className={cls} />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className={cls} />;
  if (type.includes("presentation") || type.includes("powerpoint"))
    return <Presentation className={cls} />;
  return <FileIcon className={cls} />;
}

function getFileTypeBadge(type: string): string {
  if (type.startsWith("image/")) return type.split("/")[1]?.toUpperCase() ?? "IMG";
  if (type === "application/pdf") return "PDF";
  if (type.includes("wordprocessingml") || type.includes("msword")) return "DOCX";
  if (type.includes("spreadsheet") || type.includes("excel")) return "XLSX";
  if (type.includes("presentation") || type.includes("powerpoint")) return "PPTX";
  if (type === "text/plain") return "TXT";
  if (type === "text/html") return "HTML";
  const sub = type.split("/")[1];
  return sub ? sub.slice(0, 4).toUpperCase() : "FILE";
}

export default function MyFilesPage() {
  const router = useRouter();
  const [files, setFiles] = useLocalStorage<LocalFile[]>("jusconsultus-my-files", []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [previewFile, setPreviewFile] = useState<LocalFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Analysis state — powered by DocumentAnalysisModal
  const [showDocAnalysisModal, setShowDocAnalysisModal] = useState(false);
  const [docAnalysisFile, setDocAnalysisFile] = useState<File | null>(null);

  // "Use in Builder" loading state (tracks which file is being opened)
  const [builderLoading, setBuilderLoading] = useState<string | null>(null);

  const filtered = files.filter((f) => {
    const matchesSearch =
      !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const MAX_STORAGE = 5 * 1024 * 1024; // 5 MB limit

  const handleFileUpload = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles: LocalFile[] = [];

      Array.from(fileList).forEach((file) => {
        if (totalSize + file.size > MAX_STORAGE) {
          alert(`Storage limit exceeded. Max ${formatFileSize(MAX_STORAGE)} allowed.`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const newFile: LocalFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            content,
            category: uploadCategory,
            uploadedAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
          };
          setFiles((prev) => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      });
      setShowUploadModal(false);
    },
    [totalSize, uploadCategory, setFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDeleteConfirm(null);
    if (previewFile?.id === id) setPreviewFile(null);
  };

  const handleDownload = (file: LocalFile) => {
    const link = document.createElement("a");
    link.href = file.content;
    link.download = file.name;
    link.click();
    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, lastAccessed: new Date().toISOString() } : f
      )
    );
  };

  const handleUseInDocBuilder = async (file: LocalFile) => {
    setBuilderLoading(file.id);
    try {
      // Sync to DB for AI Chat context (best-effort, don't await)
      syncFileToChat(file);

      // Build a title from the file name (strip extension)
      const title = file.name.replace(/\.[^.]+$/, "") || file.name;

      // Create a new document via the API
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: "", category: "general" }),
      });
      const data = await res.json();
      if (!res.ok || !data.document?.id) {
        alert("Failed to create document. Please try again.");
        return;
      }
      const docId = data.document.id as string;

      // Convert file content to HTML for the editor
      let html = "";
      if (file.type.startsWith("text/") || file.type === "application/json") {
        try {
          const decoded = atob(file.content.split(",")[1] || "");
          html = decoded.startsWith("<")
            ? decoded
            : `<p>${decoded.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
        } catch {
          html = `<p>Imported from: ${file.name}</p>`;
        }
      } else {
        // For PDFs, DOCX, and other binary files insert a placeholder
        html = `<h2>${title}</h2><p><em>File imported from My Files: ${file.name}</em></p><p>Edit this document to add your content.</p>`;
      }

      // Push the content to the document
      if (html) {
        await fetch("/api/onlyoffice/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: docId, html }),
        }).catch(() => {/* non-critical */});
      }

      // Navigate directly to the document editor
      router.push(`/documents/${docId}`);
    } catch {
      alert("Failed to open in Document Builder. Please try again.");
    } finally {
      setBuilderLoading(null);
    }
  };

  // Sync a single file to DB so AI Chat can reference it
  const syncFileToChat = async (file: LocalFile) => {
    try {
      await fetch("/api/my-files/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ id: file.id, name: file.name, type: file.type, size: file.size, category: file.category, content: file.content }],
        }),
      });
    } catch { /* silent — sync is best-effort */ }
  };

  // Convert a locally-stored LocalFile (data URL) to a browser File object
  const localFileToFile = async (lf: LocalFile): Promise<File> => {
    const res = await fetch(lf.content);
    const blob = await res.blob();
    return new File([blob], lf.name, { type: lf.type || "application/octet-stream" });
  };

  const openAIAnalysis = async (file: LocalFile) => {
    syncFileToChat(file);
    try {
      const browserFile = await localFileToFile(file);
      setDocAnalysisFile(browserFile);
      setShowDocAnalysisModal(true);
    } catch {
      alert("Failed to prepare file for analysis. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-4 sm:space-y-6" id="tour-myfiles">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">My Files</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your personal legal documents stored locally in your browser
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Files</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>

      {/* Important Disclaimer */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Local Storage Only</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            All files uploaded here are saved <strong>only in your browser&apos;s local storage</strong>.
            They are <strong>not uploaded to JusConsultus servers</strong>. Clearing your browser
            data will permanently delete these files. We recommend keeping backup copies of important documents.
          </p>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="flex items-center gap-4 bg-surface rounded-xl border border-border p-4">
        <HardDrive className="w-5 h-5 text-text-secondary" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text-secondary">
              Storage Used: {formatFileSize(totalSize)} of {formatFileSize(MAX_STORAGE)}
            </span>
            <span className="text-xs text-text-tertiary">{files.length} files</span>
          </div>
          <ProgressBar
            value={Math.min((totalSize / MAX_STORAGE) * 100, 100)}
            aria-label="Storage usage"
            barClassName={totalSize / MAX_STORAGE > 0.8 ? "bg-red-500" : "bg-primary-600"}
          />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="input pl-9 pr-4 py-2 text-sm w-full"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input text-sm py-2 px-3"
          title="Filter by category"
        >
          {FILE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 transition-colors",
              viewMode === "list" ? "bg-primary-50 text-primary-600" : "hover:bg-surface-secondary text-text-secondary"
            )}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 transition-colors",
              viewMode === "grid" ? "bg-primary-50 text-primary-600" : "hover:bg-surface-secondary text-text-secondary"
            )}
            title="Grid view"
          >
            <Grid2X2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-16 h-16 text-text-tertiary mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {files.length === 0 ? "No files yet" : "No matching files"}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            {files.length === 0
              ? "Upload your personal legal forms and documents. They'll be stored locally in your browser and can be reused in the Document Builder."
              : "Try a different search term or category filter."}
          </p>
          {files.length === 0 && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Your First File
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-surface rounded-xl border border-border divide-y divide-border">
          {filtered.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-secondary/40 transition-colors"
            >
              {/* File icon + type badge */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  {getFileIcon(file.type)}
                </div>
                <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 py-0.5 rounded bg-slate-700 text-white leading-none">
                  {getFileTypeBadge(file.type)}
                </span>
              </div>

              {/* File name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-text-tertiary">
                  <span>{formatFileSize(file.size)}</span>
                  <span>·</span>
                  <span className="capitalize">{file.category.replace(/-/g, " ")}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(file.uploadedAt)}
                  </span>
                </div>
              </div>

              {/* Action buttons — always visible */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Icon-only: Preview */}
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-2 rounded-lg hover:bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Icon-only: Download */}
                <button
                  onClick={() => handleDownload(file)}
                  className="p-2 rounded-lg hover:bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Divider */}
                <span className="w-px h-5 bg-border mx-1" />

                {/* Labeled: AI Analyze */}
                <button
                  onClick={() => openAIAnalysis(file)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium transition-colors border border-purple-200 dark:border-purple-700/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Analyze
                </button>

                {/* Labeled: Use in Builder */}
                <button
                  onClick={() => handleUseInDocBuilder(file)}
                  disabled={builderLoading === file.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-medium transition-colors border border-primary-200 dark:border-primary-700/40 disabled:opacity-60"
                >
                  {builderLoading === file.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  Use in Builder
                </button>

                {/* Divider */}
                <span className="w-px h-5 bg-border mx-1" />

                {/* Delete / confirm */}
                {deleteConfirm === file.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-lg font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2.5 py-1.5 text-xs border border-border rounded-lg text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(file.id)}
                    title="Delete file"
                    aria-label="Delete file"
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-text-tertiary hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((file) => (
            <div
              key={file.id}
              className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-all flex flex-col"
            >
              {/* Icon + type badge */}
              <div className="relative w-fit mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  {getFileIcon(file.type, "lg")}
                </div>
                <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 py-0.5 rounded bg-slate-700 text-white leading-none">
                  {getFileTypeBadge(file.type)}
                </span>
              </div>

              {/* Name + meta */}
              <p className="text-sm font-medium text-text-primary truncate mb-0.5">{file.name}</p>
              <p className="text-xs text-text-tertiary mb-1">{formatFileSize(file.size)}</p>
              <p className="text-xs text-text-tertiary mb-3 capitalize">{file.category.replace(/-/g, " ")}</p>

              {/* Primary actions */}
              <div className="flex gap-1.5 mb-2">
                <button
                  onClick={() => openAIAnalysis(file)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium transition-colors border border-purple-200 dark:border-purple-700/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI
                </button>
                <button
                  onClick={() => handleUseInDocBuilder(file)}
                  disabled={builderLoading === file.id}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-medium transition-colors border border-primary-200 dark:border-primary-700/40 disabled:opacity-60"
                >
                  {builderLoading === file.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  Builder
                </button>
              </div>

              {/* Secondary actions */}
              <div className="flex items-center gap-1 pt-2 border-t border-border">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-surface-tertiary text-text-secondary text-xs transition-colors"
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-surface-tertiary text-text-secondary text-xs transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                {deleteConfirm === file.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(file.id)} className="px-2 py-1.5 text-xs bg-red-600 text-white rounded-lg font-medium">Del</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 text-xs border border-border rounded-lg">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(file.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-text-tertiary hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">Upload Files</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-surface-tertiary rounded-lg" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="input w-full text-sm"
                  title="File category"
                >
                  {FILE_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                  dragActive
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-border hover:border-primary-300"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
                <p className="text-sm font-medium text-text-primary">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Supports PDF, DOC, DOCX, TXT, and image files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  title="Upload files"
                />
              </div>

              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg p-3">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Files are stored in your browser&apos;s local storage only. They are never uploaded
                  to our servers. Storage is limited to approximately 5 MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-semibold text-sm">{previewFile.name}</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {formatFileSize(previewFile.size)} · Uploaded {formatDate(previewFile.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleDownload(previewFile)} className="p-2 hover:bg-surface-tertiary rounded-lg" title="Download">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-surface-tertiary rounded-lg" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {previewFile.type.startsWith("image/") ? (
                <div className="p-5">
                  <img src={previewFile.content} alt={previewFile.name} className="max-w-full rounded-lg" />
                </div>
              ) : previewFile.type === "application/pdf" || previewFile.type.includes("pdf") ? (
                <iframe
                  src={previewFile.content}
                  className="w-full h-full min-h-[60vh]"
                  title={previewFile.name}
                />
              ) : previewFile.type.startsWith("text/") ? (
                <div className="p-5">
                  <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono bg-surface-secondary p-4 rounded-lg">
                    {(() => { try { return atob(previewFile.content.split(",")[1] || ""); } catch { return previewFile.content; } })()}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                  <FileIcon className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Preview not available</p>
                  <p className="text-xs mt-1 text-text-tertiary">Use the download button to open this file.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Document Analysis Modal */}
      <DocumentAnalysisModal
        isOpen={showDocAnalysisModal}
        onClose={() => { setShowDocAnalysisModal(false); setDocAnalysisFile(null); }}
        initialFile={docAnalysisFile ?? undefined}
      />
    </div>
  );
}
