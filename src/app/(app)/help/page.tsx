"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  MessageCircle,
  Mail,
  FileText,
  ChevronRight,
  Search,
  BookOpen,
  Shield,
  Zap,
  Database,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

const HELP_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: <Zap className="w-5 h-5" />,
    color: "bg-blue-50 text-blue-600 border-blue-200",
    articles: [
      {
        id: "welcome",
        title: "Welcome to JusConsultus AI",
        content: `JusConsultus AI is the most comprehensive AI-powered legal research platform for the Philippine Justice System. Here's how to get started:\n\n**1. AI Legal Chat**\nAsk any legal question and receive comprehensive, citation-backed answers sourced from Philippine jurisprudence, statutes, and legal documents.\n\n**2. Legal Database**\nBrowse Supreme Court decisions, Republic Acts, Executive Orders, and more — all indexed and searchable.\n\n**3. Document Builder**\nCreate legal documents with AI-assisted drafting. Choose from templates or generate documents from scratch.\n\n**4. My Files**\nUpload and manage your personal legal documents. Files are stored securely in your browser's local storage.`,
      },
      {
        id: "account-setup",
        title: "Setting Up Your Account",
        content: `**Creating an Account**\n1. Click "Get Started Free" on the homepage\n2. Enter your email, name, and password\n3. Complete the onboarding questionnaire\n\n**Profile Settings**\nCustomize your profile at any time by clicking your avatar in the top-right corner and selecting "Profile."\n\n**Subscription Plans**\n- **Free**: 15 AI searches/month, basic database access\n- **Professional (₱888/mo)**: 500 searches, full database, unlimited documents — 20% off quarterly/semiannual, 30% off annual\n- **Team (₱2,999/mo)**: 2,000 searches, collaboration, team management — 20% off quarterly/semiannual, 30% off annual`,
      },
      {
        id: "first-search",
        title: "Your First Legal Search",
        content: `**Using AI Chat**\n1. Navigate to the AI Chat page\n2. Type your legal question in the search box\n3. Select a response mode (Context Awareness v1 recommended)\n4. Press Enter or click Send\n\n**Tips for Better Results**\n- Be specific about the legal issue\n- Include relevant facts and jurisdiction\n- Reference specific laws or cases if known\n- Use the Advanced Settings to fine-tune temperature and token limits\n\n**Response Modes**\n- **Context Awareness v1**: Best accuracy with full contextual analysis\n- **Professional**: Detailed analysis for practitioners\n- **Educational**: Great for law students\n- **Simple English**: For non-lawyers`,
      },
    ],
  },
  {
    id: "ai-chat",
    label: "AI Chat",
    icon: <MessageCircle className="w-5 h-5" />,
    color: "bg-green-50 text-green-600 border-green-200",
    articles: [
      {
        id: "chat-modes",
        title: "Understanding Chat Modes",
        content: `JusConsultus AI offers multiple response modes:\n\n**Context Awareness v1** (Recommended)\nOur most advanced mode. Uses AI-powered contextual analysis to understand the full scope of your legal query.\n\n**Standard**\nBalanced depth and readability for general legal questions.\n\n**Concise**\nUltra-efficient legal summaries for quick reference.\n\n**Professional**\nDetailed legal analysis with risk assessments and practical guidance.\n\n**Educational**\nDesigned for law students and bar examinees with explanatory depth.\n\n**Simple English**\nPlain language explanations for non-lawyers.`,
      },
      {
        id: "advanced-settings",
        title: "Advanced AI Settings",
        content: `**Temperature**\nControls the creativity/randomness of AI responses.\n- Lower (0.0–0.3): More focused, deterministic answers\n- Medium (0.4–0.7): Balanced responses\n- Higher (0.8–1.0): More creative, varied outputs\n\n**Max Tokens**\nControls the maximum length of AI responses.\n- 512: Short, concise answers\n- 1024–2048: Standard length\n- 4096: Detailed, comprehensive responses\n\n**Custom System Prompt**\nAdvanced users can provide a custom system prompt to guide the AI's behavior and focus area.`,
      },
      {
        id: "citations",
        title: "Verifying AI Citations",
        content: `Every AI response includes clickable citations to primary legal sources.\n\n**How to Verify**\n1. Look for highlighted case titles or law references in the response\n2. Click on any citation to open the source document\n3. Review the full text, AI summary, or digest in the side panel\n4. Use the "Sources" tab to see all referenced documents\n\n**Source Categories**\n- **Jurisprudence**: Supreme Court decisions and resolutions\n- **Law**: Republic Acts, statutes, and codes\n- **Others**: Executive issuances, treaties, and reference materials`,
      },
    ],
  },
  {
    id: "legal-database",
    label: "Legal Database",
    icon: <Database className="w-5 h-5" />,
    color: "bg-purple-50 text-purple-600 border-purple-200",
    articles: [
      {
        id: "browsing-database",
        title: "Browsing the Legal Database",
        content: `The Legal Database is organized into five main categories:\n\n**Supreme Court**\n- SC Case Index\n- Decisions / Signed Resolutions\n\n**Laws**\n- Republic Acts, Commonwealth Acts, Presidential Decrees\n- Rules of Court, Constitutions\n\n**Executive Issuances**\n- Executive Orders, Administrative Orders\n- Memorandum Circulars, Presidential Proclamations\n\n**References**\n- Benchbooks, Judicial Forms\n- Supreme Court Stylebook\n\n**Treaties**\n- Bilateral and Regional agreements`,
      },
      {
        id: "searching",
        title: "Searching for Documents",
        content: `**Basic Search**\nUse the search bar on the database page to find documents by title, number, or keywords.\n\n**Category Filters**\nClick on category tabs to narrow your search to specific document types.\n\n**AI-Powered Search**\nUse the AI Chat to perform semantic searches across the entire legal corpus. The AI understands context and can find relevant documents even without exact keyword matches.`,
      },
    ],
  },
  {
    id: "document-builder",
    label: "Document Builder",
    icon: <FileText className="w-5 h-5" />,
    color: "bg-amber-50 text-amber-600 border-amber-200",
    articles: [
      {
        id: "creating-documents",
        title: "Creating Legal Documents",
        content: `**Quick Start**\n1. Go to Documents → New Document\n2. Choose a creation mode:\n   - **Blank Document**: Start from scratch\n   - **Use Template**: Pre-built Philippine legal templates\n   - **Generate with AI**: AI-assisted drafting\n3. Select the document type and category\n4. Enter a title and click "Create Document"\n\n**Document Categories**\n- Civil (Complaints, Motions, Petitions)\n- Criminal (Affidavits, Informations, Bail Petitions)\n- Contracts (Lease, Sale, Service Agreements, NDAs)\n- Corporate (Articles of Incorporation, Resolutions)\n- Administrative (Position Papers, Appeals)\n- Notarial (Affidavits, Powers of Attorney)`,
      },
      {
        id: "ai-drafting",
        title: "AI-Assisted Document Drafting",
        content: `**How It Works**\n1. Choose "Generate with AI" when creating a new document\n2. Select the document type\n3. Provide specific instructions:\n   - Parties involved\n   - Key facts and circumstances\n   - Special requirements or clauses\n4. Click "Generate Document"\n\n**Tips for Better AI Drafts**\n- Provide as much detail as possible\n- Specify the jurisdiction (Philippine law)\n- Mention relevant laws or rules\n- Review and edit the generated draft carefully\n\n**Redline & Review**\nUse the editor to refine AI-generated content. Track changes and compare versions.`,
      },
      {
        id: "my-files",
        title: "My Files & Personal Documents",
        content: `**About My Files**\nMy Files allows you to upload and manage your personal legal documents directly in your browser.\n\n**Important**: All files are stored in your browser's local storage. They are NOT uploaded to our servers.\n\n**Supported Features**\n- Upload legal forms and documents\n- Recycle content from your own legal forms\n- Access files in the Document Builder\n- Export and download anytime\n\n**Storage Limits**\nLocal storage is limited by your browser (typically 5–10 MB). Large documents should be kept as external files.`,
      },
    ],
  },
  {
    id: "account-billing",
    label: "Account & Billing",
    icon: <Shield className="w-5 h-5" />,
    color: "bg-rose-50 text-rose-600 border-rose-200",
    articles: [
      {
        id: "manage-subscription",
        title: "Managing Your Subscription",
        content: `**Upgrading Your Plan**\n1. Go to the Upgrade page via the sidebar or navbar\n2. Choose between Professional (₱888/mo) or Team (₱2,999/mo)\n3. Select your billing cycle: Monthly, Quarterly (20% off), Semiannual (20% off), or Annual (30% off)\n4. Click "Start Free Trial" to begin\n\n**Cancellation**\nYou can cancel your subscription at any time from your Profile settings. Your access continues until the end of the billing period.\n\n**Refunds**\nRefund requests are handled on a case-by-case basis. Contact support for assistance.`,
      },
      {
        id: "data-privacy",
        title: "Data Privacy & Security",
        content: `**Your Data**\n- Chat conversations are encrypted and stored securely\n- Documents saved via the Document Builder are stored on our servers\n- My Files uses local browser storage only — NOT uploaded to servers\n\n**Compliance**\n- We comply with R.A. 10173 (Data Privacy Act of 2012)\n- Your data is never shared with third parties\n- You can request data deletion at any time\n\n**Security**\n- All connections use HTTPS/TLS encryption\n- Passwords are hashed with bcrypt\n- Authentication uses JWT tokens`,
      },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "How accurate are the AI responses?",
    a: "JusConsultus AI uses Retrieval-Augmented Generation (RAG) to provide citation-backed answers from authoritative Philippine legal sources. While highly accurate, AI responses should always be verified by a qualified legal professional before relying on them for actual legal matters.",
  },
  {
    q: "Are my files and conversations private?",
    a: "Yes. Chat conversations are encrypted. Documents in the Document Builder are stored on secure servers. My Files stores data in your browser's local storage only — nothing is uploaded to our servers. We comply with R.A. 10173 (Data Privacy Act).",
  },
  {
    q: "What happens when I run out of free searches?",
    a: "On the Free plan, you receive 15 AI searches per month. Once depleted, you can wait for the monthly reset or upgrade to a paid plan for more searches. Database browsing and document creation remain available.",
  },
  {
    q: "Can I use JusConsultus AI for actual legal practice?",
    a: "JusConsultus AI is a legal research tool designed to assist legal professionals. It should be used as a research aid, not a substitute for professional legal judgment. Always review and verify AI-generated content before use in legal proceedings.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach our support team through the Help page by clicking 'Contact Support,' emailing support@jusconsultus.ai, or using the in-app feedback form. Our team typically responds within 24 hours on business days.",
  },
  {
    q: "What browsers are supported?",
    a: "JusConsultus AI works best on modern browsers including Google Chrome, Microsoft Edge, Mozilla Firefox, and Safari. We recommend keeping your browser updated to the latest version for the best experience.",
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [contactSent, setContactSent] = useState(false);

  const currentCategory = HELP_CATEGORIES.find((c) => c.id === activeCategory);
  const currentArticle = currentCategory?.articles.find((a) => a.id === activeArticle);

  // Search across all articles
  const searchResults = searchQuery.trim()
    ? HELP_CATEGORIES.flatMap((cat) =>
        cat.articles
          .filter(
            (a) =>
              a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((a) => ({ ...a, categoryId: cat.id, categoryLabel: cat.label }))
      )
    : [];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setContactForm({ subject: "", message: "" });
    setTimeout(() => setContactSent(false), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Help Center</h1>
        <p className="text-text-secondary mt-2 max-w-lg mx-auto">
          Find answers, learn about features, and get support for JusConsultus AI
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help articles..."
          className="input pl-12 pr-4 py-3.5 text-base w-full"
        />
        {/* Search Results Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border shadow-xl z-10 max-h-80 overflow-auto">
            {searchResults.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary text-center">No results found</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setActiveCategory(result.categoryId);
                    setActiveArticle(result.id);
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-surface-secondary border-b border-border last:border-0 transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary">{result.title}</p>
                  <p className="text-xs text-text-secondary">{result.categoryLabel}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
        {HELP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setActiveArticle(null);
            }}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center",
              activeCategory === cat.id
                ? cat.color
                : "border-border hover:border-primary-300 hover:bg-surface-secondary"
            )}
          >
            {cat.icon}
            <span className="text-xs font-medium">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 shrink-0 hidden lg:block">
          <nav className="space-y-1 sticky top-24">
            {HELP_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setActiveArticle(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeCategory === cat.id
                      ? "bg-primary-50 text-primary-700"
                      : "text-text-secondary hover:bg-surface-secondary"
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </button>
                {activeCategory === cat.id && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    {cat.articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => setActiveArticle(article.id)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                          activeArticle === article.id
                            ? "text-primary-700 bg-primary-50 font-medium"
                            : "text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {article.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {currentArticle ? (
            /* Article View */
            <div className="bg-white rounded-xl border border-border p-8">
              <button
                onClick={() => setActiveArticle(null)}
                className="text-xs text-primary-600 hover:underline mb-4 flex items-center gap-1"
              >
                ← Back to {currentCategory?.label}
              </button>
              <h2 className="text-2xl font-bold text-text-primary mb-6">{currentArticle.title}</h2>
              <div className="prose prose-sm max-w-none">
                {currentArticle.content.split("\n\n").map((paragraph, i) => (
                  <div key={i} className="mb-4">
                    {paragraph.split("\n").map((line, j) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return (
                          <h3 key={j} className="text-base font-bold text-text-primary mt-4 mb-2">
                            {line.replace(/\*\*/g, "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("- **")) {
                        const match = line.match(/^- \*\*(.*?)\*\*:?\s*(.*)/);
                        if (match) {
                          return (
                            <div key={j} className="flex gap-2 my-1.5 text-sm text-text-secondary">
                              <span className="text-primary-600 mt-0.5">•</span>
                              <span>
                                <strong className="text-text-primary">{match[1]}</strong>
                                {match[2] ? `: ${match[2]}` : ""}
                              </span>
                            </div>
                          );
                        }
                      }
                      if (line.match(/^\d+\./)) {
                        return (
                          <div key={j} className="flex gap-2 my-1.5 text-sm text-text-secondary">
                            <span className="text-primary-600 font-bold">{line.match(/^(\d+)\./)?.[1]}.</span>
                            <span>{line.replace(/^\d+\.\s*/, "")}</span>
                          </div>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <div key={j} className="flex gap-2 my-1 text-sm text-text-secondary">
                            <span className="text-primary-600">•</span>
                            <span>{line.slice(2)}</span>
                          </div>
                        );
                      }
                      return line ? (
                        <p
                          key={j}
                          className="text-sm text-text-secondary leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary">$1</strong>'),
                          }}
                        />
                      ) : null;
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Category Articles List */
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">{currentCategory?.label}</h2>
                <p className="text-sm text-text-secondary">
                  {currentCategory?.articles.length} articles in this section
                </p>
              </div>
              <div className="space-y-3">
                {currentCategory?.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticle(article.id)}
                    className="w-full text-left bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary-300 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                          {article.content.slice(0, 120).replace(/\*\*/g, "").replace(/\n/g, " ")}...
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-primary-600 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Section */}
          {!currentArticle && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-text-primary mb-6">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {FAQ_ITEMS.map((faq, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <span className="font-medium text-sm text-text-primary pr-4">{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-text-secondary shrink-0 transition-transform",
                          expandedFAQ === i && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedFAQ === i && (
                      <div className="px-5 pb-5 text-sm text-text-secondary leading-relaxed border-t border-border pt-4 animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Support */}
          {!currentArticle && (
            <div className="mt-12 bg-linear-to-r from-primary-50 to-primary-100 rounded-2xl border border-primary-200 p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary mb-1">Contact Support</h3>
                  <p className="text-sm text-text-secondary mb-6">
                    Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you.
                  </p>

                  {contactSent ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Your message has been sent! We&apos;ll respond within 24 hours.
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Subject</label>
                        <input
                          type="text"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm((f) => ({ ...f, subject: e.target.value }))}
                          placeholder="What do you need help with?"
                          className="input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Message</label>
                        <textarea
                          value={contactForm.message}
                          onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                          placeholder="Describe your issue or question in detail..."
                          className="input w-full resize-none min-h-30"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        Send Message
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          {!currentArticle && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/terms"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:shadow-md transition-all group"
              >
                <Scale className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-primary-600">Terms of Service</p>
                  <p className="text-xs text-text-secondary">Legal terms and conditions</p>
                </div>
                <ExternalLink className="w-4 h-4 text-text-tertiary ml-auto" />
              </Link>
              <Link
                href="/privacy"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:shadow-md transition-all group"
              >
                <Shield className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-primary-600">Privacy Policy</p>
                  <p className="text-xs text-text-secondary">How we handle your data</p>
                </div>
                <ExternalLink className="w-4 h-4 text-text-tertiary ml-auto" />
              </Link>
              <a
                href="mailto:support@jusconsultus.ai"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:shadow-md transition-all group"
              >
                <Mail className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-primary-600">Email Support</p>
                  <p className="text-xs text-text-secondary">support@jusconsultus.ai</p>
                </div>
                <ExternalLink className="w-4 h-4 text-text-tertiary ml-auto" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
