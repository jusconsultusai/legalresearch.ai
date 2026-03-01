"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useAuthStore } from "@/stores";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, user, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "google_auth_failed"
      ? "Google sign-in failed. Please try again."
      : ""
  );
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        return;
      }

      setUser(data.user);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <img src="/logo.png" alt="JusConsultus AI" className="w-8 h-8 rounded" />
          <span className="font-bold text-lg text-primary-900">JusConsultus AI</span>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="text-sm text-text-secondary mt-1">Sign in to your account to continue</p>
      </div>

      {/* Google Sign-In */}
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-3 w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors mb-4"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </a>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-text-tertiary">
          <span className="bg-surface px-2">or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          placeholder="you@lawfirm.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded border-border text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-text-secondary">Remember me</span>
          </label>
          <a href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Forgot password?
          </a>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign up for free
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
