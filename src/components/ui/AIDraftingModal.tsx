"use client";

import { useState, useCallback } from "react";
import { X, Wand2, Sparkles, ChevronDown, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_TEMPLATE_CATEGORIES } from "@/lib/documentFormats/scPaperRule";

export interface GenerationParams {
  templateId: string;
  templateName: string;
  category: string;
  prompt: string;
  tone: string;
  style: string;
  length: string;
  jurisdiction?: string;
  additionalContext?: string;
}

interface AIDraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: GenerationParams) => Promise<void>;
  initialDocType?: string;
}

const TONE_OPTIONS = [
  { value: "formal", label: "Formal", desc: "Professional and authoritative" },
  { value: "assertive", label: "Assertive", desc: "Strong and persuasive" },
  { value: "neutral", label: "Neutral", desc: "Balanced and objective" },
  { value: "conciliatory", label: "Conciliatory", desc: "Cooperative and diplomatic" },
];

const STYLE_OPTIONS = [
  { value: "standard", label: "Standard", desc: "Traditional legal format" },
  { value: "modern", label: "Modern", desc: "Contemporary, reader-friendly" },
  { value: "concise", label: "Concise", desc: "Brief and to the point" },
  { value: "comprehensive", label: "Comprehensive", desc: "Detailed and thorough" },
];

const LENGTH_OPTIONS = [
  { value: "short", label: "Short", pages: "1–2 pages" },
  { value: "medium", label: "Medium", pages: "3–5 pages" },
  { value: "long", label: "Long", pages: "6–10 pages" },
  { value: "detailed", label: "Detailed", pages: "10+ pages" },
];

const QUICK_CLAUSES = [
  "Include jurisdiction clause",
  "Add Force Majeure provision",
  "Include arbitration clause",
  "Add confidentiality provision",
  "Include indemnification clause",
  "Add governing law (Philippines)",
];

export default function AIDraftingModal({ isOpen, onClose, onGenerate, initialDocType }: AIDraftingModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialDocType ? Object.keys(AI_TEMPLATE_CATEGORIES).find((k) =>
      AI_TEMPLATE_CATEGORIES[k as keyof typeof AI_TEMPLATE_CATEGORIES].templates.some(
        (t) => t.id === initialDocType || t.name.toLowerCase().includes(initialDocType.toLowerCase())
      )
    ) || "pleadings" : "pleadings"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialDocType || "");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("formal");
  const [style, setStyle] = useState("standard");
  const [length, setLength] = useState("medium");
  const [jurisdiction, setJurisdiction] = useState("Republic of the Philippines");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"template" | "details">("template");

  const currentCategoryData = AI_TEMPLATE_CATEGORIES[selectedCategory as keyof typeof AI_TEMPLATE_CATEGORIES];
  const selectedTemplateData = currentCategoryData?.templates.find((t) => t.id === selectedTemplate);

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !prompt.trim()) return;
    setIsGenerating(true);
    try {
      await onGenerate({
        templateId: selectedTemplate,
        templateName: selectedTemplateData?.name || selectedTemplate,
        category: selectedCategory,
        prompt,
        tone,
        style,
        length,
        jurisdiction,
      });
      onClose();
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, selectedTemplateData, selectedCategory, prompt, tone, style, length, jurisdiction, onGenerate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">AI Document Drafter</h3>
              <p className="text-xs text-text-secondary">Generate Philippine legal documents with AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === "template" ? (
            <div className="p-5 space-y-4">
              {/* Category Tabs */}
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Document Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(AI_TEMPLATE_CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => { setSelectedCategory(key); setSelectedTemplate(""); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        selectedCategory === key
                          ? "bg-primary-600 text-white"
                          : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              {currentCategoryData && (
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                    Select Document Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {currentCategoryData.templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          selectedTemplate === template.id
                            ? "border-primary-600 bg-primary-50"
                            : "border-border hover:border-primary-300 hover:bg-surface-secondary"
                        )}
                      >
                        <p className={cn("text-sm font-medium", selectedTemplate === template.id ? "text-primary-700" : "text-text-primary")}>
                          {template.name}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SC Paper Rule notice */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  Documents are generated following the <strong>SC Efficient Use of Paper Rule (A.M. No. 11-9-4-SC)</strong> — Arial 14pt, legal paper (8.5" × 13"), proper SC margins.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Selected template info */}
              <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-100 rounded-xl">
                <Sparkles className="w-4 h-4 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary-700">{selectedTemplateData?.name || selectedTemplate}</p>
                  <p className="text-xs text-primary-600">{currentCategoryData?.label}</p>
                </div>
              </div>

              {/* Main Prompt */}
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">
                  Document Details & Instructions *
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe the specific details for this ${selectedTemplateData?.name || "document"}...\n\nExample: Plaintiff Juan dela Cruz filed against Defendant Pedro Santos for collection of PHP 500,000. The parties are in Quezon City. Include cause of action for breach of contract.`}
                  className="input resize-none min-h-30 text-sm w-full"
                  autoFocus
                />
              </div>

              {/* Quick Clauses */}
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Quick Add Clauses</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CLAUSES.map((clause) => (
                    <button
                      key={clause}
                      onClick={() => setPrompt((p) => p + (p && !p.endsWith(" ") ? ". " : "") + clause)}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-border hover:bg-primary-50 hover:border-primary-300 transition-colors"
                    >
                      + {clause}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone & Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Tone</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTone(opt.value)}
                        className={cn("p-2 rounded-lg border text-left transition-colors", tone === opt.value ? "border-primary-600 bg-primary-50" : "border-border hover:bg-surface-secondary")}
                      >
                        <p className={cn("text-xs font-medium", tone === opt.value ? "text-primary-700" : "text-text-primary")}>{opt.label}</p>
                        <p className="text-[10px] text-text-secondary">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Length</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLength(opt.value)}
                        className={cn("p-2 rounded-lg border text-left transition-colors", length === opt.value ? "border-primary-600 bg-primary-50" : "border-border hover:bg-surface-secondary")}
                      >
                        <p className={cn("text-xs font-medium", length === opt.value ? "text-primary-700" : "text-text-primary")}>{opt.label}</p>
                        <p className="text-[10px] text-text-secondary">{opt.pages}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
                  Advanced Options
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Style</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setStyle(opt.value)}
                            className={cn("p-2 rounded-lg border text-center transition-colors", style === opt.value ? "border-primary-600 bg-primary-50 text-primary-700" : "border-border text-text-secondary hover:bg-surface-secondary")}
                          >
                            <p className="text-xs font-medium">{opt.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Jurisdiction</label>
                      <input
                        type="text"
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        placeholder="e.g., Republic of the Philippines"
                        title="Jurisdiction"
                        className="input text-sm w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-border shrink-0">
          {step === "template" ? (
            <>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-surface-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep("details")}
                disabled={!selectedTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40"
              >
                Continue
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep("template")} className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-surface-secondary transition-colors">
                Back
              </button>
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-tertiary">AI will generate with Philippine legal standards</p>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Document</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
