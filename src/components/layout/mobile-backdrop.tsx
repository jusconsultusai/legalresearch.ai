"use client";

import { useSidebarStore } from "@/stores";

/**
 * Thin client component that renders a semi-transparent backdrop
 * behind the mobile sidebar drawer when it is open.
 * Kept separate so (app)/layout.tsx can remain a Server Component.
 */
export function MobileBackdrop() {
  const { isOpen, setOpen } = useSidebarStore();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 top-14 z-40 bg-black/40 lg:hidden"
      onClick={() => setOpen(false)}
    />
  );
}
