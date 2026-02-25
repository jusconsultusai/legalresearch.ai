"use client";

import { useAuthStore, useSignupModalStore } from "@/stores";
import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  feature?: string; // Optional feature name for analytics/messaging
  fallback?: ReactNode; // Optional fallback UI when not authenticated
}

/**
 * AuthGuard component that checks if user is authenticated before rendering children.
 * If not authenticated, it shows the signup modal.
 * 
 * Usage:
 * <AuthGuard feature="AI Chat">
 *   <ChatInterface />
 * </AuthGuard>
 */
export function AuthGuard({ children, feature, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuthStore();
  const { open } = useSignupModalStore();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // User is not authenticated
  // If fallback is provided, render it; otherwise show a prompt to sign up
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Sign in to continue
        </h3>
        <p className="text-text-secondary mb-6">
          {feature ? (
            <>
              You need to <strong>create an account</strong> or <strong>sign in</strong> to access{" "}
              <strong>{feature}</strong>.
            </>
          ) : (
            <>Create an account or sign in to access this feature.</>
          )}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => open(feature)}
            className="px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            Create free account
          </button>
          <a
            href="/signin"
            className="px-6 py-3 border-2 border-gray-300 text-text-primary font-medium rounded-xl hover:border-primary-600 hover:bg-primary-50 transition-colors"
          >
            Sign in
          </a>
        </div>
        <p className="text-xs text-text-tertiary mt-4">
          Free for 14 days. No credit card required.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook version of AuthGuard for programmatic checks.
 * Returns true if user is authenticated, false otherwise.
 * Optionally shows signup modal if checkAndPrompt is true.
 * 
 * Usage:
 * const requireAuth = useRequireAuth();
 * 
 * const handleAction = () => {
 *   if (!requireAuth("Document Builder")) return;
 *   // Proceed with action
 * };
 */
export function useRequireAuth() {
  const { user } = useAuthStore();
  const { open } = useSignupModalStore();

  return (feature?: string): boolean => {
    if (user) {
      return true;
    }
    open(feature);
    return false;
  };
}
