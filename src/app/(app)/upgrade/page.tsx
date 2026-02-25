"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import { Check, Shield, Clock, HelpCircle, X, Smartphone, Building2, Copy, CheckCircle2 } from "lucide-react";
import { PRICING } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const PRO_FEATURES = [
  "Unlimited searches",
  "All AI response modes",
  "Full Legal Database",
  "AI Document Builder",
  "OCR & Document Analysis",
  "Priority support",
  "Bookmarks & history",
];

const FREE_FEATURES = [
  "14 days free trial",
  "15 searches/14 days",
  "Basic AI Chat",
  "Legal Database access",
  "Standard response modes",
];

const TEAM_FEATURES = [
  "All Pro features",
  "5 team members",
  "Shared workspace",
  "Collaboration tools",
  "Team analytics",
  "Dedicated support",
];

const ENTERPRISE_FEATURES = [
  "All Team features",
  "Unlimited members",
  "Custom integrations",
  "On-premise option",
  "SLA guarantee",
  "Dedicated account manager",
];

type PaymentMethod = "gcash" | "bank_transfer";
type SelectedPlan = "proMonthly" | "proAnnual" | "teamMonthly" | "teamAnnual";

interface CheckoutData {
  success: boolean;
  paymentMethod: string;
  reference: string;
  amount: number;
  amountDisplay: string;
  planId: string;
  gcash?: { number: string; name: string };
  bank?: { accountName: string; accountNumber: string; bank: string };
  instructions: string[];
}

export default function UpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>("proAnnual");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!paymentMethod) {
      setError("Please select a payment method");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      setCheckoutData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <button
      onClick={() => copyToClipboard(text, label)}
      className="ml-2 text-primary-600 hover:text-primary-700 inline-flex items-center"
      title={`Copy ${label}`}
    >
      {copied === label ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-10">
      {/* Header */}
      <div className="text-center">
        <Badge variant="accent" className="mb-3">Upgrade</Badge>
        <h1 className="text-3xl font-bold text-text-primary mb-3">Choose Your Plan</h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Get unlimited access to Philippine legal research tools, AI-powered document drafting, and more.
        </p>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Free Plan */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-text-primary">Free</h3>
            <p className="text-sm text-text-secondary mt-0.5">Get started for free</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-text-primary">Free</span>
            <p className="text-xs text-text-tertiary mt-1">14 days free trial</p>
          </div>
          <div className="space-y-2.5 mb-6">
            {FREE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-gray-500" />
                </div>
                <span className="text-xs text-text-secondary">{f}</span>
              </div>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-text-secondary" disabled>
            Current Plan
          </button>
        </Card>

        {/* Professional */}
        <Card className="p-6 relative border-2 border-primary-600 shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary-600 text-white px-3 py-1 text-xs">Most Popular</Badge>
          </div>
          <div className="mb-4">
            <h3 className="font-bold text-lg text-text-primary">Professional</h3>
            <p className="text-sm text-text-secondary mt-0.5">For solo practitioners</p>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-text-primary">{PRICING.proAnnual.display}</span>
              <span className="text-sm text-text-secondary">/mo</span>
            </div>
            <p className="text-xs text-text-tertiary">billed annually</p>
            <p className="text-xs font-medium text-primary-600 mt-1">OR {PRICING.proMonthly.display}/month</p>
          </div>
          <div className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-primary-700" />
                </div>
                <span className="text-xs text-text-secondary">{f}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSelectedPlan("proAnnual"); setShowPaymentModal(true); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors mb-2"
          >
            Upgrade to Professional
          </button>
          <button
            onClick={() => { setSelectedPlan("proMonthly"); setShowPaymentModal(true); }}
            className="w-full py-2 rounded-xl text-xs font-medium border border-primary-300 text-primary-700 hover:bg-primary-50 transition-colors"
          >
            Choose Monthly
          </button>
        </Card>

        {/* Team */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-text-primary">Team</h3>
            <p className="text-sm text-text-secondary mt-0.5">For law firms</p>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-text-primary">{PRICING.teamAnnual.display}</span>
              <span className="text-sm text-text-secondary">/mo</span>
            </div>
            <p className="text-xs text-text-tertiary">billed annually</p>
            <p className="text-xs font-medium text-primary-600 mt-1">OR {PRICING.teamMonthly.display}/month</p>
          </div>
          <div className="space-y-2.5 mb-6">
            {TEAM_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-primary-700" />
                </div>
                <span className="text-xs text-text-secondary">{f}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSelectedPlan("teamAnnual"); setShowPaymentModal(true); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-surface-tertiary text-text-primary hover:bg-surface-secondary transition-colors mb-2"
          >
            Upgrade to Team
          </button>
          <button
            onClick={() => { setSelectedPlan("teamMonthly"); setShowPaymentModal(true); }}
            className="w-full py-2 rounded-xl text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Choose Monthly
          </button>
        </Card>

        {/* Large Firms / Enterprise */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-text-primary">Large Firms</h3>
            <p className="text-sm text-text-secondary mt-0.5">For large firms & organizations</p>
          </div>
          <div className="mb-6">
            <span className="text-2xl font-bold text-text-primary">Custom Pricing</span>
            <p className="text-xs text-text-secondary mt-1">Tailored to your firm&apos;s needs</p>
          </div>
          <div className="space-y-2.5 mb-6">
            {ENTERPRISE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-primary-700" />
                </div>
                <span className="text-xs text-text-secondary">{f}</span>
              </div>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-xl text-sm font-medium bg-surface-tertiary text-text-primary hover:bg-surface-secondary transition-colors">
            Contact Sales
          </button>
        </Card>
      </div>

      {/* Trust Signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {[
          { icon: <Shield className="w-6 h-6 text-primary-600" />, title: "Secure Payment", desc: "Manual verification ensures your payment is safe" },
          { icon: <Clock className="w-6 h-6 text-primary-600" />, title: "Quick Activation", desc: "Subscriptions activated within 24 hours" },
          { icon: <HelpCircle className="w-6 h-6 text-primary-600" />, title: "Priority Support", desc: "Get help fast with our dedicated support team" },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-surface-secondary">
            {item.icon}
            <div>
              <p className="font-semibold text-sm text-text-primary">{item.title}</p>
              <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {checkoutData ? "Payment Instructions" : "Choose Payment Method"}
              </h2>
              <button
                onClick={() => { setShowPaymentModal(false); setCheckoutData(null); setPaymentMethod(null); setError(""); }}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
                aria-label="Close payment modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!checkoutData ? (
                <>
                  {/* Plan Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedPlan === "proMonthly" && "Professional Monthly"}
                      {selectedPlan === "proAnnual" && "Professional Annual"}
                      {selectedPlan === "teamMonthly" && "Team Monthly"}
                      {selectedPlan === "teamAnnual" && "Team Annual"}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedPlan === "proMonthly" && PRICING.proMonthly.display}
                      {selectedPlan === "proAnnual" && PRICING.proAnnual.displayTotal}
                      {selectedPlan === "teamMonthly" && PRICING.teamMonthly.display}
                      {selectedPlan === "teamAnnual" && PRICING.teamAnnual.displayTotal}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        {(selectedPlan === "proMonthly" || selectedPlan === "teamMonthly") ? "/month" : "/year"}
                      </span>
                    </p>
                    {selectedPlan === "proAnnual" && (
                      <p className="text-xs text-green-600 mt-1">
                        That&apos;s {PRICING.proAnnual.display}/month — save {PRICING.proAnnualSavings.display}/year!
                      </p>
                    )}
                    {selectedPlan === "teamAnnual" && (
                      <p className="text-xs text-green-600 mt-1">
                        That&apos;s {PRICING.teamAnnual.display}/month — save {PRICING.teamAnnualSavings.display}/year!
                      </p>
                    )}
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => setPaymentMethod("gcash")}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        paymentMethod === "gcash"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">GCash</p>
                        <p className="text-xs text-gray-500">Send via GCash mobile wallet</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        paymentMethod === "bank_transfer"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Bank Transfer</p>
                        <p className="text-xs text-gray-500">Transfer via Security Bank</p>
                      </div>
                    </button>
                  </div>

                  {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

                  <button
                    onClick={handleUpgrade}
                    disabled={!paymentMethod || loading}
                    className="w-full bg-primary-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Processing..." : "Continue"}
                  </button>
                </>
              ) : (
                /* Payment Instructions */
                <div className="space-y-5">
                  {/* Reference */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-600 font-medium mb-1">Your Payment Reference</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg font-bold font-mono text-blue-900">{checkoutData.reference}</p>
                      <CopyButton text={checkoutData.reference} label="reference" />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Include this in your payment message/remarks</p>
                  </div>

                  {/* Payment Details */}
                  {checkoutData.gcash && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 text-sm">GCash Details</h3>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Number</span>
                          <span className="font-mono font-medium">{checkoutData.gcash.number} <CopyButton text={checkoutData.gcash.number} label="gcash-number" /></span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Name</span>
                          <span className="font-medium">{checkoutData.gcash.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Amount</span>
                          <span className="font-bold text-primary-700">₱{checkoutData.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutData.bank && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 text-sm">Bank Transfer Details</h3>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Bank</span>
                          <span className="font-medium">{checkoutData.bank.bank}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Account #</span>
                          <span className="font-mono font-medium">{checkoutData.bank.accountNumber} <CopyButton text={checkoutData.bank.accountNumber} label="acct-number" /></span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Account Name</span>
                          <span className="font-medium">{checkoutData.bank.accountName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Amount</span>
                          <span className="font-bold text-primary-700">₱{checkoutData.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Steps</h3>
                    <ol className="space-y-2">
                      {checkoutData.instructions.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="shrink-0 w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                    <strong>Important:</strong> After sending your payment, your subscription will be activated within 24 hours. You&apos;ll receive unlimited access once confirmed.
                  </div>

                  <button
                    onClick={() => { setShowPaymentModal(false); setCheckoutData(null); setPaymentMethod(null); }}
                    className="w-full border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
