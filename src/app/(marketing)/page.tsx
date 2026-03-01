import Link from "next/link";
import Image from "next/image";
import { Button, Card, Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  MessageSquare,
  Database,
  FileText,
  Scale,
  BookOpen,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Search,
  Brain,
  Zap,
  Users,
  Globe,
  ChevronRight,
  Send,
  Paperclip,
  ChevronDown,
  ToggleLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    Icon: MessageSquare,
    title: "AI-Powered Legal Chat",
    description:
      "Access a vast knowledge database that quickly delivers tailored legal insights, identifying relevant case law and regulations in Philippine jurisdiction.",
  },
  {
    Icon: Database,
    title: "Comprehensive Legal Database",
    description:
      "Browse Supreme Court decisions, laws, executive issuances, references, and treaties — all organized and searchable with AI.",
  },
  {
    Icon: FileText,
    title: "AI Document Builder",
    description:
      "Jumpstart any legal document with AI-powered drafting tools. Generate pleadings, motions, contracts, and more in minutes.",
  },
  {
    Icon: Search,
    title: "Intelligent Search",
    description:
      "RAG-powered semantic search across the entire Philippine legal corpus for precise, contextually relevant results.",
  },
  {
    Icon: Brain,
    title: "Document Analysis",
    description:
      "Upload documents for comprehensive AI analysis — grammar, legal context, clarity, and risk assessment in one click.",
  },
  {
    Icon: Zap,
    title: "Multiple AI Modes",
    description:
      "Choose from Standard, Concise, Professional, Educational, or Simple English modes tailored to your needs.",
  },
];

const databaseCategories = [
  { Icon: Scale, label: "Supreme Court", count: "50,000+" },
  { Icon: BookOpen, label: "Laws", count: "15,000+" },
  { Icon: Shield, label: "Executive Issuances", count: "10,000+" },
  { Icon: Globe, label: "Treaties", count: "2,000+" },
];

const plans = [
  {
    name: "Free",
    price: "₱0",
    period: "",
    features: ["14 days free trial", "15 searches/14 days", "Basic AI Chat", "Legal Database access", "Standard response modes"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "₱621",
    period: "/mo, billed annually",
    altPrice: "₱888/month",
    features: [
      "Unlimited searches",
      "All AI response modes",
      "Full Legal Database",
      "AI Document Builder",
      "OCR & Document Analysis",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Team",
    price: "₱2,099",
    period: "/mo, billed annually",
    altPrice: "₱2,999/month",
    features: [
      "All Pro features",
      "5 team members",
      "Shared workspace",
      "Team analytics",
      "Collaboration tools",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 text-center">
          <Badge variant="accent" className="mb-6 px-4 py-1.5 text-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI-Powered Legal Research
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            Legal Research,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 to-primary-300">
              Reimagined with AI
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed text-center">
            The most comprehensive AI-powered legal research platform for the
            Philippine Justice System. Access jurisprudence, statutes, and legal
            documents with intelligent analysis in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link href="/chat">
                <Button size="lg" className="bg-white text-primary-900 hover:bg-gray-100 px-8">
                  Go to App <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button size="lg" className="bg-white text-primary-900 hover:bg-gray-100 px-8">
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
            <Link href="/about">
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 border border-white/20">
                Learn More
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-400 text-center">
            Free 14-day trial • No credit card required
          </p>

          {/* Hero Preview */}
          <div className="mt-16 relative">
            <div className="rounded-2xl border border-white/20 p-3 max-w-4xl mx-auto bg-white/10 backdrop-blur-sm">
              <div className="rounded-xl shadow-2xl overflow-hidden bg-surface">
                {/* Browser chrome */}
                <div className="h-10 bg-surface-secondary border-b border-border flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 mx-4">
                    <div className="bg-surface border border-border rounded-full h-5 w-48 mx-auto flex items-center px-3">
                      <span className="text-[9px] text-text-tertiary truncate">jusconsultus.ai/chat</span>
                    </div>
                  </div>
                </div>
                {/* Chat UI preview */}
                <div className="p-6 text-left">
                  <div className="text-center mb-5">
                    <h3 className="text-lg font-bold text-text-primary">
                      Ask and it will be given to you — <span className="text-primary-700">Ask&nbsp;JusConsultus</span>
                    </h3>
                  </div>
                  <div className="max-w-xl mx-auto pointer-events-none select-none">
                    {/* Chat input — mirrors real ChatInput component */}
                    <div className="rounded-2xl border border-border bg-surface shadow-sm">
                      {/* Textarea area */}
                      <div className="p-3 pb-1">
                        <p className="text-text-tertiary text-sm py-1 px-1">
                          Ask a legal question or search for cases, laws, and issuances...
                        </p>
                        <p className="text-right text-[10px] text-text-tertiary opacity-50 pr-1 pb-1">Shift+Enter for new line</p>
                      </div>
                      {/* Toolbar */}
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Upload */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Upload</span>
                          </div>
                          {/* Context version chip */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface-secondary text-text-secondary">
                            <span>Standard v2</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[9px] font-bold leading-none">New</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </div>
                          {/* Deep Think */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border-transparent text-text-tertiary">
                            <Brain className="w-3.5 h-3.5" />
                            <span>Deep Think</span>
                            <ToggleLeft className="w-4 h-4" />
                          </div>
                        </div>
                        {/* Send button */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-900 text-white text-sm font-medium shrink-0">
                          <Send className="w-4 h-4" />
                          <span>Send</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-surface" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <Badge variant="primary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need for Legal Research
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto text-center">
              Powered by advanced AI with RAG technology, fine-tuned for Philippine law
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="group">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors mx-auto">
                  <feature.Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-center">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed text-center">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Database */}
      <section className="py-16 sm:py-24 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div>
              <Badge variant="accent" className="mb-4">Legal Database</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                The Most Complete Philippine Legal Database
              </h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed text-center">
                Access thousands of Supreme Court decisions, laws, executive issuances, treaties, and reference materials — all indexed, summarized, and searchable with AI.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {databaseCategories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                      <cat.Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-xs text-text-tertiary">{cat.count} documents</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/database">
                <Button>
                  Explore Database <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-lg p-6 text-center">
              <div className="space-y-4">
                {["Supreme Court", "Laws", "Executive Issuances", "References", "Treaties"].map((cat, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-sm">
                        {i + 1}
                      </div>
                      <span className="font-medium text-sm">{cat}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24 bg-surface" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <Badge variant="primary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-text-secondary text-center">
              Start free, upgrade as you grow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={cn(
                  "relative",
                  plan.popular && "border-primary-500 ring-2 ring-primary-500/20 sm:scale-105"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-text-secondary text-sm">{plan.period}</span>
                    </div>
                    {plan.altPrice && (
                      <span className="text-xs text-text-tertiary mt-1">or {plan.altPrice}</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-accent-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    variant={plan.popular ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-primary-900 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Transform Your Legal Research?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto text-center">
            Join thousands of Philippine legal professionals who trust JusConsultus AI for faster, more accurate legal research.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-primary-900 hover:bg-gray-100 px-10">
              Start Your Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
