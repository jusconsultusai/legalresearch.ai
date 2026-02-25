"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, RadioCard } from "@/components/ui";

type Step = "account" | "profile" | "referral" | "role" | "firm";

const purposes = [
  { value: "legal_work", label: "Legal work", icon: "⚖️" },
  { value: "law_school", label: "Law school / Bar review", icon: "🎓" },
  { value: "personal", label: "Personal legal matters", icon: "📋" },
];

const hearSources = [
  "Google / Search engine", "Facebook", "Instagram", "TikTok",
  "Youtube", "Friend or Colleague", "Employer", "Professor or Teacher",
  "Event (conference, webinar)", "Contacted by JusConsultus AI",
  "Blog or publication", "Other",
];

const roles = [
  { value: "solo_practitioner", label: "Solo practitioner", icon: "📱" },
  { value: "judge", label: "Judge", icon: "⚖️" },
  { value: "partner", label: "Partner", icon: "👥" },
  { value: "government_lawyer", label: "Government lawyer", icon: "🏛️" },
  { value: "associate", label: "Associate", icon: "💼" },
  { value: "legal_counsel", label: "Legal counsel", icon: "👤" },
  { value: "law_student", label: "Law student", icon: "🎓" },
  { value: "paralegal", label: "Paralegal", icon: "📁" },
  { value: "other", label: "Other", icon: "📝" },
];

const teamSizes = ["Solo", "2-3", "4-10", "10-20", "20-50"];

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    forWhom: "myself",
    purpose: "legal_work",
    firstName: "",
    lastName: "",
    phone: "",
    agreeTerms: false,
    heardFrom: "",
    userRole: "",
    firmName: "",
    teamSize: "",
    hoursPerWeek: "",
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          hoursPerWeek: formData.hoursPerWeek ? parseInt(formData.hoursPerWeek) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps: Record<Step, React.ReactNode> = {
    account: (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Let&apos;s create your JusConsultus AI account</h1>
          <p className="text-sm text-text-secondary mt-1">
            Get access to all features for <strong>free for 14 days</strong>. No credit card required.
          </p>
        </div>

        {/* Google Sign-Up */}
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-text-tertiary">
            <span className="bg-white px-2">or sign up with email</span>
          </div>
        </div>

        <Input
          label="Email address"
          type="email"
          placeholder="you@lawfirm.com"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a password (min 6 characters)"
          value={formData.password}
          onChange={(e) => updateField("password", e.target.value)}
          required
        />

        <div>
          <p className="text-sm font-medium mb-3">Who are you setting this for? <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            <RadioCard
              selected={formData.forWhom === "myself"}
              onClick={() => updateField("forWhom", "myself")}
              icon="👤"
              label="For myself"
            />
            <RadioCard
              selected={formData.forWhom === "team"}
              onClick={() => updateField("forWhom", "team")}
              icon="👥"
              label="For my team"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-3">For what purpose? <span className="text-red-500">*</span></p>
          <div className="space-y-2">
            {purposes.map((p) => (
              <RadioCard
                key={p.value}
                selected={formData.purpose === p.value}
                onClick={() => updateField("purpose", p.value)}
                icon={p.icon}
                label={p.label}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setStep("profile")} disabled={!formData.email || !formData.password}>
            Next →
          </Button>
        </div>
      </div>
    ),

    profile: (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Nice to meet you!</h1>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            required
          />
          <Input
            label="Last name"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            required
          />
        </div>

        <Input
          label="Phone number"
          type="tel"
          value={formData.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="+63 XXX XXX XXXX"
        />

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.agreeTerms}
            onChange={(e) => updateField("agreeTerms", e.target.checked)}
            className="mt-1 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-text-secondary">
            I have read and agree to JusConsultus AI&apos;s{" "}
            <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link> and{" "}
            <Link href="/terms" className="text-primary-600 hover:underline">Terms and Conditions</Link>{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setStep("account")}>← Back</Button>
          <Button onClick={() => setStep("referral")} disabled={!formData.firstName || !formData.lastName || !formData.agreeTerms}>
            Next →
          </Button>
        </div>
      </div>
    ),

    referral: (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">How did you hear about us? <span className="text-red-500">*</span></h1>

        <div className="grid grid-cols-2 gap-3">
          {hearSources.map((source) => (
            <RadioCard
              key={source}
              selected={formData.heardFrom === source}
              onClick={() => updateField("heardFrom", source)}
              label={source}
            />
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setStep("profile")}>← Back</Button>
          <Button onClick={() => setStep("role")} disabled={!formData.heardFrom}>Next →</Button>
        </div>
      </div>
    ),

    role: (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">What is your role? <span className="text-red-500">*</span></h1>
          <p className="text-sm text-text-secondary mt-1">Choose one that best describes you</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {roles.map((role) => (
            <RadioCard
              key={role.value}
              selected={formData.userRole === role.value}
              onClick={() => updateField("userRole", role.value)}
              icon={role.icon}
              label={role.label}
            />
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setStep("referral")}>← Back</Button>
          <Button onClick={() => setStep("firm")} disabled={!formData.userRole}>Next →</Button>
        </div>
      </div>
    ),

    firm: (
      <div className="space-y-6">
        <Input
          label="What is the name of your firm or company?"
          value={formData.firmName}
          onChange={(e) => updateField("firmName", e.target.value)}
        />

        <div>
          <p className="text-sm font-medium mb-3">How big is your team? <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            {teamSizes.map((size) => (
              <RadioCard
                key={size}
                selected={formData.teamSize === size}
                onClick={() => updateField("teamSize", size)}
                label={size}
              />
            ))}
          </div>
        </div>

        <Input
          label="On average, how many hours do you personally spend on legal research each week?"
          type="number"
          placeholder="Enter a number"
          value={formData.hoursPerWeek}
          onChange={(e) => updateField("hoursPerWeek", e.target.value)}
          helperText="Enter a number"
        />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setStep("role")}>← Back</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!formData.teamSize}>
            Create account
          </Button>
        </div>
      </div>
    ),
  };

  return (
    <div>
      <Link href="/" className="flex items-center gap-2 mb-8">
        <img src="/logo.png" alt="JusConsultus AI" className="w-8 h-8 rounded" />
        <span className="font-bold text-lg text-primary-900">JusConsultus AI</span>
      </Link>
      {steps[step]}
      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/signin" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
      </p>
    </div>
  );
}
