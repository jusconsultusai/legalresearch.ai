"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <AlertTriangle className="w-14 h-14 text-red-500" />
        <h2 className="text-xl font-semibold text-text-primary">Invalid link</h2>
        <p className="text-sm text-text-secondary">
          This reset link is missing or invalid.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSuccess(true);
      setTimeout(() => router.replace("/signin"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="w-14 h-14 text-green-500" />
        <h2 className="text-xl font-semibold text-text-primary">Password updated!</h2>
        <p className="text-sm text-text-secondary">
          Your password has been changed. Redirecting you to sign in&hellip;
        </p>
        <Link href="/signin" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Set a new password</h1>
        <p className="text-sm text-text-secondary mt-1">
          Choose a strong password for your account.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className="input pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowNew(!showNew)}
              title="Toggle password visibility"
            >
              {showNew ? <EyeOff className="w-4 h-4 text-text-tertiary" /> : <Eye className="w-4 h-4 text-text-tertiary" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="input pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowConfirm(!showConfirm)}
              title="Toggle confirm password visibility"
            >
              {showConfirm ? <EyeOff className="w-4 h-4 text-text-tertiary" /> : <Eye className="w-4 h-4 text-text-tertiary" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
