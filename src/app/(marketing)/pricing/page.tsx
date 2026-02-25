"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { Check, Shield, Clock, HelpCircle } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const FEATURES = {
  free: ["14 days free trial", "15 searches/14 days", "Basic AI Chat", "Legal Database access", "Standard response mode"],
  pro: ["Unlimited searches", "All AI response modes", "Full Legal Database", "AI Document Builder", "OCR & Document Analysis", "Priority support", "Bookmarks & history"],
  team: ["All Pro features", "5 team members", "Shared workspace", "Collaboration tools", "Team analytics", "Dedicated support"],
  enterprise: ["All Team features", "Unlimited members", "Custom integrations", "On-premise option", "SLA guarantee", "Dedicated account manager"],
};

type BillingPeriod = "monthly" | "quarterly" | "semiannual" | "annual";

const BILLING_OPTIONS: { id: BillingPeriod; label: string; discount: number; badge?: string }[] = [
  { id: "monthly", label: "Monthly", discount: 0 },
  { id: "quarterly", label: "Quarterly", discount: 0.2, badge: "Save 20%" },
  { id: "semiannual", label: "Semiannual", discount: 0.2, badge: "Save 20%" },
  { id: "annual", label: "Annual", discount: 0.3, badge: "Save 30%" },
];

function getBillingLabel(billing: BillingPeriod): string {
  switch (billing) {
    case "quarterly": return "mo, billed quarterly";
    case "semiannual": return "mo, billed semiannually";
    case "annual": return "mo, billed annually";
    default: return "month";
  }
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const currentOption = BILLING_OPTIONS.find((o) => o.id === billing)!;
  const discount = currentOption.discount;

  return (
    <div className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="accent" className="mb-3">Pricing</Badge>
          <h1 className="text-4xl font-bold text-text-primary mb-4">Simple, Transparent Pricing</h1>
          <p className="text-text-secondary max-w-xl mx-auto">
            Start free and scale as your legal practice grows. No hidden fees.
          </p>

          {/* Billing Period Selector */}
          <div className="flex items-center justify-center gap-1 mt-8 bg-surface-secondary rounded-xl p-1 max-w-lg mx-auto">
            {BILLING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setBilling(opt.id)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors relative",
                  billing === opt.id
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {opt.label}
                {opt.badge && billing === opt.id && (
                  <Badge variant="accent" className="absolute -top-2.5 -right-1 text-[9px] px-1.5 py-0">{opt.badge}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {Object.entries(PLANS).map(([key, plan]) => {
            const features = FEATURES[key as keyof typeof FEATURES] || [];
            const isPopular = key === "pro";
            const isEnterprise = key === "enterprise";
            const price = plan.price > 0 ? Math.floor(plan.price * (1 - discount)) : plan.price;

            return (
              <Card key={key} className={`p-6 relative ${isPopular ? "border-2 border-primary-600 shadow-lg" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary-600 text-white px-3 py-1 text-xs">Most Popular</Badge>
                  </div>
                )}
                <h3 className="font-bold text-xl mb-1">{plan.label}</h3>
                <p className="text-sm text-text-secondary mb-3">
                  {key === "free" ? "Get started for free" : isEnterprise ? "For large firms & organizations" : `For ${key === "pro" ? "solo practitioners" : "law firms"}`}
                </p>
                <div className="mb-5 mt-3">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold">Free</span>
                  ) : isEnterprise ? (
                    <div>
                      <span className="text-2xl font-bold">Custom Pricing</span>
                      <p className="text-xs text-text-secondary mt-1">Tailored to your firm&apos;s needs</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">₱{price.toLocaleString()}</span>
                      <span className="text-sm text-text-secondary">/{getBillingLabel(billing)}</span>
                      {discount > 0 && (
                        <p className="text-xs text-text-tertiary line-through mt-0.5">₱{plan.price.toLocaleString()}/month</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2 mb-6">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-green-600 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href={key === "free" ? "/signup" : isEnterprise ? "/help" : "/signup?plan=" + key}
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isPopular ? "bg-primary-600 text-white hover:bg-primary-700" : "border border-border hover:bg-surface-secondary text-text-primary"
                  }`}
                >
                  {key === "free" ? "Get Started Free" : isEnterprise ? "Contact Sales" : `Get ${plan.label}`}
                </Link>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Shield className="w-6 h-6 text-primary-600" />, title: "Secure & Private", desc: "Your legal queries and documents are encrypted and never shared" },
            { icon: <Clock className="w-6 h-6 text-primary-600" />, title: "Cancel Anytime", desc: "No lock-in contracts. Upgrade, downgrade, or cancel at any time" },
            { icon: <HelpCircle className="w-6 h-6 text-primary-600" />, title: "Expert Support", desc: "Get help from our team of legal tech specialists" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-6 rounded-2xl bg-surface-secondary">
              {item.icon}
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-text-secondary mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
