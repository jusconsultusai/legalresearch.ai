// OnlyOfficeEditor.tsx
// Full React integration for ONLYOFFICE Document Server
// See: https://api.onlyoffice.com/editors/basic

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        elementId: string,
        config: Record<string, any>
      ) => DocEditorInstance;
    };
  }
}

interface DocEditorInstance {
  destroyEditor: () => void;
  refreshHistory: (data: any) => void;
}

export interface OnlyOfficeEditorProps {
  documentId: string;
  documentTitle?: string;
  documentFileType?: string;
  documentKey: string;
  documentUrl?: string; // Unused — config route now builds Docker-reachable URLs server-side
  callbackUrl?: string; // Unused — config route handles this
  mode?: "edit" | "view";
  userId?: string;
  userName?: string;
  onContentChange?: (html: string) => void;
  onSave?: () => void;
  onReady?: () => void;
  onError?: (error: string) => void;
}

/**
 * ONLYOFFICE Document Editor React component.
 * 
 * This component loads the ONLYOFFICE Document Server JS API script and
 * initializes the editor with the provided configuration.
 * 
 * Prerequisite: ONLYOFFICE Document Server must be running (via docker-compose)
 * and accessible at NEXT_PUBLIC_ONLYOFFICE_URL.
 */
export default function OnlyOfficeEditor({
  documentId,
  documentTitle = "Untitled Document",
  documentFileType = "docx",
  documentKey,
  documentUrl,
  callbackUrl,
  mode = "edit",
  userId,
  userName,
  onContentChange,
  onSave,
  onReady,
  onError,
}: OnlyOfficeEditorProps) {
  const editorRef = useRef<DocEditorInstance | null>(null);
  // React-managed wrapper — we append an imperative child div into this.
  // React never renders children inside it, so removeChild cannot conflict.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // retryCount is incremented to force the useEffect to re-run on manual retry
  const [retryCount, setRetryCount] = useState(0);
  // autoRetryMsg shows a friendly countdown when auto-retrying
  const [autoRetryMsg, setAutoRetryMsg] = useState<string | null>(null);
  const autoRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorId = `onlyoffice-editor-${documentId}`;

  // NEXT_PUBLIC_ vars are inlined at build time — safe on server and client.
  const onlyofficeUrl =
    process.env.NEXT_PUBLIC_ONLYOFFICE_URL || "http://localhost:8000";

  // Load the ONLYOFFICE Document Server API script
  const loadScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Already loaded and ready
      if (window.DocsAPI) {
        resolve();
        return;
      }

      // Always remove any stale script element first.
      // If we piggyback on a previously-failed element, its events already fired
      // and we will never receive load/error — causing a silent hang.
      const stale = window.document.getElementById("onlyoffice-api-script");
      if (stale) stale.remove();

      const script = window.document.createElement("script");
      script.id = "onlyoffice-api-script";
      script.src = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
      script.async = true;
      script.onload = () => {
        if (window.DocsAPI) {
          resolve();
        } else {
          script.remove();
          reject(new Error("ONLYOFFICE API script loaded but DocsAPI is undefined. The Document Server may still be starting up — please retry in a few seconds."));
        }
      };
      script.onerror = () => {
        script.remove();
        reject(
          new Error(
            `Failed to load ONLYOFFICE API from ${onlyofficeUrl}.\nMake sure ONLYOFFICE Document Server is running:\n\ndocker-compose up -d`
          )
        );
      };
      window.document.head.appendChild(script);
    });
  }, [onlyofficeUrl]);

  // ─── Imperatively create + destroy the ONLYOFFICE target div ───────────
  // ONLYOFFICE's DocEditor replaces the target element's contents with a
  // full iframe tree, mutating the real DOM outside React's knowledge.
  // If we let React own that div, React's reconciler will crash with
  // "removeChild: The node to be removed is not a child of this node"
  // when unmounting, because the children it tracked are gone.
  //
  // Fix: create the target div with raw DOM APIs inside a React-managed
  // wrapper that never has React-rendered children. React only sees an
  // empty <div ref={wrapperRef}> — all mutations happen beneath an
  // imperatively-appended child that we clean up ourselves.
  useEffect(() => {
    let destroyed = false;
    // Clear any pending auto-retry timer from a previous run
    if (autoRetryRef.current) { clearTimeout(autoRetryRef.current); autoRetryRef.current = null; }
    setAutoRetryMsg(null);

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Create the target div that ONLYOFFICE will own
    const editorDiv = document.createElement("div");
    editorDiv.id = editorId;
    editorDiv.style.width = "100%";
    editorDiv.style.height = "100%";
    wrapper.appendChild(editorDiv);

    const initEditor = async () => {
      try {
        await loadScript();
        if (destroyed || !window.DocsAPI) return;

        // Fetch the complete editor config from the server.
        // The config route builds Docker-reachable document/callback URLs and
        // signs the whole config with HMAC-SHA256 JWT — we must NOT rebuild
        // these URLs client-side (window.location.origin is unreachable from Docker).
        const configRes = await fetch("/api/onlyoffice/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            documentTitle,
            documentFileType,
            documentKey,
            mode,
            userId,
            userName,
          }),
        });

        if (!configRes.ok) {
          const err = await configRes.json().catch(() => ({}));
          throw new Error(err?.error || `Config request failed (${configRes.status})`);
        }

        const config = await configRes.json();
        if (destroyed) return;

        // Attach client-side event handlers — these cannot be serialised to JSON
        // so they must be added here after receiving the server config.
        config.events = {
          onAppReady: () => {
            if (!destroyed) { setLoading(false); onReady?.(); }
          },
          onDocumentStateChange: (_event: { data: boolean }) => {
            // content-change notifications; actual content comes via /callback
          },
          onSave: () => { onSave?.(); },
          onError: (event: { data: { errorCode: number; errorDescription: string } }) => {
            const msg = event?.data?.errorDescription || "Unknown editor error";
            if (!destroyed) { setError(msg); onError?.(msg); }
          },
        };

        const editor = new window.DocsAPI.DocEditor(editorId, config);
        editorRef.current = editor;
      } catch (err: any) {
        if (!destroyed) {
          const msg = err?.message || "Failed to initialize ONLYOFFICE editor";
          const isDocsAPIUndefined = msg.includes("DocsAPI is undefined");

          // Auto-retry up to 3 times (with 3 / 6 / 9 s delays) when DocsAPI
          // isn't ready yet — the Document Server is still warming up.
          if (isDocsAPIUndefined && retryCount < 3) {
            const delay = (retryCount + 1) * 3000;
            const seconds = delay / 1000;
            setAutoRetryMsg(`Document Server is starting up — retrying in ${seconds}s… (${retryCount + 1}/3)`);
            setLoading(true);
            autoRetryRef.current = setTimeout(() => {
              if (!destroyed) setRetryCount((c) => c + 1);
            }, delay);
          } else {
            setError(msg);
            setLoading(false);
            onError?.(msg);
          }
        }
      }
    };

    initEditor();

    // Cleanup: destroy the editor, then remove the imperatively-created div.
    return () => {
      destroyed = true;
      if (autoRetryRef.current) { clearTimeout(autoRetryRef.current); autoRetryRef.current = null; }
      if (editorRef.current) {
        try {
          editorRef.current.destroyEditor();
        } catch {
          // ignore
        }
        editorRef.current = null;
      }
      // Remove the imperatively-created editor div from the wrapper
      if (wrapper.contains(editorDiv)) {
        wrapper.removeChild(editorDiv);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    documentId,
    documentKey,
    documentTitle,
    documentFileType,
    mode,
    userId,
    userName,
    editorId,
    loadScript,
    retryCount,
  ]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface p-8">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Editor Could Not Load</h3>
        <p className="text-sm text-text-secondary text-center max-w-md whitespace-pre-line mb-6">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); setRetryCount((c) => c + 1); }}
          className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              {autoRetryMsg || "Loading ONLYOFFICE Editor..."}
            </p>
          </div>
        </div>
      )}
      {/*
        Empty wrapper div — React manages this node but never renders children
        inside it. The ONLYOFFICE target div is appended/removed imperatively
        in the useEffect above, keeping it outside React's reconciliation tree.
      */}
      <div ref={wrapperRef} className="w-full h-full" />
    </div>
  );
}
