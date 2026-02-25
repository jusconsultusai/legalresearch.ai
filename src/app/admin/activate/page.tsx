"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function AdminActivatePage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Activation form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"proMonthly" | "proQuarterly" | "proSemiannual" | "proAnnual" | "teamMonthly" | "teamQuarterly" | "teamSemiannual" | "teamAnnual">("proMonthly");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [activating, setActivating] = useState(false);

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payments/pending-payments?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payments/pending-payments?adminKey=${encodeURIComponent(adminKey)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid admin key");
      }
      setAuthenticated(true);
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedUserId || !reference.trim()) {
      setError("Please select a user and enter a payment reference");
      return;
    }
    setActivating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/payments/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          userId: selectedUserId,
          planId: selectedPlan,
          reference: reference.trim(),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed");

      setSuccess(`✅ ${data.message}`);
      setSelectedUserId("");
      setReference("");
      setShowConfirm(false);
      // Refresh user list
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchUsers();
    }
  }, [authenticated, fetchUsers]);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const planAmount = 
    selectedPlan === 'proMonthly' ? PRICING.proMonthly.amount :
    selectedPlan === 'proQuarterly' ? PRICING.proQuarterly.totalAmount :
    selectedPlan === 'proSemiannual' ? PRICING.proSemiannual.totalAmount :
    selectedPlan === 'proAnnual' ? PRICING.proAnnual.totalAmount :
    selectedPlan === 'teamMonthly' ? PRICING.teamMonthly.amount :
    selectedPlan === 'teamQuarterly' ? PRICING.teamQuarterly.totalAmount :
    selectedPlan === 'teamSemiannual' ? PRICING.teamSemiannual.totalAmount :
    PRICING.teamAnnual.totalAmount;
  const planLabel = 
    selectedPlan === 'proMonthly' ? 'Pro Monthly' :
    selectedPlan === 'proQuarterly' ? 'Pro Quarterly' :
    selectedPlan === 'proSemiannual' ? 'Pro Semiannual' :
    selectedPlan === 'proAnnual' ? 'Pro Annual' :
    selectedPlan === 'teamMonthly' ? 'Team Monthly' :
    selectedPlan === 'teamQuarterly' ? 'Team Quarterly' :
    selectedPlan === 'teamSemiannual' ? 'Team Semiannual' :
    'Team Annual';

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 mt-1">JusConsultus AI - Subscription Management</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Key</label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter admin activation key"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verifying..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Activation</h1>
            <p className="text-gray-500 text-sm mt-1">Manually activate user subscriptions after payment verification</p>
          </div>
          <button
            onClick={() => { setAuthenticated(false); setAdminKey(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats.totalUsers, color: "bg-blue-50 text-blue-700" },
              { label: "Free Users", value: stats.freeUsers, color: "bg-gray-50 text-gray-700" },
              { label: "Pro Users", value: stats.proUsers, color: "bg-green-50 text-green-700" },
              { label: "Expired", value: stats.expiredUsers, color: "bg-red-50 text-red-700" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                <p className="text-sm font-medium opacity-70">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Activation Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activate Subscription</h2>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 mb-4 text-sm">{success}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                title="Select user"
                aria-label="Select user to activate"
              >
                <option value="">-- Choose a user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "No name"}) — {u.plan}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as "proMonthly" | "proQuarterly" | "proSemiannual" | "proAnnual" | "teamMonthly" | "teamQuarterly" | "teamSemiannual" | "teamAnnual")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                title="Select plan"
                aria-label="Select subscription plan"
              >
                <option value="proMonthly">
                  Pro Monthly — {PRICING.proMonthly.display}/month
                </option>
                <option value="proQuarterly">
                  Pro Quarterly — {PRICING.proQuarterly.display}/month ({PRICING.proQuarterly.displayTotal}/quarter, save {PRICING.proQuarterly.savings}%)
                </option>
                <option value="proSemiannual">
                  Pro Semiannual — {PRICING.proSemiannual.display}/month ({PRICING.proSemiannual.displayTotal}/6 months, save {PRICING.proSemiannual.savings}%)
                </option>
                <option value="proAnnual">
                  Pro Annual — {PRICING.proAnnual.display}/month ({PRICING.proAnnual.displayTotal}/year, save {PRICING.proAnnual.savings}%)
                </option>
                <option value="teamMonthly">
                  Team Monthly — {PRICING.teamMonthly.display}/month
                </option>
                <option value="teamQuarterly">
                  Team Quarterly — {PRICING.teamQuarterly.display}/month ({PRICING.teamQuarterly.displayTotal}/quarter, save {PRICING.teamQuarterly.savings}%)
                </option>
                <option value="teamSemiannual">
                  Team Semiannual — {PRICING.teamSemiannual.display}/month ({PRICING.teamSemiannual.displayTotal}/6 months, save {PRICING.teamSemiannual.savings}%)
                </option>
                <option value="teamAnnual">
                  Team Annual — {PRICING.teamAnnual.display}/month ({PRICING.teamAnnual.displayTotal}/year, save {PRICING.teamAnnual.savings}%)
                </option>
              </select>
            </div>

            {/* Payment Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. JC-XXXXX or GCash ref #"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                title="Select payment method"
                aria-label="Select payment method"
              >
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="manual">Manual / Other</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => {
                if (!selectedUserId || !reference.trim()) {
                  setError("Please select a user and enter a payment reference");
                  return;
                }
                setError("");
                setShowConfirm(true);
              }}
              className="bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Activate Subscription
            </button>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh Users"}
            </button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Activation</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-medium">User:</span> {selectedUser.email}</p>
                <p><span className="font-medium">Name:</span> {selectedUser.name || `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() || "N/A"}</p>
                <p><span className="font-medium">Plan:</span> {planLabel}</p>
                <p><span className="font-medium">Amount:</span> ₱{planAmount.toLocaleString()}</p>
                <p><span className="font-medium">Reference:</span> {reference}</p>
                <p><span className="font-medium">Method:</span> {paymentMethod}</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {activating ? "Activating..." : "Confirm & Activate"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Searches Left</th>
                  <th className="text-left px-4 py-3 font-medium">Expires</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.plan === "pro" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.searchesLeft === -1 ? "Unlimited" : u.searchesLeft}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.subscriptionEndDate
                        ? new Date(u.subscriptionEndDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedUserId(u.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? "Loading..." : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
