// OnlyOfficeDocBuilderButton.tsx
// Button component for generating documents using ONLYOFFICE Document Builder API
// See: https://api.onlyoffice.com/docs/document-builder/builder-framework/

"use client";

import { useState, useCallback } from "react";
import { FileText, Loader2, Download, FileSpreadsheet, Presentation } from "lucide-react";

export type OutputFormat = "docx" | "xlsx" | "pptx" | "pdf" | "odt";

export interface DocBuilderTemplate {
  id: string;
  label: string;
  description?: string;
  outputType: OutputFormat;
  icon?: "word" | "excel" | "powerpoint";
}

interface OnlyOfficeDocBuilderButtonProps {
  /** The document ID in the database (used to fetch content) */
  documentId?: string;
  /** Pre-defined templates for the dropdown */
  templates?: DocBuilderTemplate[];
  /** Custom builder script to run (overrides template) */
  builderScript?: string;
  /** Custom data to merge into the template */
  data?: Record<string, any>;
  /** Output filename (without extension) */
  filename?: string;
  /** Callback after successful generation */
  onGenerated?: (blob: Blob, filename: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Custom class name */
  className?: string;
  /** Button label */
  label?: string;
  /** Show as compact button */
  compact?: boolean;
}

const DEFAULT_TEMPLATES: DocBuilderTemplate[] = [
  {
    id: "blank-document",
    label: "Blank Document",
    description: "Create an empty DOCX document",
    outputType: "docx",
    icon: "word",
  },
  {
    id: "legal-pleading",
    label: "Legal Pleading",
    description: "Philippine court pleading format",
    outputType: "docx",
    icon: "word",
  },
  {
    id: "contract",
    label: "Contract",
    description: "Standard contract template",
    outputType: "docx",
    icon: "word",
  },
  {
    id: "export-pdf",
    label: "Export as PDF",
    description: "Convert current document to PDF",
    outputType: "pdf",
    icon: "word",
  },
];

const iconMap = {
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
};

export default function OnlyOfficeDocBuilderButton({
  documentId,
  templates = DEFAULT_TEMPLATES,
  builderScript,
  data = {},
  filename = "generated",
  onGenerated,
  onError,
  className = "",
  label = "Generate Document",
  compact = false,
}: OnlyOfficeDocBuilderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocBuilderTemplate | null>(null);

  const handleGenerate = useCallback(
    async (template?: DocBuilderTemplate) => {
      setLoading(true);
      setShowDropdown(false);

      try {
        const body: Record<string, any> = {
          outputType: template?.outputType || "docx",
          templateId: template?.id,
          data: {
            ...data,
            documentId,
          },
        };

        if (builderScript) {
          body.builderScript = builderScript;
        }

        if (documentId) {
          body.documentId = documentId;
        }

        const res = await fetch("/api/onlyoffice/builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Generation failed (${res.status})`);
        }

        const contentType = res.headers.get("Content-Type") || "";
        const blob = await res.blob();
        const ext = template?.outputType || "docx";
        const outputFilename = `${filename}.${ext}`;

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = outputFilename;
        a.click();
        window.URL.revokeObjectURL(url);

        onGenerated?.(blob, outputFilename);
      } catch (err: any) {
        const msg = err?.message || "Failed to generate document";
        onError?.(msg);
        console.error("Document Builder error:", msg);
      } finally {
        setLoading(false);
      }
    },
    [documentId, data, builderScript, filename, onGenerated, onError]
  );

  if (compact) {
    return (
      <button
        onClick={() => handleGenerate(templates[0])}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {loading ? "Generating..." : label}
      </button>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => {
          if (templates.length === 1) {
            handleGenerate(templates[0]);
          } else {
            setShowDropdown(!showDropdown);
          }
        }}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        {loading ? "Generating..." : label}
      </button>

      {/* Dropdown for template selection */}
      {showDropdown && !loading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-64 bg-surface rounded-lg shadow-lg border border-border z-50 py-1">
            {templates.map((template) => {
              const Icon = iconMap[template.icon || "word"] || FileText;
              return (
                <button
                  key={template.id}
                  onClick={() => handleGenerate(template)}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface-secondary transition-colors flex items-start gap-3"
                >
                  <Icon className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {template.label}
                    </p>
                    {template.description && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {template.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
