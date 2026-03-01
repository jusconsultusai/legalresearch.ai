"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSidebarStore, useChatManagement } from "@/stores";
import {
  MessageSquare,
  Database,
  FileText,
  FolderOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface SidebarChat {
  id: string;
  title: string;
  updatedAt: string;
}

const sidebarLinks = [
  { href: "/chat", label: "AI Chat", icon: MessageSquare, id: "tour-chat" },
  { href: "/database", label: "Legal Database", icon: Database, id: "tour-database" },
  { href: "/documents", label: "Document Builder", icon: FileText, id: "tour-documents" },
  { href: "/my-files", label: "My Files", icon: FolderOpen, id: "tour-myfiles" },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, id: "tour-bookmarks" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, toggle, setOpen } = useSidebarStore();
  const { setActiveChatId, triggerRefresh, refreshKey } = useChatManagement();
  const activeChatId = useChatManagement((s) => s.activeChatId);

  const [recentChats, setRecentChats] = useState<SidebarChat[]>([]);
  // Close sidebar by default on mobile screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatSummaries, setChatSummaries] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setChatsLoading(true);
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setRecentChats(data.chats || []);
      }
    } catch { /* ignore */ } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchChats();
  }, [isOpen, refreshKey, fetchChats]);

  const loadChat = (chatId: string) => {
    setActiveChatId(chatId);
    if (!pathname?.startsWith("/chat")) router.push("/chat");
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/${chatId}`, { method: "DELETE" });
    setRecentChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const clearAllChats = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/chat", { method: "DELETE" });
    setRecentChats([]);
    setActiveChatId(null);
  };

  const generateSummary = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chatSummaries[chatId] || summaryLoading === chatId) return;
    setSummaryLoading(chatId);
    try {
      const res = await fetch(`/api/chat/${chatId}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data.chat?.messages || []) as { role: string; content: string }[];
      const text = msgs.map((m) => `${m.role}: ${m.content}`).join("\n");
      const sumRes = await fetch("/api/chat/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setChatSummaries((prev) => ({ ...prev, [chatId]: sumData.summary }));
      }
    } catch { /* ignore */ } finally {
      setSummaryLoading(null);
    }
  };

  return (
    <aside
      className={cn(
        // Mobile: fixed overlay below the 56px navbar; Desktop: part of flex flow
        "fixed top-14 bottom-0 left-0 z-50",
        "lg:relative lg:top-auto lg:bottom-auto lg:left-auto lg:z-auto",
        "border-r border-border bg-surface flex flex-col transition-all duration-300 shrink-0",
        isOpen
          ? "translate-x-0 w-72 lg:w-60"
          : "-translate-x-full lg:translate-x-0 lg:w-16"
      )}
    >
      {/* New Chat + Toggle Row */}
      <div className={cn("px-3 py-3 flex items-center gap-2", !isOpen && "flex-col-reverse")}>
        <Link
          href="/chat"
          onClick={() => setActiveChatId(null)}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary-900 text-white transition-all hover:bg-primary-800",
            isOpen ? "flex-1 px-3 py-2 text-sm font-medium" : "p-2 justify-center"
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {isOpen && "New Chat"}
        </Link>
        {/* Collapse/expand toggle — desktop only */}
        <button
          suppressHydrationWarning
          onClick={toggle}
          className="hidden lg:flex p-1.5 rounded-full hover:bg-surface-tertiary transition-colors text-text-secondary shrink-0 items-center justify-center"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {/* Close button — mobile only */}
        <button
          suppressHydrationWarning
          onClick={() => setOpen(false)}
          className="flex lg:hidden p-1.5 rounded-full hover:bg-surface-tertiary transition-colors text-text-secondary shrink-0 items-center justify-center"
          title="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation links — preserve original labels & order */}
      <nav className="px-3 space-y-1 mt-2">
        {sidebarLinks.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              id={link.id}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all",
                isOpen ? "px-3 py-2.5 text-sm" : "p-2.5 justify-center",
                isActive
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
              )}
              title={!isOpen ? link.label : undefined}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              {isOpen && link.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Recent Chats (below Bookmarks, sidebar expanded only) ── */}
      {isOpen && (
        <div className="mt-4 px-3 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <button
              onClick={() => setChatsExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider hover:text-text-primary transition-colors"
            >
              {chatsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Recent Chats
            </button>
            {recentChats.length > 0 && (
              <button
                onClick={clearAllChats}
                className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500 transition-colors"
                title="Clear all chats"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {chatsExpanded && (
            <div className="overflow-y-auto flex-1 space-y-0.5 pb-2">
              {chatsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                </div>
              ) : recentChats.length === 0 ? (
                <p className="text-[11px] text-text-tertiary px-2 py-3 text-center">No chats yet</p>
              ) : (
                recentChats.map((chat) => (
                  <div key={chat.id} className="group relative">
                    <button
                      onClick={() => loadChat(chat.id)}
                      className={cn(
                        "w-full text-left px-2 py-2 rounded-lg transition-colors",
                        activeChatId === chat.id
                          ? "bg-primary-100 text-primary-800"
                          : "hover:bg-surface-tertiary text-text-secondary"
                      )}
                    >
                      <p className="text-xs font-medium line-clamp-1 pr-12">{chat.title}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-tertiary">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      {chatSummaries[chat.id] && (
                        <p className="text-[10px] text-primary-600 mt-1 line-clamp-2 italic leading-snug">
                          {chatSummaries[chat.id]}
                        </p>
                      )}
                    </button>
                    {/* Hover actions */}
                    <div className="absolute top-1.5 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => generateSummary(chat.id, e)}
                        className={cn("p-1 rounded hover:bg-primary-100 transition-colors", summaryLoading === chat.id && "animate-pulse")}
                        title="AI summary"
                      >
                        <Sparkles className="w-3 h-3 text-primary-500" />
                      </button>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Section */}
      {isOpen && (
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Sparkles className="w-3 h-3" />
            <span>Powered by JusConsultus AI</span>
          </div>
        </div>
      )}
    </aside>
  );
}
