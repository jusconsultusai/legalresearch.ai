import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "JusConsultus AI - AI-Powered Legal Research for Philippine Law",
  description:
    "Comprehensive AI-powered legal research platform for the Philippine Justice System. Access jurisprudence, laws, and legal documents with intelligent AI analysis.",
  keywords: "Philippine law, legal research, AI, jurisprudence, Supreme Court, legal database",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
