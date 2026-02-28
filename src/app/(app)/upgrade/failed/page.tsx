"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Card, Badge } from "@/components/ui";

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <Badge variant="error" className="mb-3">
            Payment Failed
          </Badge>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Payment Unsuccessful
          </h1>

          {/* Description */}
          <p className="text-text-secondary mb-6">
            We were unable to process your payment. This could be due to insufficient funds, card restrictions, or a network issue.
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

          {/* Help Message */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-900 dark:text-amber-100 mb-2 font-medium">
              What to do next:
            </p>
            <ul className="text-sm text-amber-900 dark:text-amber-100 text-left space-y-1 list-disc list-inside">
              <li>Check your card details and try again</li>
              <li>Ensure your card has sufficient funds</li>
              <li>Try a different payment method (GCash or Bank Transfer)</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push("/upgrade")}
              className="w-full bg-primary-600 text-white rounded-xl py-3 px-4 text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-surface-secondary text-text-primary rounded-xl py-3 px-4 text-sm font-medium hover:bg-surface-tertiary transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>

          {/* Support Link */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-tertiary mb-2">
              Need help with your payment?
            </p>
            <button
              onClick={() => router.push("/help")}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Contact Support
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
