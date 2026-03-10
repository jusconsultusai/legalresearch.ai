"use client";

import { useState, useEffect } from "react";
import { X, FileText, Users, Calendar, MapPin, Gavel, Building2, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Template Field Definitions ────────────────────────────────────────────────

export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "number" | "currency";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  group?: string; // For grouping fields in sections
  hint?: string;
}

type TemplateFieldSchema = Record<string, TemplateField[]>;

// Common field groups
const COURT_FIELDS: TemplateField[] = [
  { name: "court", label: "Court", type: "select", required: true, group: "Court Information", options: [
    { value: "REGIONAL TRIAL COURT", label: "Regional Trial Court" },
    { value: "MUNICIPAL TRIAL COURT", label: "Municipal Trial Court" },
    { value: "METROPOLITAN TRIAL COURT", label: "Metropolitan Trial Court" },
    { value: "MUNICIPAL CIRCUIT TRIAL COURT", label: "Municipal Circuit Trial Court" },
    { value: "COURT OF APPEALS", label: "Court of Appeals" },
    { value: "SUPREME COURT", label: "Supreme Court" },
    { value: "SANDIGANBAYAN", label: "Sandiganbayan" },
  ]},
  { name: "branch", label: "Branch", type: "text", placeholder: "Branch ___", group: "Court Information" },
  { name: "location", label: "City/Municipality", type: "text", placeholder: "e.g., Quezon City", required: true, group: "Court Information" },
  { name: "caseNumber", label: "Case Number", type: "text", placeholder: "Civil Case No. ___", group: "Court Information" },
];

const PLAINTIFF_FIELDS: TemplateField[] = [
  { name: "plaintiffName", label: "Plaintiff Name", type: "text", placeholder: "Full legal name", required: true, group: "Plaintiff Information" },
  { name: "plaintiffCivilStatus", label: "Civil Status", type: "select", group: "Plaintiff Information", options: [
    { value: "single", label: "Single" },
    { value: "married", label: "Married" },
    { value: "widowed", label: "Widowed" },
    { value: "divorced", label: "Divorced" },
  ]},
  { name: "plaintiffAddress", label: "Complete Address", type: "textarea", placeholder: "House No., Street, Barangay, City/Municipality, Province", group: "Plaintiff Information" },
];

const DEFENDANT_FIELDS: TemplateField[] = [
  { name: "defendantName", label: "Defendant Name", type: "text", placeholder: "Full legal name", required: true, group: "Defendant Information" },
  { name: "defendantCivilStatus", label: "Civil Status", type: "select", group: "Defendant Information", options: [
    { value: "single", label: "Single" },
    { value: "married", label: "Married" },
    { value: "widowed", label: "Widowed" },
    { value: "divorced", label: "Divorced" },
  ]},
  { name: "defendantAddress", label: "Complete Address", type: "textarea", placeholder: "House No., Street, Barangay, City/Municipality, Province", group: "Defendant Information" },
];

const COUNSEL_FIELDS: TemplateField[] = [
  { name: "counselName", label: "Counsel Name", type: "text", placeholder: "Atty. Juan Dela Cruz", group: "Counsel Information" },
  { name: "counselAddress", label: "Office Address", type: "textarea", placeholder: "Complete office address", group: "Counsel Information" },
  { name: "ibpNumber", label: "IBP Number", type: "text", placeholder: "IBP No. ___", group: "Counsel Information" },
  { name: "ptrNumber", label: "PTR Number", type: "text", placeholder: "PTR No. ___", group: "Counsel Information" },
  { name: "mcleNumber", label: "MCLE Compliance", type: "text", placeholder: "MCLE No. ___", group: "Counsel Information" },
  { name: "rollNumber", label: "Roll of Attorneys", type: "text", placeholder: "Roll No. ___", group: "Counsel Information" },
];

// ─── Template Schemas by Category ──────────────────────────────────────────────

export const TEMPLATE_FIELD_SCHEMAS: TemplateFieldSchema = {
  // ─── CIVIL ───────────────────────────────────────────────────────────────────
  complaint: [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Action", type: "text", placeholder: "e.g., Collection of Sum of Money", required: true, group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "causeOfAction", label: "Cause of Action", type: "textarea", placeholder: "State facts constituting the cause of action", group: "Allegations", hint: "Briefly describe the circumstances giving rise to the complaint" },
    { name: "amountClaimed", label: "Amount Claimed", type: "currency", placeholder: "PHP 0.00", group: "Relief Sought" },
    { name: "reliefSought", label: "Other Relief Sought", type: "textarea", placeholder: "Other damages, attorney's fees, costs of suit, etc.", group: "Relief Sought" },
    ...COUNSEL_FIELDS,
  ],

  answer: [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", placeholder: "e.g., Collection of Sum of Money", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "admissions", label: "Admissions", type: "textarea", placeholder: "Paragraphs admitted (e.g., Paragraphs 1, 2, and 3...)", group: "Response" },
    { name: "denials", label: "Specific Denials", type: "textarea", placeholder: "Paragraphs denied with reasons", group: "Response" },
    { name: "affirmativeDefenses", label: "Affirmative Defenses", type: "textarea", placeholder: "State affirmative defenses", group: "Response" },
    { name: "counterclaim", label: "Counterclaim (if any)", type: "textarea", placeholder: "State counterclaim if applicable", group: "Response" },
    ...COUNSEL_FIELDS,
  ],

  reply: [
    ...COURT_FIELDS,
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "replyContent", label: "Reply to Answer", type: "textarea", placeholder: "Response to defendant's answer and affirmative defenses", group: "Reply", hint: "Address each affirmative defense raised by the defendant" },
    ...COUNSEL_FIELDS,
  ],

  motion: [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "motionType", label: "Type of Motion", type: "text", placeholder: "e.g., Extension of Time to File Answer", required: true, group: "Motion Details" },
    { name: "grounds", label: "Grounds for Motion", type: "textarea", placeholder: "State the grounds/reasons for the motion", required: true, group: "Motion Details" },
    { name: "reliefSought", label: "Relief Sought", type: "textarea", placeholder: "Specific relief being requested", group: "Motion Details" },
    { name: "noticeOfHearing", label: "Hearing Date/Time", type: "text", placeholder: "e.g., March 15, 2026 at 8:30 AM", group: "Motion Details" },
    ...COUNSEL_FIELDS,
  ],

  demurrer: [
    ...COURT_FIELDS,
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "grounds", label: "Grounds for Demurrer", type: "textarea", placeholder: "Why plaintiff's evidence is insufficient", required: true, group: "Demurrer" },
    ...COUNSEL_FIELDS,
  ],

  memorandum: [
    ...COURT_FIELDS,
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "summary", label: "Statement of the Case", type: "textarea", placeholder: "Brief factual background", group: "Memorandum" },
    { name: "issues", label: "Issues", type: "textarea", placeholder: "Legal issues to be resolved", group: "Memorandum" },
    { name: "arguments", label: "Arguments", type: "textarea", placeholder: "Legal arguments with citations", group: "Memorandum" },
    ...COUNSEL_FIELDS,
  ],

  comment: [
    ...COURT_FIELDS,
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "oppositionTo", label: "In Opposition To", type: "text", placeholder: "e.g., Motion for Reconsideration", group: "Opposition" },
    { name: "grounds", label: "Grounds for Opposition", type: "textarea", placeholder: "Reasons for opposing the motion", group: "Opposition" },
    ...COUNSEL_FIELDS,
  ],

  // ─── CIVIL AFFIDAVITS ────────────────────────────────────────────────────────
  "judicial-affidavit": [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "witnessName", label: "Witness Name (Affiant)", type: "text", required: true, group: "Witness Information" },
    { name: "witnessAge", label: "Age", type: "number", group: "Witness Information" },
    { name: "witnessOccupation", label: "Occupation", type: "text", group: "Witness Information" },
    { name: "witnessAddress", label: "Address", type: "textarea", group: "Witness Information" },
    { name: "witnessRelation", label: "Relation to Party", type: "text", placeholder: "e.g., Plaintiff, Employee of Plaintiff", group: "Witness Information" },
    { name: "questionAnswer", label: "Questions and Answers", type: "textarea", placeholder: "Q1: [Question]\\nA1: [Answer]\\n\\nQ2: [Question]\\nA2: [Answer]", required: true, group: "Testimony", hint: "Format as Q&A per A.M. No. 12-8-8-SC (Judicial Affidavit Rule)" },
    { name: "exhibitsAttached", label: "Exhibits/Documents Attached", type: "textarea", placeholder: "List exhibits with markings (e.g., Exhibit A - Contract dated...)", group: "Exhibits" },
    ...COUNSEL_FIELDS,
  ],

  "affidavit-witness": [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "affiantName", label: "Witness Name", type: "text", required: true, group: "Witness Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Witness Information" },
    { name: "affiantCivilStatus", label: "Civil Status", type: "select", group: "Witness Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "affiantOccupation", label: "Occupation", type: "text", group: "Witness Information" },
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Witness Information" },
    { name: "witnessRelation", label: "Relation to Case/Party", type: "text", placeholder: "How the witness is connected to the case", group: "Witness Information" },
    { name: "statements", label: "Statement of Facts", type: "textarea", placeholder: "Facts personally known to the witness", required: true, group: "Testimony", hint: "State what you personally witnessed or know" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-service": [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "serverName", label: "Name of Server", type: "text", required: true, group: "Server Information" },
    { name: "serverAge", label: "Age", type: "number", group: "Server Information" },
    { name: "serverAddress", label: "Address", type: "textarea", group: "Server Information" },
    { name: "documentServed", label: "Document(s) Served", type: "text", placeholder: "e.g., Summons with Complaint", required: true, group: "Service Details" },
    { name: "dateOfService", label: "Date of Service", type: "date", required: true, group: "Service Details" },
    { name: "timeOfService", label: "Time of Service", type: "text", placeholder: "e.g., 10:30 AM", group: "Service Details" },
    { name: "placeOfService", label: "Place of Service", type: "textarea", placeholder: "Complete address where service was made", required: true, group: "Service Details" },
    { name: "mannerOfService", label: "Manner of Service", type: "select", required: true, group: "Service Details", options: [
      { value: "personal", label: "Personal Service" },
      { value: "substituted", label: "Substituted Service" },
      { value: "registered-mail", label: "Registered Mail" },
      { value: "posting", label: "Posting" },
    ]},
    { name: "personServed", label: "Person Who Received", type: "text", placeholder: "Name and relation if substituted service", group: "Service Details" },
    { name: "remarks", label: "Additional Remarks", type: "textarea", group: "Service Details" },
  ],

  "affidavit-merit": [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantCapacity", label: "Capacity", type: "text", placeholder: "e.g., Defendant, Counsel for Defendant", group: "Affiant Information" },
    { name: "failedAction", label: "Action/Pleading Failed", type: "text", placeholder: "e.g., Answer, Appeal", group: "Merit Details" },
    { name: "reasonForFailure", label: "Reason for Failure", type: "textarea", placeholder: "Explain why the action/pleading was not filed on time", required: true, group: "Merit Details" },
    { name: "meritoriousDefense", label: "Meritorious Defense/Claim", type: "textarea", placeholder: "State the substantial defense or claim that would support the case", required: true, group: "Merit Details", hint: "Explain why the case has merit and should proceed" },
    { name: "evidenceSupport", label: "Supporting Evidence", type: "textarea", placeholder: "Documents or facts supporting the meritorious defense", group: "Merit Details" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "verification": [
    ...COURT_FIELDS,
    { name: "caseType", label: "Nature of Case", type: "text", group: "Case Details" },
    ...PLAINTIFF_FIELDS,
    ...DEFENDANT_FIELDS,
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantCapacity", label: "Capacity", type: "text", placeholder: "e.g., Plaintiff, Authorized Representative", required: true, group: "Affiant Information" },
    { name: "pleadingVerified", label: "Pleading Being Verified", type: "text", placeholder: "e.g., Complaint, Petition", required: true, group: "Verification Details" },
    { name: "basisOfAllegations", label: "Basis of Allegations", type: "select", required: true, group: "Verification Details", options: [
      { value: "personal-knowledge", label: "Personal Knowledge" },
      { value: "authentic-records", label: "Authentic Records" },
      { value: "both", label: "Personal Knowledge and Authentic Records" },
    ]},
    { name: "otherForumCases", label: "Related Cases in Other Forums", type: "textarea", placeholder: "If any case involving same issues is pending, state details. If none, leave blank.", group: "Non-Forum Shopping", hint: "Disclose any pending case with same parties/issues in any court or tribunal" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  // ─── CRIMINAL ────────────────────────────────────────────────────────────────
  "complaint-affidavit": [
    { name: "affiantName", label: "Complainant Name", type: "text", required: true, group: "Complainant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Complainant Information" },
    { name: "affiantCivilStatus", label: "Civil Status", type: "select", group: "Complainant Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "affiantAddress", label: "Address", type: "textarea", group: "Complainant Information" },
    { name: "respondentName", label: "Respondent Name", type: "text", required: true, group: "Respondent Information" },
    { name: "respondentAddress", label: "Respondent Address", type: "textarea", group: "Respondent Information" },
    { name: "offense", label: "Offense Charged", type: "text", placeholder: "e.g., Estafa, Qualified Theft", required: true, group: "Offense Details" },
    { name: "dateOfIncident", label: "Date of Incident", type: "date", group: "Offense Details" },
    { name: "placeOfIncident", label: "Place of Incident", type: "text", group: "Offense Details" },
    { name: "narrative", label: "Narrative of Facts", type: "textarea", placeholder: "Detailed narration of events", required: true, group: "Offense Details", hint: "State facts in chronological order" },
    { name: "evidence", label: "Supporting Evidence", type: "textarea", placeholder: "List documentary evidence", group: "Evidence" },
  ],

  "counter-affidavit": [
    { name: "affiantName", label: "Respondent Name", type: "text", required: true, group: "Respondent Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Respondent Information" },
    { name: "affiantAddress", label: "Address", type: "textarea", group: "Respondent Information" },
    { name: "complainantName", label: "Complainant Name", type: "text", group: "Complainant Information" },
    { name: "caseNumber", label: "NPS Docket No.", type: "text", placeholder: "NPS Docket No. ___", group: "Case Details" },
    { name: "offense", label: "Offense Charged", type: "text", group: "Case Details" },
    { name: "defenses", label: "Defenses", type: "textarea", placeholder: "State your defense against the allegations", required: true, group: "Counter-Affidavit" },
    { name: "evidence", label: "Counter-Evidence", type: "textarea", placeholder: "Evidence supporting your defense", group: "Counter-Affidavit" },
  ],

  "motion-dismiss": [
    ...COURT_FIELDS,
    { name: "accusedName", label: "Accused Name", type: "text", required: true, group: "Accused Information" },
    { name: "offense", label: "Offense Charged", type: "text", group: "Case Details" },
    { name: "grounds", label: "Grounds for Dismissal", type: "textarea", placeholder: "Legal grounds for dismissal", required: true, group: "Motion" },
    ...COUNSEL_FIELDS,
  ],

  "bail-petition": [
    ...COURT_FIELDS,
    { name: "accusedName", label: "Petitioner/Accused Name", type: "text", required: true, group: "Petitioner Information" },
    { name: "accusedAddress", label: "Address", type: "textarea", group: "Petitioner Information" },
    { name: "offense", label: "Offense Charged", type: "text", group: "Case Details" },
    { name: "dateOfArrest", label: "Date of Arrest", type: "date", group: "Case Details" },
    { name: "bailAmount", label: "Bail Amount Requested", type: "currency", group: "Petition" },
    { name: "grounds", label: "Grounds for Bail", type: "textarea", placeholder: "Reasons why bail should be granted", group: "Petition" },
    ...COUNSEL_FIELDS,
  ],

  // ─── CONTRACTS ───────────────────────────────────────────────────────────────
  "contract-service": [
    { name: "clientName", label: "Client/First Party", type: "text", required: true, group: "First Party" },
    { name: "clientAddress", label: "Client Address", type: "textarea", group: "First Party" },
    { name: "providerName", label: "Service Provider/Second Party", type: "text", required: true, group: "Second Party" },
    { name: "providerAddress", label: "Provider Address", type: "textarea", group: "Second Party" },
    { name: "serviceDescription", label: "Description of Services", type: "textarea", placeholder: "Detailed description of services to be rendered", required: true, group: "Service Terms" },
    { name: "startDate", label: "Start Date", type: "date", group: "Service Terms" },
    { name: "endDate", label: "End Date", type: "date", group: "Service Terms" },
    { name: "contractPrice", label: "Contract Price", type: "currency", required: true, group: "Payment Terms" },
    { name: "paymentTerms", label: "Payment Schedule", type: "textarea", placeholder: "e.g., 50% upon signing, 50% upon completion", group: "Payment Terms" },
    { name: "venue", label: "Venue for Disputes", type: "text", placeholder: "e.g., Quezon City", group: "Other Terms" },
  ],

  "contract-lease": [
    { name: "lessorName", label: "Lessor (Owner)", type: "text", required: true, group: "Lessor Information" },
    { name: "lessorAddress", label: "Lessor Address", type: "textarea", group: "Lessor Information" },
    { name: "lesseeName", label: "Lessee (Tenant)", type: "text", required: true, group: "Lessee Information" },
    { name: "lesseeAddress", label: "Lessee Address", type: "textarea", group: "Lessee Information" },
    { name: "propertyAddress", label: "Property Address", type: "textarea", placeholder: "Complete address of leased property", required: true, group: "Property Details" },
    { name: "propertyDescription", label: "Property Description", type: "textarea", placeholder: "Description of the property", group: "Property Details" },
    { name: "leaseTerm", label: "Lease Term", type: "text", placeholder: "e.g., 1 year", group: "Lease Terms" },
    { name: "startDate", label: "Start Date", type: "date", group: "Lease Terms" },
    { name: "monthlyRent", label: "Monthly Rent", type: "currency", required: true, group: "Payment Terms" },
    { name: "securityDeposit", label: "Security Deposit", type: "currency", group: "Payment Terms" },
    { name: "advanceRent", label: "Advance Rent", type: "text", placeholder: "e.g., 2 months", group: "Payment Terms" },
    { name: "venue", label: "Venue for Disputes", type: "text", group: "Other Terms" },
  ],

  "deed-sale": [
    { name: "vendorName", label: "Vendor (Seller)", type: "text", required: true, group: "Vendor Information" },
    { name: "vendorCivilStatus", label: "Civil Status", type: "select", group: "Vendor Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "vendorAddress", label: "Vendor Address", type: "textarea", group: "Vendor Information" },
    { name: "vendeeName", label: "Vendee (Buyer)", type: "text", required: true, group: "Vendee Information" },
    { name: "vendeeCivilStatus", label: "Civil Status", type: "select", group: "Vendee Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "vendeeAddress", label: "Vendee Address", type: "textarea", group: "Vendee Information" },
    { name: "propertyDescription", label: "Property Description", type: "textarea", placeholder: "Complete description including TCT/OCT, lot no., area", required: true, group: "Property Details" },
    { name: "propertyLocation", label: "Property Location", type: "textarea", group: "Property Details" },
    { name: "transferCertificate", label: "TCT/OCT Number", type: "text", placeholder: "TCT No. ___", group: "Property Details" },
    { name: "purchasePrice", label: "Purchase Price", type: "currency", required: true, group: "Sale Terms" },
    { name: "paymentMode", label: "Mode of Payment", type: "text", placeholder: "e.g., Cash, Installment", group: "Sale Terms" },
  ],

  moa: [
    { name: "firstPartyName", label: "First Party", type: "text", required: true, group: "First Party" },
    { name: "firstPartyDescription", label: "First Party Description", type: "textarea", placeholder: "Nature of entity, address", group: "First Party" },
    { name: "secondPartyName", label: "Second Party", type: "text", required: true, group: "Second Party" },
    { name: "secondPartyDescription", label: "Second Party Description", type: "textarea", group: "Second Party" },
    { name: "purpose", label: "Purpose of Agreement", type: "textarea", placeholder: "Purpose and objectives", required: true, group: "Agreement Terms" },
    { name: "obligations", label: "Mutual Obligations", type: "textarea", placeholder: "Obligations of each party", group: "Agreement Terms" },
    { name: "effectivityDate", label: "Effectivity Date", type: "date", group: "Agreement Terms" },
    { name: "termination", label: "Termination Clause", type: "textarea", group: "Agreement Terms" },
  ],

  mou: [
    { name: "firstPartyName", label: "First Party", type: "text", required: true, group: "First Party" },
    { name: "secondPartyName", label: "Second Party", type: "text", required: true, group: "Second Party" },
    { name: "understanding", label: "Statement of Understanding", type: "textarea", placeholder: "What the parties understand and agree upon", required: true, group: "Understanding" },
    { name: "purposeScope", label: "Purpose and Scope", type: "textarea", group: "Understanding" },
    { name: "effectivityDate", label: "Effectivity Date", type: "date", group: "Terms" },
  ],

  nda: [
    { name: "disclosingParty", label: "Disclosing Party", type: "text", required: true, group: "Disclosing Party" },
    { name: "disclosingPartyAddress", label: "Address", type: "textarea", group: "Disclosing Party" },
    { name: "receivingParty", label: "Receiving Party", type: "text", required: true, group: "Receiving Party" },
    { name: "receivingPartyAddress", label: "Address", type: "textarea", group: "Receiving Party" },
    { name: "confidentialInfo", label: "Definition of Confidential Information", type: "textarea", placeholder: "Describe what constitutes confidential information", group: "Confidentiality Terms" },
    { name: "purpose", label: "Purpose of Disclosure", type: "textarea", group: "Confidentiality Terms" },
    { name: "duration", label: "Duration of Confidentiality", type: "text", placeholder: "e.g., 5 years", group: "Confidentiality Terms" },
    { name: "effectivityDate", label: "Effective Date", type: "date", group: "Terms" },
  ],

  "employment-contract": [
    { name: "employerName", label: "Employer Name", type: "text", required: true, group: "Employer Information" },
    { name: "employerAddress", label: "Employer Address", type: "textarea", group: "Employer Information" },
    { name: "employeeName", label: "Employee Name", type: "text", required: true, group: "Employee Information" },
    { name: "employeeAddress", label: "Employee Address", type: "textarea", group: "Employee Information" },
    { name: "position", label: "Position/Job Title", type: "text", required: true, group: "Employment Terms" },
    { name: "department", label: "Department", type: "text", group: "Employment Terms" },
    { name: "startDate", label: "Start Date", type: "date", group: "Employment Terms" },
    { name: "employmentType", label: "Type of Employment", type: "select", group: "Employment Terms", options: [
      { value: "regular", label: "Regular" },
      { value: "probationary", label: "Probationary" },
      { value: "project", label: "Project-Based" },
      { value: "seasonal", label: "Seasonal" },
      { value: "fixed-term", label: "Fixed-Term" },
    ]},
    { name: "basicSalary", label: "Basic Monthly Salary", type: "currency", required: true, group: "Compensation" },
    { name: "benefits", label: "Benefits", type: "textarea", placeholder: "SSS, PhilHealth, Pag-IBIG, etc.", group: "Compensation" },
    { name: "workSchedule", label: "Work Schedule", type: "text", placeholder: "e.g., Monday-Friday, 9AM-6PM", group: "Work Conditions" },
    { name: "workLocation", label: "Work Location", type: "text", group: "Work Conditions" },
  ],

  // ─── CORPORATE ───────────────────────────────────────────────────────────────
  "articles-inc": [
    { name: "corporateName", label: "Corporate Name", type: "text", required: true, group: "Corporation Details" },
    { name: "principalOffice", label: "Principal Office Address", type: "textarea", required: true, group: "Corporation Details" },
    { name: "corporateTerm", label: "Corporate Term", type: "text", placeholder: "e.g., 50 years or Perpetual", group: "Corporation Details" },
    { name: "primaryPurpose", label: "Primary Purpose", type: "textarea", placeholder: "Main business purpose", required: true, group: "Purpose" },
    { name: "secondaryPurpose", label: "Secondary Purpose", type: "textarea", group: "Purpose" },
    { name: "authorizedCapital", label: "Authorized Capital Stock", type: "currency", group: "Capital Structure" },
    { name: "subscribedCapital", label: "Subscribed Capital", type: "currency", group: "Capital Structure" },
    { name: "paidUpCapital", label: "Paid-Up Capital", type: "currency", group: "Capital Structure" },
    { name: "incorporators", label: "Incorporators (Names)", type: "textarea", placeholder: "List all incorporators", group: "Incorporators" },
    { name: "treasurer", label: "Treasurer-in-Trust", type: "text", group: "Incorporators" },
  ],

  bylaws: [
    { name: "corporateName", label: "Corporate Name", type: "text", required: true, group: "Corporation Details" },
    { name: "principalOffice", label: "Principal Office", type: "textarea", group: "Corporation Details" },
    { name: "boardSize", label: "Number of Directors", type: "number", placeholder: "e.g., 5", group: "Board of Directors" },
    { name: "quorum", label: "Quorum Required", type: "text", placeholder: "e.g., Majority", group: "Board of Directors" },
    { name: "meetingSchedule", label: "Regular Meeting Schedule", type: "text", placeholder: "e.g., First Monday of each month", group: "Meetings" },
  ],

  "board-resolution": [
    { name: "corporateName", label: "Corporation Name", type: "text", required: true, group: "Corporation Details" },
    { name: "meetingDate", label: "Meeting Date", type: "date", required: true, group: "Meeting Details" },
    { name: "meetingPlace", label: "Meeting Place", type: "text", group: "Meeting Details" },
    { name: "meetingType", label: "Meeting Type", type: "select", group: "Meeting Details", options: [
      { value: "regular", label: "Regular Meeting" },
      { value: "special", label: "Special Meeting" },
      { value: "organizational", label: "Organizational Meeting" },
    ]},
    { name: "resolutionNumber", label: "Resolution Number", type: "text", placeholder: "Resolution No. ___", group: "Resolution" },
    { name: "resolutionSubject", label: "Subject of Resolution", type: "text", required: true, group: "Resolution" },
    { name: "resolutionBody", label: "Resolution Text", type: "textarea", placeholder: "RESOLVED, that...", required: true, group: "Resolution" },
    { name: "moviedBy", label: "Moved By", type: "text", group: "Resolution" },
    { name: "secondedBy", label: "Seconded By", type: "text", group: "Resolution" },
    { name: "corporateSecretary", label: "Corporate Secretary", type: "text", group: "Certification" },
  ],

  "secretary-cert": [
    { name: "corporateName", label: "Corporation Name", type: "text", required: true, group: "Corporation Details" },
    { name: "secretaryName", label: "Corporate Secretary Name", type: "text", required: true, group: "Secretary Details" },
    { name: "meetingDate", label: "Meeting Date", type: "date", group: "Meeting Details" },
    { name: "resolutionSubject", label: "Subject Being Certified", type: "text", required: true, group: "Certification" },
    { name: "authorizedPerson", label: "Authorized Person/Representative", type: "text", group: "Certification" },
    { name: "authorizedActs", label: "Authorized Acts", type: "textarea", placeholder: "Acts the person is authorized to perform", group: "Certification" },
  ],

  gis: [
    { name: "corporateName", label: "Corporation Name", type: "text", required: true, group: "Corporation Details" },
    { name: "secRegNumber", label: "SEC Registration Number", type: "text", group: "Corporation Details" },
    { name: "principalOffice", label: "Principal Office Address", type: "textarea", group: "Corporation Details" },
    { name: "fiscalYear", label: "Fiscal Year", type: "text", placeholder: "e.g., December 31", group: "Corporation Details" },
    { name: "directors", label: "Board of Directors", type: "textarea", placeholder: "List directors with titles", group: "Officers & Directors" },
    { name: "officers", label: "Corporate Officers", type: "textarea", placeholder: "List officers with positions", group: "Officers & Directors" },
  ],

  // ─── ADMINISTRATIVE ──────────────────────────────────────────────────────────
  "position-paper": [
    { name: "tribunal", label: "Tribunal/Agency", type: "text", placeholder: "e.g., NLRC, DARAB, CSC", required: true, group: "Tribunal" },
    { name: "branch", label: "Regional Office/Branch", type: "text", group: "Tribunal" },
    { name: "caseNumber", label: "Case Number", type: "text", group: "Case Details" },
    { name: "complainantName", label: "Complainant Name", type: "text", required: true, group: "Parties" },
    { name: "respondentName", label: "Respondent Name", type: "text", required: true, group: "Parties" },
    { name: "caseSummary", label: "Statement of the Case", type: "textarea", group: "Position Paper" },
    { name: "issues", label: "Issues", type: "textarea", placeholder: "Issues to be resolved", group: "Position Paper" },
    { name: "arguments", label: "Arguments", type: "textarea", placeholder: "Legal arguments", group: "Position Paper" },
    { name: "evidence", label: "Evidence", type: "textarea", placeholder: "List of evidence submitted", group: "Position Paper" },
    ...COUNSEL_FIELDS,
  ],

  "admin-complaint": [
    { name: "tribunal", label: "Agency/Office", type: "text", required: true, group: "Agency" },
    { name: "complainantName", label: "Complainant Name", type: "text", required: true, group: "Complainant" },
    { name: "complainantPosition", label: "Position/Designation", type: "text", group: "Complainant" },
    { name: "respondentName", label: "Respondent Name", type: "text", required: true, group: "Respondent" },
    { name: "respondentPosition", label: "Respondent Position", type: "text", group: "Respondent" },
    { name: "offense", label: "Administrative Offense", type: "text", required: true, group: "Complaint" },
    { name: "narrative", label: "Statement of Facts", type: "textarea", placeholder: "Narration of events", required: true, group: "Complaint" },
    { name: "evidence", label: "Supporting Documents", type: "textarea", group: "Evidence" },
  ],

  appeal: [
    { name: "tribunal", label: "Appellate Body", type: "text", required: true, group: "Appellate Body" },
    { name: "originalTribunal", label: "Original Tribunal", type: "text", group: "Case Details" },
    { name: "caseNumber", label: "Original Case Number", type: "text", group: "Case Details" },
    { name: "dateOfDecision", label: "Date of Appealed Decision", type: "date", group: "Case Details" },
    { name: "appellantName", label: "Appellant Name", type: "text", required: true, group: "Parties" },
    { name: "appelleeName", label: "Appellee Name", type: "text", group: "Parties" },
    { name: "assignmentOfErrors", label: "Assignment of Errors", type: "textarea", placeholder: "Errors attributed to the lower tribunal", required: true, group: "Appeal" },
    { name: "arguments", label: "Arguments", type: "textarea", group: "Appeal" },
    ...COUNSEL_FIELDS,
  ],

  // ─── NOTARIAL ────────────────────────────────────────────────────────────────
  affidavit: [
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Affiant Information" },
    { name: "affiantCivilStatus", label: "Civil Status", type: "select", group: "Affiant Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Affiant Information" },
    { name: "affidavitPurpose", label: "Purpose of Affidavit", type: "text", placeholder: "e.g., Loss of Documents", group: "Affidavit Details" },
    { name: "statements", label: "Statements Under Oath", type: "textarea", placeholder: "The facts being attested to", required: true, group: "Affidavit Details", hint: "Number each statement (1., 2., 3., etc.)" },
    { name: "place", label: "Place of Execution", type: "text", placeholder: "City/Municipality", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-loss": [
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Affiant Information" },
    { name: "affiantCivilStatus", label: "Civil Status", type: "select", group: "Affiant Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Affiant Information" },
    { name: "documentLost", label: "Document/Item Lost", type: "text", placeholder: "e.g., Driver's License, Land Title", required: true, group: "Loss Details" },
    { name: "documentDetails", label: "Document Details", type: "textarea", placeholder: "Document number, date issued, issuing authority", group: "Loss Details" },
    { name: "circumstancesOfLoss", label: "Circumstances of Loss", type: "textarea", placeholder: "How, when, and where the document was lost", required: true, group: "Loss Details" },
    { name: "effortsMade", label: "Efforts Made to Recover", type: "textarea", placeholder: "Steps taken to find/recover the document", group: "Loss Details" },
    { name: "purpose", label: "Purpose of Affidavit", type: "text", placeholder: "e.g., For replacement/reissuance", group: "Purpose" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-desistance": [
    { name: "affiantName", label: "Complainant/Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Affiant Information" },
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Affiant Information" },
    { name: "respondentName", label: "Respondent/Accused Name", type: "text", required: true, group: "Case Details" },
    { name: "caseNumber", label: "Case Number", type: "text", placeholder: "If case already filed", group: "Case Details" },
    { name: "caseTitle", label: "Nature of Case/Charge", type: "text", placeholder: "e.g., Estafa, Physical Injuries", group: "Case Details" },
    { name: "tribunal", label: "Court/Office Where Filed", type: "text", placeholder: "e.g., Office of the City Prosecutor", group: "Case Details" },
    { name: "reasonForDesistance", label: "Reason for Desistance", type: "textarea", placeholder: "Why you are withdrawing the complaint", required: true, group: "Desistance", hint: "e.g., Amicable settlement, misunderstanding resolved" },
    { name: "acknowledgment", label: "Additional Acknowledgments", type: "textarea", placeholder: "e.g., No force/intimidation, voluntary execution", group: "Desistance" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-support": [
    { name: "sponsorName", label: "Sponsor/Supporter Name", type: "text", required: true, group: "Sponsor Information" },
    { name: "sponsorAge", label: "Age", type: "number", group: "Sponsor Information" },
    { name: "sponsorCivilStatus", label: "Civil Status", type: "select", group: "Sponsor Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "sponsorOccupation", label: "Occupation", type: "text", group: "Sponsor Information" },
    { name: "sponsorAddress", label: "Address", type: "textarea", required: true, group: "Sponsor Information" },
    { name: "beneficiaryName", label: "Beneficiary Name", type: "text", required: true, group: "Beneficiary Information" },
    { name: "relationToBeneficiary", label: "Relation to Beneficiary", type: "text", placeholder: "e.g., Parent, Sibling, Friend", required: true, group: "Beneficiary Information" },
    { name: "beneficiaryPurpose", label: "Purpose", type: "text", placeholder: "e.g., Visa application, Travel, Studies", required: true, group: "Support Details" },
    { name: "supportDetails", label: "Nature of Support", type: "textarea", placeholder: "Financial support, accommodation, etc.", required: true, group: "Support Details" },
    { name: "duration", label: "Duration of Support", type: "text", placeholder: "e.g., For the duration of stay", group: "Support Details" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-consent": [
    { name: "consentorName", label: "Person Giving Consent", type: "text", required: true, group: "Consentor Information" },
    { name: "consentorAge", label: "Age", type: "number", group: "Consentor Information" },
    { name: "consentorCivilStatus", label: "Civil Status", type: "select", group: "Consentor Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "consentorAddress", label: "Address", type: "textarea", required: true, group: "Consentor Information" },
    { name: "consentorRelation", label: "Relationship to Minor/Person", type: "text", placeholder: "e.g., Father, Mother, Guardian", required: true, group: "Consentor Information" },
    { name: "beneficiaryName", label: "Minor/Person Consented For", type: "text", required: true, group: "Beneficiary Information" },
    { name: "beneficiaryAge", label: "Age", type: "number", group: "Beneficiary Information" },
    { name: "consentFor", label: "Consent For", type: "select", required: true, group: "Consent Details", options: [
      { value: "travel", label: "Travel Abroad" },
      { value: "marriage", label: "Marriage" },
      { value: "work", label: "Employment/Work" },
      { value: "medical", label: "Medical Procedure" },
      { value: "other", label: "Other" },
    ]},
    { name: "consentDetails", label: "Details of Consent", type: "textarea", placeholder: "Specifics of what is being consented to", required: true, group: "Consent Details" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-cohabitation": [
    { name: "partner1Name", label: "First Partner Name", type: "text", required: true, group: "First Partner" },
    { name: "partner1Age", label: "Age", type: "number", group: "First Partner" },
    { name: "partner1CivilStatus", label: "Civil Status", type: "select", group: "First Partner", options: [
      { value: "single", label: "Single" },
      { value: "widowed", label: "Widowed" },
      { value: "divorced", label: "Legally Separated/Divorced" },
    ]},
    { name: "partner1Address", label: "Address", type: "textarea", group: "First Partner" },
    { name: "partner2Name", label: "Second Partner Name", type: "text", required: true, group: "Second Partner" },
    { name: "partner2Age", label: "Age", type: "number", group: "Second Partner" },
    { name: "partner2CivilStatus", label: "Civil Status", type: "select", group: "Second Partner", options: [
      { value: "single", label: "Single" },
      { value: "widowed", label: "Widowed" },
      { value: "divorced", label: "Legally Separated/Divorced" },
    ]},
    { name: "cohabitationAddress", label: "Address of Cohabitation", type: "textarea", required: true, group: "Cohabitation Details" },
    { name: "startDate", label: "Date Cohabitation Started", type: "date", group: "Cohabitation Details" },
    { name: "children", label: "Children (if any)", type: "textarea", placeholder: "Names and birthdates of children", group: "Cohabitation Details" },
    { name: "purpose", label: "Purpose", type: "text", placeholder: "e.g., Marriage license application", group: "Purpose" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-discrepancy": [
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Affiant Information" },
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Affiant Information" },
    { name: "documentType", label: "Document with Discrepancy", type: "text", placeholder: "e.g., Birth Certificate, School Records", required: true, group: "Discrepancy Details" },
    { name: "incorrectEntry", label: "Incorrect Entry", type: "text", placeholder: "What appears in the document", required: true, group: "Discrepancy Details" },
    { name: "correctEntry", label: "Correct Entry", type: "text", placeholder: "What it should be", required: true, group: "Discrepancy Details" },
    { name: "typeOfDiscrepancy", label: "Type of Discrepancy", type: "select", group: "Discrepancy Details", options: [
      { value: "name", label: "Name Spelling/Error" },
      { value: "birthdate", label: "Date of Birth" },
      { value: "birthplace", label: "Place of Birth" },
      { value: "gender", label: "Gender/Sex" },
      { value: "parents", label: "Parents' Names" },
      { value: "other", label: "Other" },
    ]},
    { name: "explanation", label: "Explanation", type: "textarea", placeholder: "Explain the discrepancy and why correction is needed", required: true, group: "Discrepancy Details" },
    { name: "supportingDocs", label: "Supporting Documents", type: "textarea", placeholder: "Documents proving the correct entry", group: "Evidence" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-no-income": [
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Affiant Information" },
    { name: "affiantCivilStatus", label: "Civil Status", type: "select", group: "Affiant Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Affiant Information" },
    { name: "lastEmployment", label: "Last Employment (if any)", type: "text", placeholder: "Previous employer/business", group: "Employment History" },
    { name: "dateLastEmployed", label: "Date Last Employed", type: "date", group: "Employment History" },
    { name: "reasonNoIncome", label: "Reason for No Income", type: "textarea", placeholder: "e.g., Unemployed, Student, Dependent", required: true, group: "Income Status" },
    { name: "dependentOn", label: "Currently Dependent On", type: "text", placeholder: "Name of person providing support", group: "Income Status" },
    { name: "purpose", label: "Purpose of Affidavit", type: "text", placeholder: "e.g., Scholarship, Legal aid, Tax exemption", required: true, group: "Purpose" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-undertaking": [
    { name: "affiantName", label: "Affiant Name", type: "text", required: true, group: "Affiant Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Affiant Information" },
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Affiant Information" },
    { name: "undertakingFor", label: "Undertaking For/To", type: "text", placeholder: "Name of person/entity", group: "Undertaking Details" },
    { name: "undertakingSubject", label: "Subject of Undertaking", type: "text", placeholder: "Brief description", required: true, group: "Undertaking Details" },
    { name: "undertakingDetails", label: "Specific Undertaking", type: "textarea", placeholder: "Detailed description of what you undertake to do", required: true, group: "Undertaking Details", hint: "Be specific about obligations and timeline" },
    { name: "consequences", label: "Consequences of Non-Compliance", type: "textarea", placeholder: "What happens if undertaking is breached", group: "Undertaking Details" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "affidavit-self-adjudication": [
    { name: "affiantName", label: "Sole Heir Name", type: "text", required: true, group: "Heir Information" },
    { name: "affiantAge", label: "Age", type: "number", group: "Heir Information" },
    { name: "affiantCivilStatus", label: "Civil Status", type: "select", group: "Heir Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "affiantAddress", label: "Address", type: "textarea", required: true, group: "Heir Information" },
    { name: "decedentName", label: "Decedent Name", type: "text", required: true, group: "Decedent Information" },
    { name: "relationToDecedent", label: "Relation to Decedent", type: "text", placeholder: "e.g., Son, Daughter, Spouse", required: true, group: "Decedent Information" },
    { name: "dateOfDeath", label: "Date of Death", type: "date", required: true, group: "Decedent Information" },
    { name: "placeOfDeath", label: "Place of Death", type: "text", group: "Decedent Information" },
    { name: "estateDescription", label: "Estate Description", type: "textarea", placeholder: "Description of properties (real, personal)", required: true, group: "Estate Details", hint: "Include TCT numbers, lot areas for real property" },
    { name: "noOtherHeirs", label: "Declaration of Sole Heir", type: "textarea", placeholder: "Statement that affiant is the only legal heir", required: true, group: "Estate Details" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  "joint-affidavit": [
    { name: "affiant1Name", label: "First Affiant Name", type: "text", required: true, group: "First Affiant" },
    { name: "affiant1Age", label: "Age", type: "number", group: "First Affiant" },
    { name: "affiant1Address", label: "Address", type: "textarea", group: "First Affiant" },
    { name: "affiant2Name", label: "Second Affiant Name", type: "text", required: true, group: "Second Affiant" },
    { name: "affiant2Age", label: "Age", type: "number", group: "Second Affiant" },
    { name: "affiant2Address", label: "Address", type: "textarea", group: "Second Affiant" },
    { name: "subjectPerson", label: "Person Being Attested For", type: "text", required: true, group: "Subject" },
    { name: "subjectPurpose", label: "Purpose", type: "text", placeholder: "e.g., Late Registration, Discrepancy", required: true, group: "Subject" },
    { name: "knowledgeStatement", label: "Personal Knowledge Statement", type: "textarea", placeholder: "How affiants personally know the facts", required: true, group: "Attestation", hint: "State how you know the person and facts" },
    { name: "factsAttested", label: "Facts Being Attested", type: "textarea", placeholder: "The specific facts being attested to", required: true, group: "Attestation" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  spa: [
    { name: "principalName", label: "Principal Name", type: "text", required: true, group: "Principal Information" },
    { name: "principalCivilStatus", label: "Civil Status", type: "select", group: "Principal Information", options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "widowed", label: "Widowed" },
    ]},
    { name: "principalAddress", label: "Principal Address", type: "textarea", required: true, group: "Principal Information" },
    { name: "agentName", label: "Attorney-in-Fact Name", type: "text", required: true, group: "Agent Information" },
    { name: "agentAddress", label: "Agent Address", type: "textarea", group: "Agent Information" },
    { name: "powers", label: "Powers Granted", type: "textarea", placeholder: "Specific powers and authorities granted", required: true, group: "Powers", hint: "Be specific about what acts the agent can perform" },
    { name: "limitations", label: "Limitations (if any)", type: "textarea", group: "Powers" },
    { name: "validityPeriod", label: "Validity Period", type: "text", placeholder: "e.g., Until revoked, or specific date", group: "Validity" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  gpa: [
    { name: "principalName", label: "Principal Name", type: "text", required: true, group: "Principal Information" },
    { name: "principalAddress", label: "Principal Address", type: "textarea", required: true, group: "Principal Information" },
    { name: "agentName", label: "Attorney-in-Fact Name", type: "text", required: true, group: "Agent Information" },
    { name: "agentAddress", label: "Agent Address", type: "textarea", group: "Agent Information" },
    { name: "generalPowers", label: "General Powers", type: "textarea", placeholder: "Broad powers granted to the agent", required: true, group: "Powers" },
    { name: "place", label: "Place of Execution", type: "text", group: "Notarial Details" },
    { name: "date", label: "Date of Execution", type: "date", group: "Notarial Details" },
  ],

  jurat: [
    { name: "documentType", label: "Type of Document", type: "text", placeholder: "e.g., Affidavit", group: "Document Details" },
    { name: "affiantName", label: "Name of Person", type: "text", required: true, group: "Person Details" },
    { name: "idType", label: "ID Presented", type: "text", placeholder: "e.g., Passport, Driver's License", group: "Person Details" },
    { name: "idNumber", label: "ID Number", type: "text", group: "Person Details" },
    { name: "place", label: "Place", type: "text", required: true, group: "Jurat Details" },
    { name: "date", label: "Date", type: "date", group: "Jurat Details" },
  ],
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TemplateInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateKey: string;
  templateLabel: string;
  categoryColor?: string;
  onGenerate: (data: Record<string, string>, preview: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TemplateInputModal({
  isOpen,
  onClose,
  templateKey,
  templateLabel,
  categoryColor = "border-blue-200 bg-blue-50",
  onGenerate,
}: TemplateInputModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = TEMPLATE_FIELD_SCHEMAS[templateKey] || [];

  // Group fields by their group property
  const groupedFields = fields.reduce((acc, field) => {
    const group = field.group || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, TemplateField[]>);

  // Reset form when template changes
  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setPreview(null);
      setShowPreview(false);
      setError(null);
    }
  }, [isOpen, templateKey]);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/template?type=${templateKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.content) {
        setPreview(data.content);
        setShowPreview(true);
      } else {
        setError("Failed to generate preview");
      }
    } catch {
      setError("Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = fields
      .filter((f) => f.required && !formData[f.name]?.trim())
      .map((f) => f.label);

    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/template?type=${templateKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.content) {
        onGenerate(formData, data.content);
        onClose();
      } else {
        setError("Failed to generate document");
      }
    } catch {
      setError("Failed to generate document");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={cn("px-6 py-4 border-b flex items-center justify-between", categoryColor)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{templateLabel}</h2>
              <p className="text-xs opacity-75">Fill in the details below to generate your document</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([group, groupFields]) => (
              <div key={group} className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2 pb-1 border-b">
                  {group === "Court Information" && <Gavel className="w-4 h-4" />}
                  {group === "Plaintiff Information" && <Users className="w-4 h-4" />}
                  {group === "Defendant Information" && <Users className="w-4 h-4" />}
                  {group === "Counsel Information" && <Users className="w-4 h-4" />}
                  {group.includes("Party") && <Building2 className="w-4 h-4" />}
                  {group}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupFields.map((field) => (
                    <div
                      key={field.name}
                      className={cn(
                        "space-y-1",
                        field.type === "textarea" && "md:col-span-2"
                      )}
                    >
                      <label className="text-sm font-medium text-text-primary flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>

                      {field.type === "text" && (
                        <input
                          type="text"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          className="input w-full text-sm"
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="input w-full text-sm resize-none"
                        />
                      )}

                      {field.type === "date" && (
                        <input
                          type="date"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="input w-full text-sm"
                        />
                      )}

                      {field.type === "number" && (
                        <input
                          type="number"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          className="input w-full text-sm"
                        />
                      )}

                      {field.type === "currency" && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">₱</span>
                          <input
                            type="text"
                            value={formData[field.name] || ""}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            placeholder="0.00"
                            className="input w-full text-sm pl-7"
                          />
                        </div>
                      )}

                      {field.type === "select" && field.options && (
                        <select
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="input w-full text-sm"
                        >
                          <option value="">Select...</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.hint && (
                        <p className="text-xs text-text-tertiary">{field.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Preview Section */}
          {showPreview && preview && (
            <div className="mt-6 border border-blue-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Document Preview
                </span>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
              <div
                className="max-h-64 overflow-auto p-4 bg-white text-[13px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-surface-secondary flex items-center justify-between">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Preview
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
