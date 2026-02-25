"use client";

/**
 * Example implementation showing how to integrate the new authentication modals
 * and auth guard into your JusConsultus.AI application.
 * 
 * This file demonstrates:
 * 1. Using AuthGuard to protect features
 * 2. Using the useRequireAuth hook for programmatic checks
 * 3. Opening the signup modal manually
 * 4. Starting the product tour
 */

import { AuthGuard, useRequireAuth } from "@/components/auth";
import { useSignupModalStore, useTourStore } from "@/stores";
import { Button } from "@/components/ui";
import { MessageSquare, Database, FileText, Sparkles } from "lucide-react";

// Example 1: Protect entire feature with AuthGuard
export function ChatFeatureExample() {
  return (
    <AuthGuard feature="AI Legal Chat">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">AI Legal Chat</h2>
        <p>Ask any legal question and get instant answers backed by Philippine jurisprudence.</p>
        {/* Your chat interface here */}
      </div>
    </AuthGuard>
  );
}

// Example 2: Use hook for button click protection
export function DocumentBuilderExample() {
  const requireAuth = useRequireAuth();

  const handleCreateDocument = () => {
    // Check auth before proceeding
    if (!requireAuth("Document Builder")) {
      // User not authenticated, modal will show automatically
      return;
    }

    // User is authenticated, proceed with action
    console.log("Creating new document...");
    // createDocument();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Document Builder</h2>
      <p className="mb-4">Create professional legal documents with AI assistance.</p>
      <Button onClick={handleCreateDocument}>
        <FileText className="w-4 h-4 mr-2" />
        Create New Document
      </Button>
    </div>
  );
}

// Example 3: Database with custom fallback
export function DatabaseExample() {
  return (
    <AuthGuard
      feature="Legal Database"
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-lg px-4">
            <Database className="w-16 h-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Philippine Legal Database</h2>
            <p className="text-lg text-text-secondary mb-6">
              Access 100,000+ Supreme Court cases, laws, executive issuances, and treaties.
            </p>
            <ul className="text-left mb-6 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-primary-600">✓</span> Full-text search
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary-600">✓</span> AI-powered summaries
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary-600">✓</span> Citation management
              </li>
            </ul>
            {/* AuthGuard will handle showing sign up button */}
          </div>
        </div>
      }
    >
      <div className="p-6">
        {/* Your database browser here */}
        <h2 className="text-2xl font-bold mb-4">Browse Legal Database</h2>
      </div>
    </AuthGuard>
  );
}

// Example 4: Marketing page with manual signup trigger
export function LandingPageExample() {
  const { open } = useSignupModalStore();
  const { start } = useTourStore();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-6">
          AI-Powered Legal Research for Philippine Law
        </h1>
        <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
          Get instant answers to legal questions, draft documents, and browse the complete Philippine legal database.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => open()}>
            Get Started Free
          </Button>
          <Button size="lg" variant="outline" onClick={start}>
            <Sparkles className="w-4 h-4 mr-2" />
            Take a Tour
          </Button>
        </div>
        <p className="text-sm text-text-tertiary mt-4">
          Free for 14 days • No credit card required
        </p>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8" />}
            title="AI Legal Chat"
            description="Ask questions and get answers backed by Philippine jurisprudence"
            feature="AI Legal Chat"
          />
          <FeatureCard
            icon={<Database className="w-8 h-8" />}
            title="Legal Database"
            description="Browse 100,000+ cases, laws, and executive issuances"
            feature="Legal Database"
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Document Builder"
            description="Draft pleadings, contracts, and legal documents with AI"
            feature="Document Builder"
          />
        </div>
      </section>
    </div>
  );
}

// Feature card with auth requirement
function FeatureCard({ 
  icon, 
  title, 
  description, 
  feature 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  feature: string;
}) {
  const { open } = useSignupModalStore();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:border-primary-600 transition-colors">
      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-text-secondary mb-4">{description}</p>
      <button
        onClick={() => open(feature)}
        className="text-primary-600 font-medium hover:underline"
      >
        Try it now →
      </button>
    </div>
  );
}

// Example 5: Navigation bar with tour trigger
export function NavigationExample() {
  const { start } = useTourStore();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold">JusConsultus.AI</h1>
        <button onClick={start} className="text-sm text-primary-600 hover:underline">
          Take Tour
        </button>
      </div>
      {/* Other nav items */}
    </nav>
  );
}

// Example 6: Dashboard with multiple protected features
export function DashboardExample() {
  const requireAuth = useRequireAuth();

  const features = [
    {
      name: "AI Chat",
      feature: "AI Legal Chat",
      action: () => console.log("Navigate to chat"),
    },
    {
      name: "Database",
      feature: "Legal Database",
      action: () => console.log("Navigate to database"),
    },
    {
      name: "Documents",
      feature: "Document Builder",
      action: () => console.log("Navigate to documents"),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {features.map((item) => (
          <button
            key={item.name}
            onClick={() => {
              if (requireAuth(item.feature)) {
                item.action();
              }
            }}
            className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-primary-600 transition-all"
          >
            <h3 className="font-bold mb-2">{item.name}</h3>
            <p className="text-sm text-text-secondary">Click to access {item.feature}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
