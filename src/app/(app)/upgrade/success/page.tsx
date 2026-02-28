"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Card, Badge } from "@/components/ui";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const reference = searchParams.get("reference");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Simulate loading delay for webhook processing
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary-600 mx-auto animate-spin mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">
            Processing Payment...
          </h1>
          <p className="text-text-secondary text-sm">
            Please wait while we confirm your payment and activate your subscription.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          {/* Title */}
          <Badge variant="success" className="mb-3">
            Payment Successful
          </Badge>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Thank You!
          </h1>

          {/* Description */}
          <p className="text-text-secondary mb-6">
            Your payment has been processed successfully. Your subscription will be activated shortly.
          </p>

          {/* Reference */}
          {reference && (
            <div className="bg-surface-secondary rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-text-tertiary font-medium mb-1">
                Payment Reference
              </p>
              <p className="text-sm font-mono text-text-primary font-semibold">
                {reference}
              </p>
            </div>
          )}

          {/* Session ID (optional, for debugging) */}
          {sessionId && (
            <div className="bg-surface-secondary rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-text-tertiary font-medium mb-1">
                Session ID
              </p>
              <p className="text-xs font-mono text-text-secondary break-all">
                {sessionId}
              </p>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Your subscription is being activated. You should see your upgraded plan reflected in your account within a few moments.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-primary-600 text-white rounded-xl py-3 px-4 text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-full bg-surface-secondary text-text-primary rounded-xl py-3 px-4 text-sm font-medium hover:bg-surface-tertiary transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
