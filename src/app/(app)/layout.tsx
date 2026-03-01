import { AppNavbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { ProductTour } from "@/components/tour/product-tour";
import { MobileBackdrop } from "@/components/layout/mobile-backdrop";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <AppNavbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Client-only: dims content when mobile sidebar drawer is open */}
        <MobileBackdrop />
        <Sidebar />
        <main className="flex-1 overflow-auto bg-surface-secondary dark:bg-surface">
          {children}
        </main>
      </div>
      <ProductTour />
    </div>
  );
}
