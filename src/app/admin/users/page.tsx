"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, RefreshCw, LogOut, XCircle, Loader2, Eye, EyeOff,
  Users, User, Crown, TrendingUp, Search, Mail, Calendar,
  Clock, CheckCircle2, AlertCircle, ChevronUp, ChevronDown,
  BadgeCheck, Zap, Building2, ArrowUpDown,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string;
  role: string;
  billingCycle: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  paymentSetup: boolean;
  searchesLeft: number;
  createdAt: string;
  payments?: {
    reference: string;
    planId: string;
    amount: number;
    status: string;
    activatedAt: string | null;
    paymentMethod: string | null;
    createdAt: string;
  }[];
}

interface Stats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  teamUsers: number;
  enterpriseUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

type SortKey = "name" | "plan" | "start" | "expiry" | "daysUsed" | "daysLeft" | "created";
type SortDir = "asc" | "desc";

function displayName(u: UserItem) {
  return u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";
}

function daysUsed(u: UserItem): number | null {
  if (!u.subscriptionStartDate) return null;
  const start = new Date(u.subscriptionStartDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

function daysLeft(u: UserItem): number | null {
  if (!u.subscriptionEndDate) return null;
  const expiry = new Date(u.subscriptionEndDate);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / 86_400_000);
}

function subStatus(u: UserItem): "active" | "expired" | "free" | "lifetime" {
  if (u.plan === "free") return "free";
  if (u.plan === "enterprise") return "lifetime";
  if (!u.subscriptionEndDate) return "lifetime";
  return new Date(u.subscriptionEndDate) >= new Date() ? "active" : "expired";
}

const PLAN_COLOR: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-green-100 text-green-700",
  team: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  active:   { label: "Active",    cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="w-3 h-3" /> },
  expired:  { label: "Expired",   cls: "bg-red-100 text-red-700",      icon: <AlertCircle className="w-3 h-3" /> },
  free:     { label: "Free",      cls: "bg-slate-100 text-slate-500",  icon: <User className="w-3 h-3" /> },
  lifetime: { label: "Lifetime",  cls: "bg-amber-100 text-amber-700",  icon: <Zap className="w-3 h-3" /> },
};

export default function AdminUsersPage() {
  const [adminKey, setAdminKey]           = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [showKey, setShowKey]             = useState(false);
  const [users, setUsers]                 = useState<UserItem[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [loading, setLoading]             = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [planFilter, setPlanFilter]       = useState<string>("all");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [sortKey, setSortKey]             = useState<SortKey>("created");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const fetchUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/admin/users?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setUsers(data.users  || []);
      setStats(data.stats  || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/admin/users?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid admin key");
      setAuthenticated(true);
      setUsers(data.users  || []);
      setStats(data.stats  || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) fetchUsers();
  }, [authenticated, fetchUsers]);

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        u.email.toLowerCase().includes(q) ||
        displayName(u).toLowerCase().includes(q) ||
        u.plan.toLowerCase().includes(q);
      const matchesPlan   = planFilter   === "all" || u.plan   === planFilter;
      const matchesStatus = statusFilter === "all" || subStatus(u) === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":     cmp = displayName(a).localeCompare(displayName(b)); break;
        case "plan":     cmp = a.plan.localeCompare(b.plan); break;
        case "start":    cmp = (a.subscriptionStartDate ?? "").localeCompare(b.subscriptionStartDate ?? ""); break;
        case "expiry":   cmp = (a.subscriptionEndDate ?? "").localeCompare(b.subscriptionEndDate ?? ""); break;
        case "daysUsed": cmp = (daysUsed(a) ?? -1) - (daysUsed(b) ?? -1); break;
        case "daysLeft": cmp = (daysLeft(a) ?? -9999) - (daysLeft(b) ?? -9999); break;
        case "created":  cmp = a.createdAt.localeCompare(b.createdAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-30 ml-1 inline" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1 inline text-blue-600" />
      : <ChevronDown className="w-3 h-3 ml-1 inline text-blue-600" />;
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">JusConsultus AI</h1>
            <p className="text-blue-300 text-sm mt-1 text-center w-full">User Management Panel</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2 text-center w-full">
                  Admin Activation Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-11 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                    placeholder="Enter your admin key"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    tabIndex={-1}
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !adminKey.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <><Users className="w-4 h-4" /> View Users</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Top Nav */}
      <header className="bg-surface border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 relative">
          <div className="grid grid-cols-3 items-center">
            {/* Left: brand + action buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-text-secondary">JusConsultus AI — Admin Panel</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/admin/activate"
                  className="flex items-center gap-1.5 text-sm text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-surface-secondary transition-colors"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Activate
                </a>
                <button
                  onClick={() => fetchUsers(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-sm text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-surface-secondary disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  onClick={() => { setAuthenticated(false); setAdminKey(""); setUsers([]); setStats(null); }}
                  className="flex items-center gap-1.5 text-sm text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>

            {/* Center: title */}
            <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-bold text-text-primary pointer-events-none whitespace-nowrap">
              User Management
            </h1>

            {/* Right: intentionally empty */}
            <div />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Total",        value: stats.totalUsers,           icon: <Users className="w-4 h-4" />,       color: "from-blue-500 to-blue-600",    bg: "bg-blue-50",    text: "text-blue-700"  },
              { label: "Free",         value: stats.freeUsers,            icon: <User className="w-4 h-4" />,        color: "from-slate-400 to-slate-500",  bg: "bg-slate-100",  text: "text-slate-700" },
              { label: "Pro",          value: stats.proUsers,             icon: <Crown className="w-4 h-4" />,       color: "from-green-500 to-emerald-600",bg: "bg-green-50",   text: "text-green-700" },
              { label: "Team",         value: stats.teamUsers,            icon: <Building2 className="w-4 h-4" />,   color: "from-purple-500 to-purple-600",bg: "bg-purple-50",  text: "text-purple-700"},
              { label: "Enterprise",   value: stats.enterpriseUsers,      icon: <Zap className="w-4 h-4" />,         color: "from-amber-500 to-amber-600",  bg: "bg-amber-50",   text: "text-amber-700" },
              { label: "Active Subs",  value: stats.activeSubscriptions,  icon: <CheckCircle2 className="w-4 h-4" />,color: "from-teal-500 to-teal-600",   bg: "bg-teal-50",    text: "text-teal-700"  },
              { label: "Expired",      value: stats.expiredSubscriptions, icon: <AlertCircle className="w-4 h-4" />, color: "from-red-400 to-red-500",      bg: "bg-red-50",     text: "text-red-700"   },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex flex-col items-center gap-1.5`}>
                <div className={`bg-gradient-to-br ${s.color} p-2 rounded-lg text-white shadow-sm`}>
                  {s.icon}
                </div>
                <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
                <p className={`text-xs font-medium ${s.text} opacity-70`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-surface"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-sm border border-border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-surface"
              aria-label="Filter by plan"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-surface"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="free">Free</option>
              <option value="lifetime">Lifetime / Enterprise</option>
            </select>
            <p className="text-sm text-text-secondary self-center whitespace-nowrap">
              {filtered.length} of {users.length} users
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        User <SortIcon k="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("plan")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        Plan <SortIcon k="plan" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("start")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        Sub Start <SortIcon k="start" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("expiry")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        Expiry Date <SortIcon k="expiry" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("daysUsed")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        Days Used <SortIcon k="daysUsed" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("daysLeft")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        Days Left <SortIcon k="daysLeft" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      <button onClick={() => toggleSort("created")} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                        Joined <SortIcon k="created" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Searches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-text-tertiary text-sm">
                        No users match the current filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((u) => {
                    const status   = subStatus(u);
                    const used     = daysUsed(u);
                    const left     = daysLeft(u);
                    const badge    = STATUS_BADGE[status];
                    const isExpanded = expandedId === u.id;
                    const lastPayment = u.payments?.[0];

                    return (
                      <React.Fragment key={u.id}>
                        <tr className={`hover:bg-blue-50/20 transition-colors ${isExpanded ? "bg-blue-50/10" : ""}`}>
                          {/* User */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                u.plan === "pro"        ? "bg-green-100 text-green-700"  :
                                u.plan === "team"       ? "bg-purple-100 text-purple-700":
                                u.plan === "enterprise" ? "bg-amber-100 text-amber-700"  :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {(u.name?.[0] || u.firstName?.[0] || u.email[0]).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary text-sm truncate max-w-[160px]">{displayName(u)}</p>
                                <p className="text-xs text-text-secondary flex items-center gap-1 truncate max-w-[180px]">
                                  <Mail className="w-3 h-3 shrink-0" />{u.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_COLOR[u.plan] ?? "bg-slate-100 text-slate-600"}`}>
                              {(u.plan === "pro" || u.plan === "team" || u.plan === "enterprise") && <Crown className="w-3 h-3" />}
                              {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                            </span>
                            {u.billingCycle && (
                              <p className="text-xs text-text-tertiary mt-0.5 capitalize">{u.billingCycle}</p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          </td>

                          {/* Sub Start */}
                          <td className="px-4 py-4 text-xs text-text-secondary">
                            {u.subscriptionStartDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {new Date(u.subscriptionStartDate).toLocaleDateString("en-PH")}
                              </span>
                            ) : "—"}
                          </td>

                          {/* Expiry */}
                          <td className="px-4 py-4 text-xs">
                            {u.subscriptionEndDate ? (
                              <span className={`flex items-center gap-1 ${
                                status === "expired" ? "text-red-600 font-medium" : "text-text-secondary"
                              }`}>
                                <Clock className="w-3 h-3 shrink-0" />
                                {new Date(u.subscriptionEndDate).toLocaleDateString("en-PH")}
                              </span>
                            ) : "—"}
                          </td>

                          {/* Days Used */}
                          <td className="px-4 py-4 text-xs text-text-secondary">
                            {used !== null ? (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 shrink-0" />
                                {used} day{used !== 1 ? "s" : ""}
                              </span>
                            ) : "—"}
                          </td>

                          {/* Days Left */}
                          <td className="px-4 py-4 text-xs">
                            {left !== null ? (
                              left > 0 ? (
                                <span className={`font-semibold ${
                                  left <= 7 ? "text-red-600" : left <= 30 ? "text-amber-600" : "text-green-600"
                                }`}>
                                  {left}d
                                </span>
                              ) : (
                                <span className="text-red-600 font-semibold">Expired</span>
                              )
                            ) : status === "lifetime" ? (
                              <span className="text-amber-600 font-semibold">∞</span>
                            ) : "—"}
                          </td>

                          {/* Joined */}
                          <td className="px-4 py-4 text-xs text-text-secondary">
                            {new Date(u.createdAt).toLocaleDateString("en-PH")}
                          </td>

                          {/* Searches */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${
                                u.searchesLeft === -1 ? "text-green-600" :
                                u.searchesLeft === 0  ? "text-red-500" :
                                u.searchesLeft <= 3   ? "text-amber-600" :
                                "text-text-secondary"
                              }`}>
                                {u.searchesLeft === -1 ? "∞" : u.searchesLeft}
                              </span>
                              {lastPayment && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                                  title="View last payment"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded last payment row */}
                        {isExpanded && lastPayment && (
                          <tr className="bg-blue-50/20">
                            <td colSpan={9} className="px-8 pb-4 pt-2">
                              <div className="bg-surface border border-blue-100 rounded-xl p-4 text-xs text-text-secondary">
                                <p className="font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                                  <BadgeCheck className="w-4 h-4 text-blue-600" />
                                  Last Payment Record
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div><span className="text-text-tertiary block">Reference</span><p className="font-mono font-medium mt-0.5">{lastPayment.reference}</p></div>
                                  <div><span className="text-text-tertiary block">Plan</span><p className="font-medium mt-0.5 capitalize">{lastPayment.planId}</p></div>
                                  <div><span className="text-text-tertiary block">Amount</span><p className="font-medium mt-0.5">₱{lastPayment.amount.toLocaleString()}</p></div>
                                  <div><span className="text-text-tertiary block">Method</span><p className="font-medium mt-0.5 capitalize">{lastPayment.paymentMethod?.replace("_", " ") ?? "—"}</p></div>
                                  <div>
                                    <span className="text-text-tertiary block">Status</span>
                                    <p className={`font-medium mt-0.5 ${lastPayment.status === "verified" ? "text-green-600" : "text-amber-600"}`}>
                                      {lastPayment.status}
                                    </p>
                                  </div>
                                  {lastPayment.activatedAt && (
                                    <div><span className="text-text-tertiary block">Activated</span><p className="font-medium mt-0.5">{new Date(lastPayment.activatedAt).toLocaleString("en-PH")}</p></div>
                                  )}
                                  <div><span className="text-text-tertiary block">Payment Date</span><p className="font-medium mt-0.5">{new Date(lastPayment.createdAt).toLocaleDateString("en-PH")}</p></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
