"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary-900 text-white hover:bg-primary-800 focus:ring-primary-500",
      secondary: "border border-border bg-surface text-text-primary hover:bg-surface-secondary",
      ghost: "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      outline: "border-2 border-primary-600 text-primary-700 hover:bg-primary-50",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        suppressHydrationWarning
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            suppressHydrationWarning
            className={cn(
              "input",
              isPassword && "pr-10",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              suppressHydrationWarning
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary hover:text-text-secondary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="text-xs text-text-tertiary">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "input min-h-25 resize-y",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// Card
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = true, padding = "md", children, ...props }, ref) => {
    const paddings = { sm: "p-4", md: "p-6", lg: "p-8" };
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border bg-surface shadow-sm transition-all",
          hover && "hover:shadow-md",
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

// Badge
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "accent" | "warning" | "danger" | "neutral" | "outline" | "success" | "error";
}

export function Badge({ className, variant = "primary", children, ...props }: BadgeProps) {
  const variants = {
    primary: "bg-primary-100 text-primary-700",
    accent: "bg-accent-100 text-accent-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
    outline: "border border-gray-300 text-gray-600 bg-transparent dark:border-slate-600 dark:text-slate-400",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Tabs
interface TabsProps {
  tabs: { id: string; label: string; count?: number; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
            activeTab === tab.id
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              activeTab === tab.id ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-surface rounded-2xl shadow-2xl w-full mx-4 animate-fade-in", sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-tertiary transition-colors" title="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Skeleton
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-tertiary", className)} />;
}

// Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-text-tertiary">{icon}</div>}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>}
      {action}
    </div>
  );
}

// Radio Card
interface RadioCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  description?: string;
  className?: string;
}

export function RadioCard({ selected, onClick, icon, label, description, className }: RadioCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all w-full",
        selected
          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
          : "border-border hover:border-border-strong hover:bg-surface-secondary",
        className
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
        selected ? "border-primary-500 bg-primary-500" : "border-border-strong"
      )}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      {icon && <span className="text-lg">{icon}</span>}
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
    </button>
  );
}

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-text-primary">{label}</label>}
      <select className={cn("input appearance-none cursor-pointer", className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// Toggle/Switch
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <div className={cn(
        "relative w-10 h-6 rounded-full transition-colors",
        checked ? "bg-primary-600" : "bg-gray-300 dark:bg-slate-600"
      )}>
        <div className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4"
        )} />
      </div>
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </button>
  );
}

// Avatar
interface AvatarProps {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center font-medium bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-100 shrink-0",
      sizes[size],
      className
    )}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
