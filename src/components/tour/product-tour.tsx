"use client";

import { useTourStore } from "@/stores";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const tourSteps = [
  {
    target: "tour-chat",
    title: "AI-Powered Legal Chat",
    content: "Ask legal questions and get comprehensive, citation-backed answers from Philippine jurisprudence and statutes. Use Advanced Settings to fine-tune temperature, token limits, and custom system prompts.",
    placement: "right" as const,
  },
  {
    target: "tour-database",
    title: "Legal Database",
    content: "Browse the complete Philippine legal database organized into Supreme Court decisions, Laws, Executive Issuances, References, and Treaties. Each document includes full text, AI summaries, and digests.",
    placement: "right" as const,
  },
  {
    target: "tour-documents",
    title: "Document Builder",
    content: "Create legal documents with AI-assisted drafting, live contract editing, and precedent library. Generate pleadings, motions, contracts, and more with pinpoint citations.",
    placement: "right" as const,
  },
  {
    target: "tour-myfiles",
    title: "My Files",
    content: "Upload and manage your personal legal forms and documents. Files are stored locally in your browser — never uploaded to our servers. Reuse content from your own files in the Document Builder.",
    placement: "right" as const,
  },
  {
    target: "tour-bookmarks",
    title: "Bookmarks",
    content: "Save important cases, laws, and documents for quick reference. Add notes and organize your research efficiently.",
    placement: "right" as const,
  },
  {
    target: "tour-help",
    title: "Help Center",
    content: "Access guides, FAQs, and contact support. Find help articles about AI Chat, Legal Database, Document Builder, and account management.",
    placement: "right" as const,
  },
  {
    target: "",
    title: "Response Modes",
    content: "Choose how JusConsultus AI responds: Context Awareness v1 for maximum accuracy, Concise for quick summaries, Professional for detailed analysis, Educational for learning, or Simple English for non-lawyers.",
    placement: "bottom" as const,
  },
  {
    target: "",
    title: "You're All Set! 🎉",
    content: "Start your legal research by asking a question in the AI Chat, browsing the Legal Database, or creating a document. JusConsultus AI is here to help you navigate Philippine law with confidence.",
    placement: "bottom" as const,
  },
];

export function ProductTour() {
  const { isActive, currentStep, end, next, prev } = useTourStore();

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const isLast = currentStep === tourSteps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-100 bg-black/40 backdrop-blur-sm" />

      {/* Highlight target element */}
      {step.target && (
        <style>{`
          #${step.target} {
            position: relative;
            z-index: 101;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.4);
            border-radius: 0.5rem;
          }
        `}</style>
      )}

      {/* Tour Card */}
      <div className={cn(
        "fixed z-102 w-105 bg-surface rounded-2xl shadow-2xl border border-border animate-fade-in overflow-hidden",
        step.target ? "top-1/3 left-72" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      )}>
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary-500 via-primary-600 to-primary-700" />
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-600" />
              </div>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                Product Tour • {currentStep + 1}/{tourSteps.length}
              </span>
            </div>
            <button 
              onClick={end} 
              className="p-2 rounded-lg hover:bg-surface-tertiary transition-colors group" 
              title="Close tour"
            >
              <X className="w-4 h-4 text-text-tertiary group-hover:text-text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 bg-linear-to-b from-white to-gray-50/50 dark:from-surface dark:to-surface-secondary">
          <h3 className="text-xl font-bold text-text-primary mb-3 leading-tight">{step.title}</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{step.content}</p>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-surface-secondary/50">
          <div className="flex gap-1.5">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  i <= currentStep ? "bg-primary-600" : "bg-gray-200 dark:bg-surface-tertiary"
                )}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-border">
          <button
            onClick={end}
            className="text-sm font-medium text-text-tertiary hover:text-primary-600 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={prev} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            <Button size="sm" onClick={isLast ? end : next} className="gap-1.5 shadow-sm">
              {isLast ? (
                <>
                  Get Started <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function TourTrigger() {
  const { start } = useTourStore();
  return (
    <Button variant="outline" size="sm" onClick={start} className="gap-2">
      <Sparkles className="w-4 h-4" /> Product Tour
    </Button>
  );
}
