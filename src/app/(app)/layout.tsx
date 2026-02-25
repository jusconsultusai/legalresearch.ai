"use client";

import { AppNavbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { ProductTour } from "@/components/tour/product-tour";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <AppNavbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-surface-secondary dark:bg-surface">
          {children}
        </main>
      </div>
      <ProductTour />
    </div>
  );
}
