/**
 * ONLYOFFICE proxy API route
 * Proxies all requests from /api/onlyoffice-proxy/* to http://localhost:8000/*
 * This works around Caddy routing issues by handling proxying at the Next.js level
 */

import { NextRequest, NextResponse } from "next/server";

const ONLYOFFICE_URL = process.env.ONLYOFFICE_SERVER_URL || "http://localhost:8000";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "https://jusconsultus.ai", "https://www.jusconsultus.ai"];

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (origin) {
    for (const allowed of ALLOWED_ORIGINS) {
      if (origin.startsWith(allowed)) return allowed;
    }
  }
  // For same-origin requests (no origin header), allow
  return ALLOWED_ORIGINS[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  try {
    const path = pathSegments.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${ONLYOFFICE_URL}/${path}${searchParams ? `?${searchParams}` : ""}`;

    console.log(`[ONLYOFFICE Proxy] ${request.method} ${targetUrl}`);

    const headers = new Headers();
    
    // Forward relevant headers
    // NOTE: Do NOT forward accept-encoding — Node's fetch() auto-decompresses
    // responses, so forwarding "gzip" would cause the upstream to send compressed
    // data that fetch decompresses, but the proxy would still copy the
    // content-encoding header, making the browser try to decompress plain text
    // → SyntaxError "Invalid or unexpected token" on JS files.
    const headersToForward = [
      "content-type",
      "authorization",
      "cookie",
      "user-agent",
      "accept",
      "accept-language",
    ];

    headersToForward.forEach((header) => {
      const value = request.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    // Set host header to the ONLYOFFICE server
    headers.set("host", new URL(ONLYOFFICE_URL).host);

    const options: RequestInit = {
      method: request.method,
      headers,
      // Prevent Node from following redirects — we need to proxy them as-is
      redirect: "manual" as RequestRedirect,
      // Abort if ONLYOFFICE doesn't respond within 30 seconds
      signal: AbortSignal.timeout(30_000),
    };

    // Add body for POST/PUT requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      options.body = await request.arrayBuffer();
    }

    const response = await fetch(targetUrl, options);

    // ── Buffer the response body instead of streaming ──
    // Passing response.body (ReadableStream) directly to NextResponse can hang
    // in Next.js 15+/Turbopack because the stream is not properly consumed.
    // Buffering avoids this and also lets us set an accurate content-length.
    const responseBuffer = await response.arrayBuffer();

    // Forward the response
    const responseHeaders = new Headers();
    
    // Copy relevant response headers
    // NOTE: Do NOT forward content-encoding — Node's fetch() transparently
    // decompresses the body, so that header no longer matches reality.
    const responseHeadersToForward = [
      "content-type",
      "cache-control",
      "expires",
      "last-modified",
      "etag",
      "location",
    ];

    responseHeadersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Set accurate content-length from the buffered body
    responseHeaders.set("content-length", String(responseBuffer.byteLength));

    // Allow CORS for ONLYOFFICE editor (restricted to allowed origins)
    const allowedOrigin = getAllowedOrigin(request);
    responseHeaders.set("access-control-allow-origin", allowedOrigin);
    responseHeaders.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("access-control-allow-headers", "*");

    return new NextResponse(responseBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[ONLYOFFICE Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to ONLYOFFICE server" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request);
  return new NextResponse(null, {
    status: 200,
    headers: {
      "access-control-allow-origin": allowedOrigin,
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}
