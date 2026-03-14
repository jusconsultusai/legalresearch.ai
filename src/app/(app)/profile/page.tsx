"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  User, Mail, Building, Briefcase, Bell, Shield, CreditCard,
  Eye, EyeOff, Save, Star, Zap, AlertTriangle, X, Crown, Calendar,
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam && ["profile", "security", "notifications", "billing"].includes(tabParam) ? tabParam : "profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Sync tab with URL query param
  useEffect(() => {
    if (tabParam && ["profile", "security", "notifications", "billing"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Plan metadata
  const PLAN_INFO: Record<string, { name: string; description: string; searches: number }> = {
    free:       { name: "Free Plan",       description: "15 AI searches · Basic legal database",     searches: 15 },
    pro:        { name: "Professional",    description: "Unlimited AI searches · Full legal database", searches: -1 },
    team:       { name: "Team Plan",       description: "Unlimited searches · Team collaboration",    searches: -1 },
    enterprise: { name: "Enterprise",      description: "Unlimited searches · Custom integrations",   searches: -1 },
  };
  const planKey = user?.plan || "free";
  const planInfo = PLAN_INFO[planKey] || PLAN_INFO.free;
  const isPaid = planKey !== "free";
  const isFree = planKey === "free";
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    firm: "",
    role: "",
    bio: "",
    notifications: { email: true, product: true, security: true },
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Account Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your profile and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {TABS.map((tab) => (
            <button
              suppressHydrationWarning
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                activeTab === tab.id ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium" : "hover:bg-surface-secondary text-text-secondary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {activeTab === "profile" && (
            <>
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 flex items-center justify-center text-2xl font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{user?.name || "User"}</p>
                    <p className="text-sm text-text-secondary">{user?.email}</p>
                    <Badge
                      variant={isPaid ? "accent" : "secondary"}
                      className={cn("mt-1 text-xs flex items-center gap-1",
                        isPaid ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
                      )}
                    >
                      {isPaid ? <Crown className="w-3 h-3" /> : null}
                      {planInfo.name}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        suppressHydrationWarning
                        type="text"
                        className="input pl-10"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input suppressHydrationWarning type="email" className="input pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Law Firm / Organization</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input suppressHydrationWarning type="text" className="input pl-10" value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} placeholder="Firm name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <select suppressHydrationWarning className="input pl-10 appearance-none" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} title="Select role">
                        <option value="">Select Role</option>
                        <option value="lawyer">Lawyer</option>
                        <option value="student">Law Student</option>
                        <option value="paralegal">Paralegal</option>
                        <option value="judge">Judge</option>
                        <option value="prosecutor">Prosecutor</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Bio</label>
                  <textarea
                    suppressHydrationWarning
                    className="input resize-none"
                    rows={3}
                    placeholder="Tell us a bit about yourself..."
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  />
                </div>
              </Card>
              <div className="flex justify-end">
                <button
                  suppressHydrationWarning
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </>
          )}

          {activeTab === "security" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Change Password</h2>
              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Current Password</label>
                  <div className="relative">
                    <input suppressHydrationWarning type={showPassword ? "text" : "password"} className="input pr-10" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} placeholder="Current password" />
                    <button suppressHydrationWarning className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)} title="Toggle password visibility">
                      {showPassword ? <EyeOff className="w-4 h-4 text-text-tertiary" /> : <Eye className="w-4 h-4 text-text-tertiary" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">New Password</label>
                  <input suppressHydrationWarning type="password" className="input" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="New password" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                  <input suppressHydrationWarning type="password" className="input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm new password" />
                </div>
                <button suppressHydrationWarning onClick={handleSave} className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
                  Update Password
                </button>
              </div>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                  { key: "product", label: "Product Updates", desc: "News about new features and improvements" },
                  { key: "security", label: "Security Alerts", desc: "Important security notifications" },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium text-sm text-text-primary">{n.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{n.desc}</p>
                    </div>
                    <button
                      suppressHydrationWarning
                      onClick={() => setForm({ ...form, notifications: { ...form.notifications, [n.key]: !form.notifications[n.key as keyof typeof form.notifications] } })}
                      className={`w-11 h-6 rounded-full transition-colors ${form.notifications[n.key as keyof typeof form.notifications] ? "bg-primary-600" : "bg-surface-tertiary"}`}
                      title={`Toggle ${n.label.toLowerCase()}`}
                    >
                      <div className={`w-4 h-4 bg-white dark:bg-slate-300 rounded-full shadow transition-transform mx-1 ${form.notifications[n.key as keyof typeof form.notifications] ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "billing" && (
            <div className="space-y-4">
              {/* Cancel Subscription Confirmation Modal */}
              {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelModal(false)} />
                  <div className="relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl p-6 space-y-4">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="absolute top-4 right-4 p-1 hover:bg-surface-secondary rounded-lg transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4 text-text-tertiary" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Cancel Subscription</h3>
                        <p className="text-xs text-text-secondary mt-0.5">{planInfo.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Are you sure you want to cancel your <strong className="text-text-primary">{planInfo.name}</strong>?
                      You will keep access to premium features until the end of your current billing period,
                      then your account will revert to the Free Plan.
                    </p>
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setShowCancelModal(false)}
                        className="flex-1 py-2.5 border border-border rounded-xl text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                      >
                        Keep Plan
                      </button>
                      <button
                        onClick={() => { setShowCancelModal(false); /* TODO: call cancel API */ }}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Confirm Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <Card className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <h2 className="text-lg font-semibold">Billing &amp; Subscription</h2>
                  {isPaid && (
                    <Badge variant="accent" className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3" />
                      {planInfo.name}
                    </Badge>
                  )}
                </div>

                {/* Plan card */}
                <div className={cn(
                  "p-4 rounded-xl border mb-5",
                  isPaid
                    ? "bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10 border-primary-200 dark:border-primary-700/40"
                    : "bg-surface-secondary border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isPaid && <Zap className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                        <p className="font-semibold text-text-primary">{planInfo.name}</p>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{planInfo.description}</p>
                    </div>
                    <Badge variant={isPaid ? "accent" : "outline"}>Active</Badge>
                  </div>
                </div>

                {/* Subscription Dates (paid users) */}
                {isPaid && user?.subscriptionStartDate && (
                  <div className="flex items-center gap-4 mb-5 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Started: {new Date(user.subscriptionStartDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                    {user?.subscriptionEndDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Renews: {new Date(user.subscriptionEndDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Usage */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Search Quota</span>
                    <span className="font-semibold text-sm">
                      {planInfo.searches === -1
                        ? "Unlimited"
                        : `${user?.searchesLeft ?? 0} / ${planInfo.searches} remaining`
                      }
                    </span>
                  </div>
                  {planInfo.searches !== -1 && (
                    <ProgressBar
                      value={Math.min(100, ((planInfo.searches - (user?.searchesLeft ?? planInfo.searches)) / planInfo.searches) * 100)}
                      aria-label="Search usage"
                      barClassName="bg-primary-600"
                    />
                  )}
                  {isPaid && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Unlimited searches included with your plan
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <a
                    href="/upgrade"
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isFree
                        ? "bg-primary-600 text-white hover:bg-primary-700"
                        : "border border-border text-text-primary hover:bg-surface-secondary"
                    )}
                  >
                    {isFree ? "Upgrade to Professional" : "Manage Plan"}
                  </a>
                  {isPaid && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
