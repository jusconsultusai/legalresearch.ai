"use client";

/**
 * Root Layout Integration Example
 * 
 * This shows how to integrate the SignupModal and ProductTour into your root layout.
 * Add this to your src/app/layout.tsx or create a client component wrapper.
 */

import { SignupModal } from "@/components/auth";
import { ProductTour } from "@/components/tour/product-tour";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      
      {/* Global modals - these should be rendered once at the root level */}
      <SignupModal />
      <ProductTour />
    </>
  );
}

/**
 * Example of how to use in your layout.tsx:
 * 
 * import { AuthProvider } from "@/components/auth/auth-provider";
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <AuthProvider>
 *           {children}
 *         </AuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */
