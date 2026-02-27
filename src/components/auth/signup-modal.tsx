"use client";

import { useState } from "react";
import { useSignupModalStore } from "@/stores";
import { Button } from "@/components/ui";
import ProgressBar from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { X, User, Users, ChevronLeft, Sparkles, Building, Clock } from "lucide-react";

interface SignupFormData {
  setupFor: "myself" | "team" | "";
  purpose: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  phoneCountryCode: string;
  agreedToTerms: boolean;
  howHeard: string;
  role: string;
  firmName: string;
  teamSize: string;
  researchHours: string;
}

export function SignupModal() {
  const { isOpen, currentStep, close, next, prev, triggerFeature } = useSignupModalStore();
  const [formData, setFormData] = useState<SignupFormData>({
    setupFor: "",
    purpose: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
    phoneCountryCode: "+63",
    agreedToTerms: false,
    howHeard: "",
    role: "",
    firmName: "",
    teamSize: "",
    researchHours: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof SignupFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phoneNumber ? `${formData.phoneCountryCode}${formData.phoneNumber}` : undefined,
          purpose: formData.purpose,
          userRole: formData.role,
          firmName: formData.firmName || undefined,
          teamSize: formData.teamSize,
          hoursPerWeek: formData.researchHours ? parseInt(formData.researchHours) : undefined,
          heardFrom: formData.howHeard,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Token is set via httpOnly cookie by the server
        // Reload to trigger auth state update
        window.location.href = "/";
      } else {
        const error = await response.json();
        alert(error.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("An error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      {/* Modal */}
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-fade-in border border-border">
        {/* Progress Bar */}
        <ProgressBar value={progress} className="h-1 bg-gray-200 rounded-none" barClassName="bg-primary-600 transition-all duration-300 rounded-none" aria-label="Sign up progress" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prev}
                className="p-1 rounded-lg hover:bg-surface-tertiary transition-colors mr-2"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5 text-text-secondary" />
              </button>
            )}
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-text-primary">
              {currentStep === 0 && "Let's create your JusConsultus account"}
              {currentStep === 1 && "Nice to meet you!"}
              {currentStep === 2 && "How did you hear about us?"}
              {currentStep === 3 && "What is your role?"}
              {currentStep === 4 && "Tell us about your practice"}
            </h2>
          </div>
          <button
            onClick={close}
            className="p-1 rounded-lg hover:bg-surface-tertiary transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 0 && <Step1 formData={formData} updateField={updateField} />}
          {currentStep === 1 && <Step2 formData={formData} updateField={updateField} />}
          {currentStep === 2 && <Step3 formData={formData} updateField={updateField} />}
          {currentStep === 3 && <Step4 formData={formData} updateField={updateField} />}
          {currentStep === 4 && <Step5 formData={formData} updateField={updateField} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-text-secondary">
            Step {currentStep + 1} of {totalSteps}
          </p>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prev}>
                Back
              </Button>
            )}
            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={next}
                disabled={!canProceed(currentStep, formData)}
              >
                Next →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed(currentStep, formData) || isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Setup and Purpose
function Step1({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary mb-4">
          Get access to all features for <strong>free for 14 days</strong>. No credit card required.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Who are you setting this up for? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateField("setupFor", "myself")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary-600",
              formData.setupFor === "myself"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200"
            )}
          >
            <User className="w-5 h-5 text-primary-600" />
            <span className="font-medium">For myself</span>
          </button>
          <button
            onClick={() => updateField("setupFor", "team")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary-600",
              formData.setupFor === "team"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200"
            )}
          >
            <Users className="w-5 h-5 text-primary-600" />
            <span className="font-medium">For my team</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          For what purpose? <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {["Legal work", "Law school / Bar review", "Personal legal matters"].map((purpose) => (
            <button
              key={purpose}
              onClick={() => updateField("purpose", purpose)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border-2 transition-all hover:border-primary-600",
                formData.purpose === purpose
                  ? "border-primary-600 bg-primary-50"
                  : "border-gray-200"
              )}
            >
              {purpose}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Personal Information
function Step2({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            First name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
            placeholder="Juan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
            placeholder="Dela Cruz"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
          placeholder="juan@lawfirm.ph"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => updateField("password", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
          placeholder="••••••••"
        />
        <p className="text-xs text-text-tertiary mt-1">At least 6 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Phone number
        </label>
        <div className="flex gap-2">
          <select
            value={formData.phoneCountryCode}
            onChange={(e) => updateField("phoneCountryCode", e.target.value)}
            title="Phone country code"
            aria-label="Phone country code"
            className="w-24 px-3 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
          >
            <option value="+63">🇵🇭 +63</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+65">🇸🇬 +65</option>
          </select>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => updateField("phoneNumber", e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
            placeholder="917 123 4567"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 pt-2">
        <input
          type="checkbox"
          id="terms"
          checked={formData.agreedToTerms}
          onChange={(e) => updateField("agreedToTerms", e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
        />
        <label htmlFor="terms" className="text-sm text-text-secondary">
          I have read and agree to JusConsultus.ai's{" "}
          <a href="/privacy" className="text-primary-600 hover:underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="text-primary-600 hover:underline">
            Terms and Conditions
          </a>{" "}
          <span className="text-red-500">*</span>
        </label>
      </div>
    </div>
  );
}

// Step 3: How did you hear about us
function Step3({ formData, updateField }: StepProps) {
  const options = [
    "Google / Search engine",
    "Facebook",
    "Instagram",
    "TikTok",
    "Youtube",
    "Friend or Colleague",
    "Employer",
    "Professor or Teacher",
    "Event (conference, webinar)",
    "Contacted by JusConsultus.ai",
    "Blog or publication",
    "Other",
  ];

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-text-primary mb-3">
        How did you hear about us? <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => updateField("howHeard", option)}
            className={cn(
              "text-left px-4 py-3 rounded-xl border-2 transition-all hover:border-primary-600",
              formData.howHeard === option
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 4: Role
function Step4({ formData, updateField }: StepProps) {
  const roles = [
    { value: "solo", label: "Solo practitioner", icon: "👨‍💼" },
    { value: "judge", label: "Judge", icon: "⚖️" },
    { value: "partner", label: "Partner", icon: "👥" },
    { value: "government", label: "Government lawyer", icon: "🏛️" },
    { value: "associate", label: "Associate", icon: "💼" },
    { value: "counsel", label: "Legal counsel", icon: "👔" },
    { value: "student", label: "Law student", icon: "🎓" },
    { value: "paralegal", label: "Paralegal", icon: "📋" },
    { value: "other", label: "Other", icon: "" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          What is your role? <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-text-secondary mb-4">Choose one that best describes you</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => updateField("role", role.value)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all hover:border-primary-600",
              formData.role === role.value
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200"
            )}
          >
            {role.icon && <span className="text-xl">{role.icon}</span>}
            <span className="font-medium">{role.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 5: Firm/Practice Details
function Step5({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          What is the name of your firm or company?
        </label>
        <input
          type="text"
          value={formData.firmName}
          onChange={(e) => updateField("firmName", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
          placeholder="Dela Cruz & Associates Law Firm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          How big is your team? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {["Solo", "2-3", "4-10", "10-20", "20-50", "50+"].map((size) => (
            <button
              key={size}
              onClick={() => updateField("teamSize", size)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 transition-all hover:border-primary-600 font-medium",
                formData.teamSize === size
                  ? "border-primary-600 bg-primary-50"
                  : "border-gray-200"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          On average, how many hours do you personally spend on legal research each week?
        </label>
        <p className="text-sm text-text-tertiary mb-3">Enter a number</p>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="number"
            value={formData.researchHours}
            onChange={(e) => updateField("researchHours", e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
            placeholder="10"
            min="0"
            max="168"
          />
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-text-primary mb-1">You're almost there! 🎉</h4>
            <p className="text-sm text-text-secondary">
              Click "Create account" to start using JusConsultus AI. You'll get instant access to our
              AI-powered legal research, document builder, and the complete Philippine legal database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper types and functions
interface StepProps {
  formData: SignupFormData;
  updateField: (field: keyof SignupFormData, value: any) => void;
}

function canProceed(step: number, formData: SignupFormData): boolean {
  switch (step) {
    case 0:
      return formData.setupFor !== "" && formData.purpose !== "";
    case 1:
      return (
        formData.firstName.trim() !== "" &&
        formData.lastName.trim() !== "" &&
        formData.email.trim() !== "" &&
        formData.password.length >= 6 &&
        formData.agreedToTerms
      );
    case 2:
      return formData.howHeard !== "";
    case 3:
      return formData.role !== "";
    case 4:
      return formData.teamSize !== "";
    default:
      return true;
  }
}
