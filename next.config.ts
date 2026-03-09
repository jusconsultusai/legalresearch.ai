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
        // OnlyOffice makes requests to /cache/* for internal document caching/editing.
        // These MUST be proxied to the Document Server, otherwise editor fails.
        {
          source: "/cache/:path*",
          destination: "http://localhost:8000/cache/:path*",
        },
        // OnlyOffice also accesses /coauthoring/* for real-time collaboration.
        {
          source: "/coauthoring/:path*",
          destination: "http://localhost:8000/coauthoring/:path*",
        },
        // Additional OnlyOffice paths for web-apps resources
        {
          source: "/web-apps/:path*",
          destination: "http://localhost:8000/web-apps/:path*",
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
