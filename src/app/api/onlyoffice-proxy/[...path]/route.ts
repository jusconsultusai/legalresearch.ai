/**
 * ONLYOFFICE proxy API route
 * Proxies all requests from /api/onlyoffice-proxy/* to http://localhost:8000/*
 * This works around Caddy routing issues by handling proxying at the Next.js level
 */

import { NextRequest, NextResponse } from "next/server";

const ONLYOFFICE_URL = process.env.ONLYOFFICE_SERVER_URL || "http://localhost:8000";

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
    const headersToForward = [
      "content-type",
      "authorization",
      "cookie",
      "user-agent",
      "accept",
      "accept-encoding",
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
    };

    // Add body for POST/PUT requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      options.body = await request.arrayBuffer();
    }

    const response = await fetch(targetUrl, options);

    // Forward the response
    const responseHeaders = new Headers();
    
    // Copy relevant response headers
    const responseHeadersToForward = [
      "content-type",
      "content-length",
      "content-encoding",
      "cache-control",
      "expires",
      "last-modified",
      "etag",
    ];

    responseHeadersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Allow CORS for ONLYOFFICE editor
    responseHeaders.set("access-control-allow-origin", "*");
    responseHeaders.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("access-control-allow-headers", "*");

    return new NextResponse(response.body, {
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
  return new NextResponse(null, {
    status: 200,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}
