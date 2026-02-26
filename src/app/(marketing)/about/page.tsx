import Link from "next/link";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { Users, ArrowRight } from "lucide-react";

export default async function AboutPage() {
  const user = await getCurrentUser();
  
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 space-y-16">
        {/* Hero */}
        <div className="text-center">
          <Badge variant="accent" className="mb-4">About Us</Badge>
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Making Philippine Law <span className="text-primary-600">Accessible to Everyone</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            JusConsultus AI is an AI-powered legal research platform designed specifically for the Philippine Justice System — bringing the power of modern AI to lawyers, students, and citizens alike.
          </p>
        </div>

        {/* Mission */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Our Mission", desc: "To democratize access to Philippine legal information through cutting-edge AI technology, helping legal professionals research faster and citizens understand their rights." },
            { title: "Our Vision", desc: "A Philippines where every citizen can easily navigate the legal system, and every legal professional has a powerful AI research partner at their fingertips." },
            { title: "Our Impact", desc: "Serving hundreds of legal professionals across the Philippines with AI-powered research tools that reduce research time by up to 80%." },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-2xl border border-border">
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold text-text-primary">Our Story</h2>
          <p className="text-text-secondary leading-relaxed">
            JusConsultus AI was founded by a team of legal professionals and AI enthusiasts who saw firsthand the challenges of legal research in the Philippines. Thousands of Supreme Court decisions, hundreds of laws, and countless executive issuances — navigating this vast body of legal knowledge consumed enormous time and resources.
          </p>
          <p className="text-text-secondary leading-relaxed">
            We built JusConsultus AI to change that. By combining the latest advances in large language models, retrieval-augmented generation (RAG), and a comprehensive database of Philippine legal materials, we created a platform that can answer complex legal questions in seconds.
          </p>
          <p className="text-text-secondary leading-relaxed">
            Today, JusConsultus AI serves solo practitioners, top law firms, government agencies, and law schools across the Philippines — all united by the goal of making legal research faster, smarter, and more accessible.
          </p>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Built for Legal Professionals
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {["Solo Practitioners", "Law Firms", "Government Agencies", "Law Schools"].map((type) => (
              <div key={type} className="p-4 rounded-xl bg-surface-secondary">
                <p className="font-semibold text-sm">{type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-linear-to-r from-primary-50 to-accent-50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to transform your legal research?</h2>
          <p className="text-text-secondary mb-6">Start for free. No credit card required.</p>
          {user ? (
            <Link href="/chat" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors">
              Go to App <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link href="/signup" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
