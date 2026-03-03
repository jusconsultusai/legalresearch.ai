// BuilderStatusIndicator.tsx
// Shows the status of Document Builder backends (Docker, html-to-docx, Python)

"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, RefreshCw, Server, Loader2 } from "lucide-react";

interface BackendStatus {
  available: boolean;
  message: string;
  url?: string;
}

interface BuilderStatus {
  docker: BackendStatus;
  htmlToDocx: BackendStatus;
  python: BackendStatus;
  recommended: "docker" | "htmlToDocx" | "python";
}

interface BuilderStatusIndicatorProps {
  /** Show expanded details by default */
  expanded?: boolean;
  /** Compact mode - single line indicator */
  compact?: boolean;
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Callback when status changes */
  onStatusChange?: (status: BuilderStatus) => void;
  /** Custom class name */
  className?: string;
}

export default function BuilderStatusIndicator({
  expanded = false,
  compact = false,
  refreshInterval = 0,
  onStatusChange,
  className = "",
}: BuilderStatusIndicatorProps) {
  const [status, setStatus] = useState<BuilderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onlyoffice/builder/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        onStatusChange?.(data);
      }
    } catch (err) {
      console.error("Failed to fetch builder status:", err);
    } finally {
      setLoading(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    fetchStatus();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getRecommendedLabel = () => {
    if (!status) return "Checking...";
    switch (status.recommended) {
      case "docker": return "Docker Document Server";
      case "htmlToDocx": return "html-to-docx";
      case "python": return "Python SDK";
      default: return "Unknown";
    }
  };

  const getStatusIcon = (available: boolean) =>
    available ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />
        ) : status?.recommended === "docker" ? (
          <CheckCircle className="w-3 h-3 text-green-500" />
        ) : (
          <CheckCircle className="w-3 h-3 text-amber-500" />
        )}
        <span className="text-text-secondary">
          {loading ? "Checking..." : getRecommendedLabel()}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-surface p-3 ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">
            Document Builder
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              status?.docker.available 
                ? "bg-green-500/10 text-green-600" 
                : "bg-amber-500/10 text-amber-600"
            }`}>
              {status?.docker.available ? "Full" : "Fallback"}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); fetchStatus(); }}
            disabled={loading}
            className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-text-secondary ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Active backend indicator */}
      {!loading && status && (
        <div className="mt-2 text-xs text-text-secondary">
          Using: <span className="font-medium text-text-primary">{getRecommendedLabel()}</span>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && status && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {/* Docker status */}
          <div className="flex items-start gap-2">
            {getStatusIcon(status.docker.available)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Docker</span>
                {status.recommended === "docker" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary truncate">{status.docker.message}</p>
            </div>
          </div>

          {/* html-to-docx status */}
          <div className="flex items-start gap-2">
            {getStatusIcon(status.htmlToDocx.available)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">html-to-docx</span>
                {status.recommended === "htmlToDocx" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary truncate">{status.htmlToDocx.message}</p>
            </div>
          </div>

          {/* Python status */}
          <div className="flex items-start gap-2">
            {getStatusIcon(status.python.available)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Python SDK</span>
                {status.recommended === "python" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary truncate">{status.python.message}</p>
            </div>
          </div>

          {/* Last check timestamp */}
          {lastCheck && (
            <p className="text-[10px] text-text-tertiary pt-1">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get builder status
 */
export function useBuilderStatus(refreshInterval = 0) {
  const [status, setStatus] = useState<BuilderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onlyoffice/builder/status");
      if (res.ok) {
        setStatus(await res.json());
      } else {
        setError("Failed to fetch status");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return { status, loading, error, refresh };
}
