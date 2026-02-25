"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks";
import { User, Mail, Building, Briefcase, Bell, Shield, CreditCard, Eye, EyeOff, Save } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                activeTab === tab.id ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-surface-secondary text-text-secondary"
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
                    <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{user?.name || "User"}</p>
                    <p className="text-sm text-text-secondary">{user?.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">Free Plan</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
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
                      <input type="email" className="input pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Law Firm / Organization</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input type="text" className="input pl-10" value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} placeholder="Firm name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <select className="input pl-10 appearance-none" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} title="Select role">
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
                    <input type={showPassword ? "text" : "password"} className="input pr-10" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} placeholder="Current password" />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)} title="Toggle password visibility">
                      {showPassword ? <EyeOff className="w-4 h-4 text-text-tertiary" /> : <Eye className="w-4 h-4 text-text-tertiary" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">New Password</label>
                  <input type="password" className="input" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="New password" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                  <input type="password" className="input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm new password" />
                </div>
                <button onClick={handleSave} className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
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
                      onClick={() => setForm({ ...form, notifications: { ...form.notifications, [n.key]: !form.notifications[n.key as keyof typeof form.notifications] } })}
                      className={`w-11 h-6 rounded-full transition-colors ${form.notifications[n.key as keyof typeof form.notifications] ? "bg-primary-600" : "bg-surface-tertiary"}`}
                      title={`Toggle ${n.label.toLowerCase()}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${form.notifications[n.key as keyof typeof form.notifications] ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "billing" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Billing & Usage</h2>
              <div className="p-4 rounded-xl bg-surface-secondary border border-border mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-sm text-text-secondary">15 searches/month</p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg">
                  <span className="text-sm text-text-secondary">Searches used this month</span>
                  <span className="font-semibold">{15 - (user?.searchesLeft ?? 15)} / 15</span>
                </div>
                <div className="w-full">
                  {/* eslint-disable-next-line react/forbid-dom-props */}
                  <ProgressBar
                    value={((15 - (user?.searchesLeft ?? 15)) / 15) * 100}
                    aria-label="Search usage"
                    barClassName="bg-primary-600"
                  />
                </div>
              </div>
              <a href="/upgrade" className="mt-6 flex w-full items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
                Upgrade Plan
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
