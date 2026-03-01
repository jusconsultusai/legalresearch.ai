// Legal Database Categories and Subcategories
export const LEGAL_DATABASE_STRUCTURE = {
  supreme_court: {
    label: "Supreme Court",
    icon: "Scale",
    subcategories: {
      case_index: { label: "SC Case Index", icon: "FileSearch" },
      decisions: { label: "Decisions / Signed Resolutions", icon: "FileText" },
    },
  },
  laws: {
    label: "Laws",
    icon: "BookOpen",
    subcategories: {
      acts: { label: "Acts", icon: "ScrollText" },
      batas_pambansa: { label: "Batas Pambansa", icon: "Users" },
      commonwealth_act: { label: "Commonwealth Act", icon: "Building" },
      constitutions: { label: "Constitutions", icon: "Shield" },
      general_order: { label: "General Order", icon: "Flag" },
      letter_of_implementation: { label: "Letter of Implementation", icon: "Mail" },
      letter_of_instruction: { label: "Letter of Instruction", icon: "MailOpen" },
      presidential_decree: { label: "Presidential Decree", icon: "Pen" },
      republic_acts: { label: "Republic Acts", icon: "Landmark" },
      rules_of_court: { label: "Rules of Court", icon: "Gavel" },
    },
  },
  executive_issuances: {
    label: "Executive Issuances",
    icon: "Briefcase",
    subcategories: {
      administrative_orders: { label: "Administrative Orders", icon: "ClipboardList" },
      executive_orders: { label: "Executive Orders", icon: "FileSignature" },
      memorandum_circulars: { label: "Memorandum Circulars", icon: "FileSpreadsheet" },
      memorandum_orders: { label: "Memorandum Orders", icon: "FileStack" },
      national_admin_register: { label: "National Administrative Register", icon: "Database" },
      presidential_proclamations: { label: "Presidential Proclamations", icon: "Megaphone" },
    },
  },
  references: {
    label: "References",
    icon: "Library",
    subcategories: {
      concon_1934: { label: "1934-35 ConCon", icon: "History" },
      concom_1986: { label: "1986 ConCom", icon: "History" },
      draft_constitution_1986: { label: "1986 Draft Constitution", icon: "FileText" },
      sc_issuances_collation: { label: "Collation and Codification of SC Issuances", icon: "Layers" },
      judicial_forms: { label: "Revised Book of Judicial Forms", icon: "FormInput" },
      sc_stylebook: { label: "Supreme Court Stylebook First Edition", icon: "BookType" },
      benchbooks: { label: "Benchbooks", icon: "BookMarked" },
      election_cases: { label: "Election Cases", icon: "Vote" },
      decision_writing: { label: "Fundamentals of Decision Writing", icon: "PenTool" },
      judicial_writing: { label: "Manual of Judicial Writing", icon: "BookText" },
      clerks_manual: { label: "Manuals of Clerks of Court", icon: "ClipboardCheck" },
      official_gazette: { label: "Official Gazette", icon: "Newspaper" },
    },
  },
  treaties: {
    label: "Treaties",
    icon: "Globe",
    subcategories: {
      bilateral: { label: "Bilateral", icon: "Handshake" },
      regional: { label: "Regional", icon: "Globe2" },
    },
  },
} as const;

export type CategoryKey = keyof typeof LEGAL_DATABASE_STRUCTURE;
export type SubcategoryKey<C extends CategoryKey> = keyof typeof LEGAL_DATABASE_STRUCTURE[C]["subcategories"];

// Chat Response Modes
export const CHAT_MODES = {
  standard_v2: {
    label: "Context Awareness v1",
    description: "AI-powered contextual analysis that understands the full scope of your legal query for maximum accuracy.",
    badge: "New",
  },
  standard: {
    label: "Standard",
    description: "Classic experience with balanced depth and readability.",
  },
  concise: {
    label: "Concise",
    description: "For lawyers and professionals needing ultra-efficient legal summaries.",
  },
  professional: {
    label: "Professional",
    description: "For legal practitioners who need detailed legal analysis, risk assessments, and practical guidance.",
  },
  educational: {
    label: "Educational",
    description: "For law students, bar examinees, and legal scholars.",
  },
  simple_english: {
    label: "Simple English",
    description: "For non-lawyers, the general public, and individuals with limited legal knowledge.",
  },
} as const;

// Document Template Categories
export const DOCUMENT_CATEGORIES = {
  civil: {
    label: "Civil",
    types: ["Complaint", "Answer", "Motion to Dismiss", "Motion for Reconsideration", "Petition", "Affidavit", "Contract", "Deed of Sale", "Compromise Agreement"],
  },
  criminal: {
    label: "Criminal",
    types: ["Complaint-Affidavit", "Information", "Motion for Bail", "Motion to Quash", "Petition for Review", "Counter-Affidavit", "Memorandum"],
  },
  administrative: {
    label: "Administrative",
    types: ["Administrative Complaint", "Position Paper", "Formal Offer of Evidence", "Motion for Extension", "Appeal Memorandum"],
  },
  commercial: {
    label: "Commercial",
    types: ["Articles of Incorporation", "By-Laws", "Board Resolution", "Secretary's Certificate", "Non-Disclosure Agreement", "Service Agreement"],
  },
  labor: {
    label: "Labor",
    types: ["Position Paper", "Reply", "Rejoinder", "Appeal Memorandum", "Motion for Execution", "Complaint for Illegal Dismissal"],
  },
} as const;

// Subscription Plans
export const PLANS = {
  free: {
    label: "Free",
    price: 0,
    searches: 15,
    features: ["15 AI searches / 14-day trial", "Basic legal database", "1 document draft"],
  },
  pro: {
    label: "Professional",
    price: 888,
    searches: -1,
    features: ["Unlimited searches", "Full legal database", "Unlimited documents", "Document analysis", "Priority support"],
  },
  team: {
    label: "Team",
    price: 2999,
    searches: -1,
    features: ["Unlimited searches", "Full legal database", "Real-time collaboration", "Organization workspace", "Team management", "Priority support"],
  },
  enterprise: {
    label: "Large Firms",
    price: -1,
    searches: -1,
    features: ["Unlimited searches", "Custom AI training", "API access", "Dedicated support", "SLA guarantee", "Custom integrations"],
  },
} as const;
