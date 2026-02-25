"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, Avatar } from "@/components/ui";
import { useAuth } from "@/hooks";
import { useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

const marketingLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function MarketingNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="JusConsultus AI" width={32} height={32} className="rounded" />
            <span className="font-bold text-lg text-primary-900">JusConsultus AI</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-primary-700 bg-primary-50"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/signin">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-4 px-4">
              <Link href="/signin"><Button variant="secondary" className="w-full">Sign in</Button></Link>
              <Link href="/signup"><Button className="w-full">Get Started Free</Button></Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

export function AppNavbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-4 shrink-0 z-40">
      <Link href="/chat" className="flex items-center gap-2">
        <Image src="/logo.png" alt="JusConsultus AI" width={28} height={28} className="rounded" />
        <span className="font-bold text-primary-900 hidden sm:block">JusConsultus AI</span>
      </Link>

      <div className="flex-1" />

      <Link href="/upgrade" className="hidden sm:block">
        <Button variant="outline" size="sm">Upgrade</Button>
      </Link>

      <Link href="/help" className="p-2 rounded-lg hover:bg-surface-tertiary transition-colors" title="Help">
        <HelpCircle className="w-5 h-5 text-text-secondary" />
      </Link>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded-lg hover:bg-surface-tertiary transition-colors"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5 text-text-secondary" />
        )}
      </button>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors"
          title="Account menu"
        >
          <Avatar name={user?.name} size="sm" />
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl border border-border shadow-lg z-50 py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-text-secondary">{user?.email}</p>
              </div>
              <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary" onClick={() => setDropdownOpen(false)}>
                <User className="w-4 h-4" /> Profile
              </Link>
              <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary" onClick={() => setDropdownOpen(false)}>
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <Link href="/upgrade" className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary" onClick={() => setDropdownOpen(false)}>
                <CreditCard className="w-4 h-4" /> Subscription
              </Link>
              <div className="border-t border-border my-1" />
              <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
