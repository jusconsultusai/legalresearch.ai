"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, RefreshCw, LogOut, CheckCircle2, XCircle, Loader2,
  User, Mail, Calendar, Clock, AlertCircle, Search, CreditCard,
  TrendingUp, Users, Crown, ChevronDown, ChevronUp, BadgeCheck,
  Eye, EyeOff,
} from "lucide-react";
import { PRICING } from "@/lib/pricing";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string;
  billingCycle: string | null;
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
  }[];
}

interface Stats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  expiredUsers: number;
}

type PlanKey =
  | "proMonthly" | "proQuarterly" | "proSemiannual" | "proAnnual"
  | "teamMonthly" | "teamQuarterly" | "teamSemiannual" | "teamAnnual";

const PLAN_OPTIONS: { value: PlanKey; label: string; display: string; total: string; period: string }[] = [
  { value: "proMonthly",    label: "Pro Monthly",    display: PRICING.proMonthly.display,    total: PRICING.proMonthly.display,              period: "/month" },
  { value: "proQuarterly",  label: "Pro Quarterly",  display: PRICING.proQuarterly.display,  total: PRICING.proQuarterly.displayTotal,       period: "/quarter" },
  { value: "proSemiannual", label: "Pro Semiannual", display: PRICING.proSemiannual.display, total: PRICING.proSemiannual.displayTotal,      period: "/6 months" },
  { value: "proAnnual",     label: "Pro Annual",     display: PRICING.proAnnual.display,     total: PRICING.proAnnual.displayTotal,          period: "/year" },
  { value: "teamMonthly",   label: "Team Monthly",   display: PRICING.teamMonthly.display,   total: PRICING.teamMonthly.display,             period: "/month" },
  { value: "teamQuarterly", label: "Team Quarterly", display: PRICING.teamQuarterly.display, total: PRICING.teamQuarterly.displayTotal,      period: "/quarter" },
  { value: "teamSemiannual",label: "Team Semiannual",display: PRICING.teamSemiannual.display,total: PRICING.teamSemiannual.displayTotal,     period: "/6 months" },
  { value: "teamAnnual",    label: "Team Annual",    display: PRICING.teamAnnual.display,    total: PRICING.teamAnnual.displayTotal,         period: "/year" },
];

const PLAN_AMOUNTS: Record<PlanKey, number> = {
  proMonthly:    PRICING.proMonthly.amount,
  proQuarterly:  PRICING.proQuarterly.totalAmount,
  proSemiannual: PRICING.proSemiannual.totalAmount,
  proAnnual:     PRICING.proAnnual.totalAmount,
  teamMonthly:   PRICING.teamMonthly.amount,
  teamQuarterly: PRICING.teamQuarterly.totalAmount,
  teamSemiannual:PRICING.teamSemiannual.totalAmount,
  teamAnnual:    PRICING.teamAnnual.totalAmount,
};

function getUserDisplayName(u: UserItem) {
  return u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—";
}

export default function AdminActivatePage() {
  const [adminKey, setAdminKey]             = useState("");
  const [authenticated, setAuthenticated]   = useState(false);
  const [users, setUsers]                   = useState<UserItem[]>([]);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [loading, setLoading]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [searchQuery, setSearchQuery]       = useState("");
  const [expandedUser, setExpandedUser]     = useState<string | null>(null);

  // Form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlan, setSelectedPlan]     = useState<PlanKey>("proMonthly");
  const [reference, setReference]           = useState("");
  const [paymentMethod, setPaymentMethod]   = useState("gcash");
  const [activating, setActivating]         = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [showKey, setShowKey]               = useState(false);

  const fetchUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/payments/pending-payments?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setUsers(data.users  || []);
      setStats(data.stats  || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
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
      const res  = await fetch(`/api/payments/pending-payments?adminKey=${encodeURIComponent(adminKey)}`);
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

  const handleActivate = async () => {
    setActivating(true);
    setError("");
    setSuccess("");
    try {
      const res  = await fetch("/api/payments/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          userId:        selectedUserId,
          planId:        selectedPlan,
          reference:     reference.trim(),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed");

      setSuccess(`Subscription activated successfully for ${data.user?.email}.`);
      setSelectedUserId("");
      setReference("");
      setShowConfirm(false);
      await fetchUsers(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Activation failed");
      setShowConfirm(false);
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    if (authenticated) fetchUsers();
  }, [authenticated, fetchUsers]);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedPlanInfo = PLAN_OPTIONS.find((p) => p.value === selectedPlan)!;

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      getUserDisplayName(u).toLowerCase().includes(q) ||
      u.plan.toLowerCase().includes(q)
    );
  });

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo / brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-xl mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">JusConsultus AI</h1>
            <p className="text-blue-300 text-sm mt-1">Payment Activation Center</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
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
                className="w-full bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <><Shield className="w-4 h-4" /> Access Panel</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Payment Activation Center</h1>
              <p className="text-xs text-gray-500">JusConsultus AI — Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={() => { setAuthenticated(false); setAdminKey(""); setUsers([]); setStats(null); }}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Users className="w-5 h-5" />,     label: "Total Users",  value: stats.totalUsers,   color: "from-blue-500 to-blue-600",    bg: "bg-blue-50",  text: "text-blue-700"  },
              { icon: <User className="w-5 h-5" />,      label: "Free Users",   value: stats.freeUsers,    color: "from-gray-400 to-gray-500",    bg: "bg-gray-50",  text: "text-gray-700"  },
              { icon: <Crown className="w-5 h-5" />,     label: "Pro Users",    value: stats.proUsers,     color: "from-green-500 to-emerald-600", bg: "bg-green-50", text: "text-green-700" },
              { icon: <TrendingUp className="w-5 h-5" />,label: "Expired",      value: stats.expiredUsers, color: "from-red-400 to-red-500",       bg: "bg-red-50",   text: "text-red-700"   },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-5 flex items-center gap-4`}>
                <div className={`bg-linear-to-br ${s.color} p-2.5 rounded-xl text-white shadow-sm`}>
                  {s.icon}
                </div>
                <div>
                  <p className={`text-xs font-medium ${s.text} opacity-70`}>{s.label}</p>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Success</p>
              <p className="text-sm text-green-600 mt-0.5">{success}</p>
            </div>
            <button onClick={() => setSuccess("")} className="ml-auto text-green-400 hover:text-green-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Activation Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Activate Subscription</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Select User *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none"
                  aria-label="Select user"
                >
                  <option value="">Choose a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
              {selectedUser && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {getUserDisplayName(selectedUser)} · {selectedUser.plan}
                </p>
              )}
            </div>

            {/* Plan */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Subscription Plan *</label>
              <div className="relative">
                <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as PlanKey)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none"
                  aria-label="Select plan"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} — {p.total}{p.period}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ₱{PLAN_AMOUNTS[selectedPlan].toLocaleString()} total charged
              </p>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Reference *</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono tracking-wide"
                  placeholder="GCash / bank ref #"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                aria-label="Payment method"
              >
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank Transfer (BDO/BPI/etc.)</option>
                <option value="maya">Maya / PayMaya</option>
                <option value="cash">Cash</option>
                <option value="manual">Manual / Other</option>
              </select>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => {
                if (!selectedUserId || !reference.trim()) {
                  setError("Please select a user and enter a payment reference.");
                  return;
                }
                setError("");
                setShowConfirm(true);
              }}
              className="bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              disabled={activating}
            >
              <CheckCircle2 className="w-4 h-4" />
              Activate Subscription
            </button>
            <button
              onClick={() => { setSelectedUserId(""); setReference(""); setError(""); setSuccess(""); }}
              className="border border-gray-300 text-gray-700 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-semibold text-gray-900">
                Users Pending Activation ({filteredUsers.length})
              </h2>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              <p className="text-gray-500 text-sm mt-3">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {searchQuery ? "No users match your search." : "No users pending activation."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Expires</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => {
                    const isExpired = u.subscriptionEndDate && new Date(u.subscriptionEndDate) < new Date();
                    const isExpanded = expandedUser === u.id;
                    const lastPayment = u.payments?.[0];

                    return (
                      <>
                        <tr key={u.id} className={`hover:bg-blue-50/30 transition-colors ${selectedUserId === u.id ? "bg-blue-50" : ""}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                u.plan === "pro" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {(u.name?.[0] || u.firstName?.[0] || u.email[0]).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{getUserDisplayName(u)}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />{u.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              u.plan === "pro"  ? "bg-green-100 text-green-700" :
                              u.plan === "team" ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {u.plan === "pro" || u.plan === "team" ? <Crown className="w-3 h-3" /> : null}
                              {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <AlertCircle className="w-3 h-3" /> Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                <Clock className="w-3 h-3" /> No sub
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-500">
                            {u.subscriptionEndDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(u.subscriptionEndDate).toLocaleDateString("en-PH")}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString("en-PH")}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setError("");
                                  setSuccess("");
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                  selectedUserId === u.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                              >
                                {selectedUserId === u.id ? "Selected" : "Select"}
                              </button>
                              {u.payments && u.payments.length > 0 && (
                                <button
                                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  title="View payment history"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded payment history row */}
                        {isExpanded && lastPayment && (
                          <tr key={`${u.id}-history`}>
                            <td colSpan={6} className="px-6 pb-4 bg-amber-50/30">
                              <div className="ml-11 bg-white border border-amber-200 rounded-xl p-4 text-xs text-gray-700">
                                <p className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                                  <CreditCard className="w-4 h-4 text-amber-600" />
                                  Last Payment Record
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <span className="text-gray-500">Reference</span>
                                    <p className="font-mono font-medium mt-0.5">{lastPayment.reference}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Plan</span>
                                    <p className="font-medium mt-0.5">{lastPayment.planId}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Amount</span>
                                    <p className="font-medium mt-0.5">₱{lastPayment.amount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Status</span>
                                    <p className={`font-medium mt-0.5 ${lastPayment.status === "verified" ? "text-green-600" : "text-yellow-600"}`}>
                                      {lastPayment.status}
                                    </p>
                                  </div>
                                  {lastPayment.activatedAt && (
                                    <div>
                                      <span className="text-gray-500">Activated</span>
                                      <p className="font-medium mt-0.5">{new Date(lastPayment.activatedAt).toLocaleString("en-PH")}</p>
                                    </div>
                                  )}
                                  {lastPayment.paymentMethod && (
                                    <div>
                                      <span className="text-gray-500">Method</span>
                                      <p className="font-medium mt-0.5 capitalize">{lastPayment.paymentMethod.replace("_", " ")}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
            {/* Modal header */}
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <BadgeCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Activation</h3>
                  <p className="text-blue-200 text-xs mt-0.5">Review details before activating</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-3">
              {[
                { icon: <Mail className="w-4 h-4" />,       label: "User",      value: selectedUser.email },
                { icon: <User className="w-4 h-4" />,       label: "Name",      value: getUserDisplayName(selectedUser) },
                { icon: <Crown className="w-4 h-4" />,      label: "Plan",      value: selectedPlanInfo.label },
                { icon: <CreditCard className="w-4 h-4" />, label: "Amount",    value: `₱${PLAN_AMOUNTS[selectedPlan].toLocaleString()}${selectedPlanInfo.period}` },
                { icon: <CheckCircle2 className="w-4 h-4" />,label: "Reference",value: reference },
                { icon: null,                                label: "Method",    value: paymentMethod.replace("_", " ") },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    {icon && <span className="text-blue-500">{icon}</span>}
                    {label}
                  </span>
                  <span className={`text-sm font-semibold text-gray-900 ${label === "Reference" ? "font-mono" : ""} capitalize`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleActivate}
                disabled={activating}
                className="flex-1 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {activating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Activating...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirm & Activate</>
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={activating}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
