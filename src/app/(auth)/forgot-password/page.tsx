"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { CheckCircle, ArrowLeft } from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="w-14 h-14 text-green-500" />
        <h2 className="text-xl font-semibold text-text-primary">Check your email</h2>
        <p className="text-sm text-text-secondary max-w-xs">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a password
          reset link. It expires in 1 hour.
        </p>
        <Link
          href="/signin"
          className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Forgot password?</h1>
        <p className="text-sm text-text-secondary mt-1">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@lawfirm.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Remembered it?{" "}
        <Link href="/signin" className="text-primary-600 hover:text-primary-700 font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
