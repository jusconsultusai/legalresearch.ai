import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
  async rewrites() {
    return {
      // beforeFiles rewrites run BEFORE API routes/pages, so this intercepts
      // the ONLYOFFICE proxy path before the App Router API handler.
      // Next.js handles the HTTP proxying natively (streaming, websockets, etc.)
      // which is far more reliable than manually buffering in an API route.
      beforeFiles: [
        // Proxy /onlyoffice/* → OnlyOffice Docker (port 8000), stripping the prefix.
        // This is what the Caddy rule was supposed to do, but cloudflared bypasses
        // Caddy and routes all traffic directly to Next.js. Handled here instead.
        {
          source: "/onlyoffice/:path*",
          destination: "http://localhost:8000/:path*",
        },
        // Also expose the named proxy path (used by NEXT_PUBLIC_ONLYOFFICE_URL in
        // newer builds) so both paths always work regardless of build state.
        {
          source: "/api/onlyoffice-proxy/:path*",
          destination: "http://localhost:8000/:path*",
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: "/etherpad/:path*",
          destination: "http://localhost:9001/:path*",
        },
      ],
    };
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
