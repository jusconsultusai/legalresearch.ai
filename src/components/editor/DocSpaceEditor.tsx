/**
 * DocSpaceEditor.tsx
 * Embeds ONLYOFFICE DocSpace cloud editor using @onlyoffice/docspace-sdk-js.
 * https://api.onlyoffice.com/docspace/javascript-sdk/get-started/
 *
 * Flow:
 *  1. POST /api/docspace/sync  →  upload/update the document in DocSpace cloud
 *  2. Get back { fileId, requestToken }
 *  3. Init the DocSpace SDK with mode: "editor" + fileId + requestToken
 *
 * The requestToken allows the embedded editor to open the file without
 * requiring the end-user to log into DocSpace separately.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import SDK from "@onlyoffice/docspace-sdk-js";

const DOCSPACE_URL =
  process.env.NEXT_PUBLIC_DOCSPACE_URL || "https://docspace-h0gtq0.onlyoffice.com";

const FRAME_ID = "ds-docspace-frame";

export interface DocSpaceEditorProps {
  documentId: string;
  onSave?: () => void;
  onReady?: () => void;
  onError?: (err: string) => void;
}

export default function DocSpaceEditor({
  documentId,
  onSave,
  onReady,
  onError,
}: DocSpaceEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<SDK | null>(null);
  const [status, setStatus] = useState<"syncing" | "loading" | "ready" | "error">("syncing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // ── Step 1: Sync document to DocSpace ─────────────────────────────
        setStatus("syncing");
        const syncRes = await fetch("/api/docspace/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.error || `Sync failed (${syncRes.status})`);
        }

        const { fileId, requestToken } = await syncRes.json();
        if (cancelled) return;

        // ── Step 2: Create the container div outside React's tree ─────────
        setStatus("loading");
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        // Remove any previous SDK frame
        const existing = document.getElementById(FRAME_ID);
        if (existing) existing.remove();

        const frameDiv = document.createElement("div");
        frameDiv.id = FRAME_ID;
        frameDiv.style.width = "100%";
        frameDiv.style.height = "100%";
        wrapper.appendChild(frameDiv);

        // ── Step 3: Initialise DocSpace SDK ───────────────────────────────
        const config = {
          src: DOCSPACE_URL,
          mode: "editor" as const,
          width: "100%",
          height: "100%",
          frameId: FRAME_ID,
          fileId: fileId,
          requestToken: requestToken,
          init: true,
          events: {
            onAppReady: () => {
              if (!cancelled) {
                setStatus("ready");
                onReady?.();
              }
            },
            onAppError: (e: unknown) => {
              const msg =
                typeof e === "string"
                  ? e
                  : (e as any)?.data?.errorDescription || "DocSpace editor error";
              if (!cancelled) {
                setErrorMsg(msg);
                setStatus("error");
                onError?.(msg);
              }
            },
            onCloseCallback: () => {
              onSave?.();
            },
          },
        };

        const sdk = new SDK();
        sdkRef.current = sdk;
        sdk.init(config);
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || "Failed to load DocSpace editor";
          setErrorMsg(msg);
          setStatus("error");
          onError?.(msg);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      // Destroy SDK frame
      try {
        (sdkRef.current as any)?.destroyFrame?.();
      } catch { /* ignore */ }
      sdkRef.current = null;
      // Remove imperatively-created frame div
      const frame = document.getElementById(FRAME_ID);
      if (frame && wrapperRef.current?.contains(frame)) {
        wrapperRef.current.removeChild(frame);
      }
    };
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Error state ──────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Editor Could Not Load</h3>
        <p className="text-sm text-text-secondary text-center max-w-md mb-4">{errorMsg}</p>
        <button
          onClick={() => { setStatus("syncing"); setErrorMsg(null); }}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Loading / syncing overlay ─────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              {status === "syncing" ? "Syncing document to DocSpace…" : "Loading DocSpace Editor…"}
            </p>
          </div>
        </div>
      )}
      {/*
        Empty React wrapper — the SDK frame div is appended imperatively
        to avoid React reconciliation conflicts.
      */}
      <div ref={wrapperRef} className="w-full h-full" />
    </div>
  );
}
