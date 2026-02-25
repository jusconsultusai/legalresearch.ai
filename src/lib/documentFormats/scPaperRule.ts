// Supreme Court Efficient Use of Paper Rule (A.M. No. 11-9-4-SC)
// JusConsultus AI - Legal Document Format Standards
// Imported & adapted from reference implementation

export const SC_PAPER_RULE = {
  citation: "A.M. No. 11-9-4-SC",
  effectiveDate: "January 1, 2013",
  description: "A.M. No. 11-9-4-SC (Efficient Use of Paper Rule)",
  paperSize: { width: 8.5, height: 13, label: 'Legal (8.5" × 13")' },
  margins: { left: 1.5, top: 1.2, right: 1, bottom: 1 },
  typography: { fontFamily: "Arial", fontSize: 14, lineSpacing: 1, lineHeight: "1.5", paragraphSpacing: 0.1, firstLineIndent: "0.5in" },
};

// Pixel dimensions at 96 DPI for screen rendering
const DPI = 96;
export const SC_PAPER_PIXELS = {
  width: SC_PAPER_RULE.paperSize.width * DPI,     // 816px
  height: SC_PAPER_RULE.paperSize.height * DPI,    // 1248px
  marginLeft: SC_PAPER_RULE.margins.left * DPI,    // 144px
  marginRight: SC_PAPER_RULE.margins.right * DPI,  // 96px
  marginTop: SC_PAPER_RULE.margins.top * DPI,      // 115.2px
  marginBottom: SC_PAPER_RULE.margins.bottom * DPI, // 96px
};

// Pleading template identifiers (used by LegalTemplatesPanel)
// Note: initialized after DOCUMENT_TEMPLATES is defined below
export let PLEADING_TEMPLATES: string[] = [];

// ============================================================
// LOCAL DOCUMENT TEMPLATES (Philippine Legal Format)
// ============================================================

export type DocumentTemplateKey =
  | "complaint" | "answer" | "motion" | "affidavit" | "contract"
  | "demandLetter" | "spa" | "deed" | "memorandum" | "boardResolution"
  | "nda" | "lease" | "petition" | "informationCriminal" | "counterAffidavit";

export interface TemplateData {
  [key: string]: string | undefined;
}

const today = () => new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

function complaint(d: TemplateData = {}): string {
  return `REPUBLIC OF THE PHILIPPINES
${d.court || "REGIONAL TRIAL COURT"}
${d.branch || "Branch [___]"}
${d.location || "[City/Municipality]"}

${d.plaintiffName || "[PLAINTIFF NAME]"},
                    Plaintiff,

          - versus -                      Civil Case No. ${d.caseNumber || "[_____]"}
                                          For: ${d.caseType || "[Nature of Action]"}

${d.defendantName || "[DEFENDANT NAME]"},
                    Defendant.
x - - - - - - - - - - - - - - - - - - - - - - - x

                                    COMPLAINT

PLAINTIFF, by counsel, most respectfully states:

                                   THE PARTIES

1. Plaintiff ${d.plaintiffName || "[PLAINTIFF NAME]"} is of legal age, ${d.plaintiffCivilStatus || "[civil status]"}, Filipino, and a resident of ${d.plaintiffAddress || "[complete address]"}.

2. Defendant ${d.defendantName || "[DEFENDANT NAME]"} is of legal age, ${d.defendantCivilStatus || "[civil status]"}, Filipino, and a resident of ${d.defendantAddress || "[complete address]"}.

                                CAUSE OF ACTION

3. ${d.causeOfAction || "[State the facts constituting the cause of action in ordinary and concise language]"}

4. [Continue with factual allegations...]

5. [State how defendant violated plaintiff's rights...]

                                 PRAYER

WHEREFORE, premises considered, plaintiff respectfully prays for judgment:

1. Ordering defendant to pay actual damages of PHP ${d.actualDamages || "[_____]"};
2. Ordering defendant to pay moral damages of PHP ${d.moralDamages || "[_____]"};
3. Ordering defendant to pay attorney's fees of PHP ${d.attorneysFees || "[_____]"};
4. Costs of suit.

Other reliefs just and equitable are likewise prayed for.

${d.location || "[City]"}, Philippines, ${today()}.

                                          ${d.counselName || "[COUNSEL NAME]"}
                                          Counsel for Plaintiff
                                          ${d.counselAddress || "[Office Address]"}
                                          IBP No. ${d.ibpNumber || "[_____]"}
                                          PTR No. ${d.ptrNumber || "[_____]"}
                                          Roll No. ${d.rollNumber || "[_____]"}
                                          MCLE Compliance No. ${d.mcleNumber || "[_____]"}

---

VERIFICATION

I, ${d.plaintiffName || "[PLAINTIFF NAME]"}, under oath, depose and say that I am the plaintiff; I caused the preparation of the foregoing Complaint; the allegations therein are true and correct of my personal knowledge or based on authentic records; I have not commenced a similar action in any other court or tribunal.

________________________________________
${d.plaintiffName || "[PLAINTIFF NAME]"}
Affiant

SUBSCRIBED AND SWORN to before me this _____ day of ___________, 20___.

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.

________________________________________
Notary Public`;
}

function answer(d: TemplateData = {}): string {
  return `REPUBLIC OF THE PHILIPPINES
${d.court || "REGIONAL TRIAL COURT"}
${d.branch || "Branch [___]"}
${d.location || "[City/Municipality]"}

${d.plaintiffName || "[PLAINTIFF NAME]"},
                    Plaintiff,

          - versus -                      Civil Case No. ${d.caseNumber || "[_____]"}

${d.defendantName || "[DEFENDANT NAME]"},
                    Defendant.
x - - - - - - - - - - - - - - - - - - - - - - - x

                                      ANSWER

DEFENDANT, by counsel, most respectfully answers the Complaint as follows:

                      SPECIAL AND AFFIRMATIVE DEFENSES

1. The Complaint states no cause of action against defendant.

2. [State other affirmative defenses...]

                               SPECIFIC DENIALS

3. Defendant specifically denies [allegations in paragraph __] for being false. The truth is: ${d.denial || "[state the facts]"}.

4. Defendant denies [allegations in paragraph __] for lack of knowledge sufficient to form a belief.

                               COMPULSORY COUNTERCLAIM

5. By counterclaim, defendant alleges: [state facts].

                                     PRAYER

WHEREFORE, defendant prays that the Complaint be DISMISSED for lack of merit, and on the counterclaim, plaintiff be ordered to pay:

1. PHP [amount] as moral damages;
2. PHP [amount] as attorney's fees;
3. Costs of suit.

${d.location || "[City]"}, Philippines, ${today()}.

                                          ${d.counselName || "[COUNSEL NAME]"}
                                          Counsel for Defendant`;
}

function motion(d: TemplateData = {}): string {
  return `REPUBLIC OF THE PHILIPPINES
${d.court || "REGIONAL TRIAL COURT"}
${d.branch || "Branch [___]"}
${d.location || "[City/Municipality]"}

${d.plaintiffName || "[PLAINTIFF NAME]"},
                    Plaintiff,

          - versus -                      Civil Case No. ${d.caseNumber || "[_____]"}

${d.defendantName || "[DEFENDANT NAME]"},
                    Defendant.
x - - - - - - - - - - - - - - - - - - - - - - - x

                  MOTION ${d.motionType || "[FOR (TYPE OF RELIEF)]"}

${d.movantType || "[MOVANT]"}, by counsel, most respectfully states:

1. [State the procedural history]

2. [State grounds for the motion with legal basis]

3. [Cite applicable Rules of Court provisions or jurisprudence]

                                     PRAYER

WHEREFORE, ${d.movantType?.toLowerCase() || "movant"} prays that the instant Motion be GRANTED.

${d.location || "[City]"}, Philippines, ${today()}.

                                          ${d.counselName || "[COUNSEL NAME]"}
                                          Counsel for ${d.movantType || "Movant"}

NOTICE OF HEARING

TO: ${d.opposingCounsel || "[OPPOSING COUNSEL]"}, Counsel for ${d.movantType === "Plaintiff" ? "Defendant" : "Plaintiff"}, ${d.opposingAddress || "[Address]"}

Please take notice that the foregoing Motion shall be submitted for the Court's consideration on __________, 20___ at ____:____.

Copy furnished: ${d.opposingCounsel || "[Opposing Counsel]"}`;
}

function affidavit(d: TemplateData = {}): string {
  return `REPUBLIC OF THE PHILIPPINES)
${d.location || "[City/Municipality]"}       ) S.S.
                                    )

                  AFFIDAVIT OF ${d.affidavitType?.toUpperCase() || "[TYPE]"}

I, ${d.affiantName || "[AFFIANT NAME]"}, of legal age, ${d.civilStatus || "[civil status]"}, Filipino, resident of ${d.address || "[complete address]"}, after having been duly sworn, depose and say:

1. ${d.statement1 || "[First statement of facts]"}

2. ${d.statement2 || "[Second statement of facts]"}

3. ${d.statement3 || "[Continue with additional statements...]"}

4. I execute this Affidavit to attest to the truth of the foregoing statements and for ${d.purpose || "[state purpose]"}.

IN WITNESS WHEREOF, I set my hand this _____ day of ___________, 20___ in ${d.location || "[City]"}, Philippines.

________________________________________
${d.affiantName || "[AFFIANT NAME]"}
Affiant

SUBSCRIBED AND SWORN to before me this _____ day of ___________, 20___, affiant exhibiting [ID Type] No. [ID Number] issued on [Date] at [Place].

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.

________________________________________
Notary Public`;
}

function contract(d: TemplateData = {}): string {
  return `                         CONTRACT OF AGREEMENT

KNOW ALL MEN BY THESE PRESENTS:

This CONTRACT is entered into this _____ day of ___________, 20___ in ${d.location || "[City]"}, Philippines, by and between:

${d.party1Name || "[FIRST PARTY NAME]"}, of legal age, resident of ${d.party1Address || "[complete address]"}, hereinafter referred to as the "FIRST PARTY";

                                    - and -

${d.party2Name || "[SECOND PARTY NAME]"}, of legal age, resident of ${d.party2Address || "[complete address]"}, hereinafter referred to as the "SECOND PARTY";

                                  WITNESSETH

WHEREAS, ${d.whereas1 || "[State background/purpose of the agreement]"};

NOW, THEREFORE, for and in consideration of the foregoing and the mutual covenants herein, the parties agree:

1. SCOPE: ${d.scope || "[Describe scope of agreement]"}

2. TERM: From [start date] to [end date], unless sooner terminated.

3. OBLIGATIONS OF FIRST PARTY:
   a. [First obligation]
   b. [Second obligation]

4. OBLIGATIONS OF SECOND PARTY:
   a. [First obligation]
   b. [Second obligation]

5. CONSIDERATION: ${d.consideration || "[State payment/compensation terms]"}

6. TERMINATION: Either party may terminate with [number] days written notice.

7. CONFIDENTIALITY: Both parties maintain strict confidentiality of information disclosed.

8. GOVERNING LAW: This Agreement shall be governed by the laws of the Republic of the Philippines.

9. DISPUTE RESOLUTION: Disputes shall be settled amicably; if not, submitted to courts in ${d.location || "[City]"}.

IN WITNESS WHEREOF, the parties set their hands on the date and place above.

_________________________               _________________________
${d.party1Name || "[FIRST PARTY]"}                  ${d.party2Name || "[SECOND PARTY]"}

ACKNOWLEDGMENT

REPUBLIC OF THE PHILIPPINES) ${d.location || "[City]"} ) S.S.

BEFORE ME, Notary Public for ${d.location || "[City]"}, this _____ day of ___________, 20___, personally appeared the parties known to me to have executed this instrument of their free will.

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.
________________________________________
Notary Public`;
}

function demandLetter(d: TemplateData = {}): string {
  return `${d.senderName || "[YOUR NAME/FIRM]"}
${d.senderAddress || "[Address]"}
${d.senderContact || "[Tel. No.]"}
${d.senderEmail || "[Email]"}

${today()}

${d.recipientName || "[RECIPIENT NAME]"}
${d.recipientAddress || "[Address]"}

Dear ${d.recipientName || "[Recipient]"}:

                              DEMAND LETTER

We write on behalf of ${d.clientName || "our client"} regarding ${d.subject || "[subject matter]"}.

FACTS:

${d.facts || "[Describe the circumstances — relevant dates, agreements, and events that give rise to this demand]"}

LEGAL BASIS:

${d.legalBasis || "Under Article 1159 of the Civil Code, obligations arising from contracts must be complied with in good faith."}

DEMAND:

You are hereby formally demanded to:

1. ${d.demand1 || "Pay the principal amount of PHP _____"}
2. ${d.demand2 || "Pay interest at 6% per annum from [date of demand]"}
3. ${d.demand3 || "Pay attorney's fees of PHP _____"}

You are given FIFTEEN (15) DAYS from receipt to comply. Failure to do so shall constrain us to file the appropriate legal action without further notice.

Very truly yours,

________________________________________
${d.senderName || "[COUNSEL NAME]"}
${d.senderTitle || "Counsel for [Client]"}`;
}

function spa(d: TemplateData = {}): string {
  return `                      SPECIAL POWER OF ATTORNEY

KNOW ALL MEN BY THESE PRESENTS:

I, ${d.principalName || "[PRINCIPAL NAME]"}, of legal age, ${d.principalCivilStatus || "[civil status]"}, Filipino, residing at ${d.principalAddress || "[complete address]"}, do hereby NAME, CONSTITUTE and APPOINT:

${d.agentName || "[ATTORNEY-IN-FACT NAME]"}, of legal age, residing at ${d.agentAddress || "[complete address]"}

as my lawful Attorney-in-Fact to do and perform the following acts:

1. ${d.power1 || "[Specific power granted — e.g., To sell, transfer, convey a parcel of land...]"}

2. ${d.power2 || "[Second power — e.g., To sign all documents necessary for the above transaction...]"}

3. ${d.power3 || "[Additional power if any]"}

4. To do all acts incidental to the foregoing.

I hereby grant my Attorney-in-Fact full power and authority to perform all acts as I might do if personally present, with power of substitution, ratifying all acts by virtue hereof.

This SPA shall remain valid until ${d.validity || "[date/event of termination or written revocation]"}.

IN WITNESS WHEREOF, I set my hand this _____ day of ___________, 20___ in ${d.location || "[City]"}.

________________________________________
${d.principalName || "[PRINCIPAL NAME]"}
Principal

ACKNOWLEDGMENT — REPUBLIC OF THE PHILIPPINES) ${d.location || "[City]"} ) S.S.

BEFORE ME, Notary Public, this _____ day of ___________, 20___:
${d.principalName || "[Principal]"} — [ID Type] No. [ID Number] issued [Date] at [Place]

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.
________________________________________
Notary Public`;
}

function deed(d: TemplateData = {}): string {
  return `                        DEED OF ABSOLUTE SALE

KNOW ALL MEN BY THESE PRESENTS:

This DEED OF ABSOLUTE SALE is made in ${d.location || "[City]"}, Philippines, this _____ day of ___________, 20___, by and between:

${d.vendorName || "[VENDOR NAME]"}, resident of ${d.vendorAddress || "[complete address]"}, hereinafter the "VENDOR";
                                    - and -
${d.vendeeName || "[VENDEE NAME]"}, resident of ${d.vendeeAddress || "[complete address]"}, hereinafter the "VENDEE";

WHEREAS, the VENDOR is the absolute owner of a parcel of land located at ${d.propertyLocation || "[property location]"}, described as:

${d.propertyDescription || "[Technical description: TCT/OCT No., Lot No., Survey No., area, boundaries]"}

NOW, THEREFORE, for the sum of ${d.purchasePrice || "[AMOUNT IN WORDS] (PHP _____)"},  received from VENDEE, VENDOR absolutely SELLS, TRANSFERS, CONVEYS and DELIVERS the above property free from all liens and encumbrances.

VENDOR warrants: (1) lawful ownership; (2) right to sell; (3) freedom from encumbrances; (4) will defend VENDEE's title against all claims.

_________________________               _________________________
${d.vendorName || "[VENDOR]"} — Vendor          ${d.vendeeName || "[VENDEE]"} — Vendee

ACKNOWLEDGMENT — REPUBLIC OF THE PHILIPPINES) ${d.location || "[City]"} ) S.S.

BEFORE ME, Notary Public for ${d.location || "[City]"}, this _____ day of ___________, 20___, personally appeared the above parties.

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.
________________________________________
Notary Public`;
}

function memorandum(d: TemplateData = {}): string {
  return `REPUBLIC OF THE PHILIPPINES
${d.court || "REGIONAL TRIAL COURT"}
${d.branch || "Branch [___]"}
${d.location || "[City/Municipality]"}

${d.plaintiffName || "[PLAINTIFF NAME]"},
                    Plaintiff,

          - versus -                      Civil Case No. ${d.caseNumber || "[_____]"}

${d.defendantName || "[DEFENDANT NAME]"},
                    Defendant.
x - - - - - - - - - - - - - - - - - - - - - - - x

        MEMORANDUM FOR THE ${d.partyType?.toUpperCase() || "[PLAINTIFF/DEFENDANT]"}

${d.partyType || "[PLAINTIFF/DEFENDANT]"}, by counsel, respectfully submits this Memorandum:

                                   STATEMENT OF THE CASE

${d.caseHistory || "[Brief procedural history of the case]"}

                                   STATEMENT OF FACTS

${d.facts || "[Summarize the relevant facts establishing your client's position]"}

                                        ISSUES

I. ${d.issue1 || "[State the first issue to be resolved]"}
II. ${d.issue2 || "[State the second issue]"}

                                      ARGUMENTS

I. ${d.argument1 || "[First argument with supporting legal basis and jurisprudence]"}

II. ${d.argument2 || "[Second argument with supporting citations]"}

                                      CONCLUSION

Based on the foregoing, ${d.partyType?.toLowerCase() || "the party"} respectfully prays that judgment be rendered in their favor.

${d.location || "[City]"}, Philippines, ${today()}.

                                          ${d.counselName || "[COUNSEL NAME]"}
                                          Counsel`;
}

function boardResolution(d: TemplateData = {}): string {
  return `                            BOARD RESOLUTION

                    ${d.corporationName?.toUpperCase() || "[CORPORATION NAME]"}

RESOLUTION NO. ${d.resolutionNumber || "[___]"}, Series of ${new Date().getFullYear()}

RESOLVED, as it is hereby resolved, that ${d.resolution || "[state the resolution — e.g., the Corporation authorize its President to open a bank account with [Bank Name] and to sign all documents in connection therewith]"};

RESOLVED FURTHER, that the proper officers of the Corporation are hereby authorized and directed to sign and execute any and all documents or instruments necessary to effect the foregoing resolution;

RESOLVED FINALLY, that a certified copy of this resolution be furnished to the appropriate parties.

Passed and approved at a duly constituted meeting of the Board of Directors held on ${d.meetingDate || "[Date]"} at ${d.meetingLocation || "[Place]"}, with ${d.quorum || "a quorum present and voting"}.

________________________________________
${d.chairmanName || "[CHAIRMAN'S NAME]"}
Chairman of the Board

I HEREBY CERTIFY that the foregoing is a true and exact copy of the resolution duly adopted by the Board of Directors of ${d.corporationName || "[CORPORATION NAME]"} at its meeting held on ${d.meetingDate || "[Date]"}.

________________________________________
${d.secretaryName || "[CORPORATE SECRETARY NAME]"}
Corporate Secretary

SIGNED AND CERTIFIED on ${today()}.`;
}

function nda(d: TemplateData = {}): string {
  return `             NON-DISCLOSURE AGREEMENT (NDA)

This NON-DISCLOSURE AGREEMENT is entered into as of ${today()} by and between:

${d.disclosingParty || "[DISCLOSING PARTY NAME]"} ("Disclosing Party"); and
${d.receivingParty || "[RECEIVING PARTY NAME]"} ("Receiving Party").

1. CONFIDENTIAL INFORMATION: "Confidential Information" means any non-public information disclosed by the Disclosing Party, whether written, oral, or otherwise, relating to ${d.subject || "[describe subject matter of the NDA]"}.

2. OBLIGATIONS: The Receiving Party shall: (a) hold Confidential Information in strict confidence; (b) use it only for ${d.purpose || "[permitted purpose]"}; (c) not disclose it to third parties without prior written consent.

3. EXCLUSIONS: Obligations do not apply to information that: (a) is or becomes publicly known; (b) was rightfully known before disclosure; (c) is required to be disclosed by law.

4. TERM: This Agreement is effective for ${d.term || "two (2) years"} from the date of execution.

5. GOVERNING LAW: This Agreement shall be governed by the laws of the Philippines.

IN WITNESS WHEREOF, the parties execute this Agreement on the date above.

_________________________               _________________________
${d.disclosingParty || "[DISCLOSING PARTY]"}           ${d.receivingParty || "[RECEIVING PARTY]"}`;
}

function lease(d: TemplateData = {}): string {
  return `                         CONTRACT OF LEASE

This CONTRACT OF LEASE is entered into on ${today()} in ${d.location || "[City]"}, Philippines, by and between:

${d.lessorName || "[LESSOR NAME]"}, of legal age, resident of ${d.lessorAddress || "[address]"}, hereinafter the "LESSOR"; and

${d.lesseeName || "[LESSEE NAME]"}, of legal age, resident of ${d.lesseeAddress || "[address]"}, hereinafter the "LESSEE";

WITNESSETH:

1. PREMISES: Lessor leases to Lessee the property at ${d.propertyAddress || "[complete property address]"}.

2. TERM: This lease shall commence on ${d.startDate || "[Start Date]"} and end on ${d.endDate || "[End Date]"}, unless renewed.

3. RENT: The monthly rent is PHP ${d.monthlyRent || "[_____]"}, payable on or before the ${d.paymentDay || "5th"} day of each month.

4. DEPOSIT: Lessee shall pay a security deposit of PHP ${d.deposit || "[_____]"} (equivalent to [number] months' rent).

5. UTILITIES: ${d.utilities || "Lessee shall pay all utilities (electricity, water) consumed during the lease."}

6. REPAIRS & MAINTENANCE: Lessee shall maintain the premises in good condition. Minor repairs (under PHP 1,000) are at Lessee's expense.

7. SUBLETTING: Lessee shall not sublet or assign the premises without Lessor's written consent.

8. TERMINATION: Either party may terminate with 30 days written notice upon breach, subject to applicable law.

_________________________               _________________________
${d.lessorName || "[LESSOR]"}                       ${d.lesseeName || "[LESSEE]"}
Lessor                                       Lessee`;
}

// Template registry
export const DOCUMENT_TEMPLATES: Record<DocumentTemplateKey, (data?: TemplateData) => string> = {
  complaint,
  answer,
  motion,
  affidavit,
  contract,
  demandLetter,
  spa,
  deed,
  memorandum,
  boardResolution,
  nda,
  lease,
  petition: (d = {}) => motion({ ...d, motionType: "FOR [SPECIFY RELIEF]" }),
  informationCriminal: affidavit,
  counterAffidavit: affidavit,
};

// Initialize PLEADING_TEMPLATES now that DOCUMENT_TEMPLATES is defined
PLEADING_TEMPLATES = Object.keys(DOCUMENT_TEMPLATES);

export function getDocumentTemplate(key: DocumentTemplateKey, data?: TemplateData): string {
  const fn = DOCUMENT_TEMPLATES[key];
  return fn ? fn(data) : `[Template for ${key} not found]`;
}

export function getDocxStyles(): string {
  return `@page { size: 8.5in 13in; margin: ${SC_PAPER_RULE.margins.top}in ${SC_PAPER_RULE.margins.right}in ${SC_PAPER_RULE.margins.bottom}in ${SC_PAPER_RULE.margins.left}in; } body { font-family: Arial, sans-serif; font-size: ${SC_PAPER_RULE.typography.fontSize}pt; line-height: 1; text-align: justify; }`;
}

// AI Template Categories for the Drafting Modal
export const AI_TEMPLATE_CATEGORIES = {
  pleadings: {
    label: "Civil Pleadings",
    templates: [
      { id: "complaint", name: "Complaint", description: "Civil case initiation document" },
      { id: "answer", name: "Answer", description: "Response with affirmative defenses" },
      { id: "motion-dismiss", name: "Motion to Dismiss", description: "Challenge jurisdiction or cause" },
      { id: "motion-summary", name: "Motion for Summary Judgment", description: "Judgment without trial" },
      { id: "reply", name: "Reply", description: "Response to answer or counterclaim" },
      { id: "demurrer", name: "Demurrer to Evidence", description: "Motion for acquittal after prosecution rests" },
      { id: "memorandum", name: "Memorandum", description: "Legal brief summarizing arguments" },
    ],
  },
  criminal: {
    label: "Criminal Pleadings",
    templates: [
      { id: "counter-affidavit", name: "Counter-Affidavit", description: "Response to criminal complaint" },
      { id: "motion-quash", name: "Motion to Quash", description: "Challenge validity of information" },
      { id: "bail-petition", name: "Petition for Bail", description: "Request for provisional liberty" },
      { id: "motion-reconsideration", name: "Motion for Reconsideration", description: "Review of resolution/order" },
      { id: "motion-reinvestigation", name: "Motion for Reinvestigation", description: "Reopen preliminary investigation" },
    ],
  },
  administrative: {
    label: "Administrative Pleadings",
    templates: [
      { id: "admin-complaint", name: "Administrative Complaint", description: "Initiate administrative case" },
      { id: "answer-admin", name: "Answer (Administrative)", description: "Response to administrative charges" },
      { id: "position-paper", name: "Position Paper", description: "Summary of evidence and arguments" },
      { id: "petition-review", name: "Petition for Review", description: "Appeal administrative decision" },
    ],
  },
  contracts: {
    label: "Contracts & Agreements",
    templates: [
      { id: "contract", name: "Contract / Agreement", description: "General contract of agreement" },
      { id: "nda", name: "Non-Disclosure Agreement", description: "Confidentiality protection" },
      { id: "lease", name: "Lease Agreement", description: "Property rental contract" },
      { id: "deed", name: "Deed of Absolute Sale", description: "Real property sale" },
      { id: "spa", name: "Special Power of Attorney", description: "Authorize specific acts" },
      { id: "employment", name: "Employment Contract", description: "Employment terms and conditions" },
    ],
  },
  correspondence: {
    label: "Legal Correspondence",
    templates: [
      { id: "demand-letter", name: "Demand Letter", description: "Formal demand for action" },
      { id: "cease-desist", name: "Cease and Desist", description: "Stop infringing activity" },
      { id: "legal-opinion", name: "Legal Opinion", description: "Professional legal advice memo" },
      { id: "engagement-letter", name: "Engagement Letter", description: "Attorney-client agreement" },
    ],
  },
  corporate: {
    label: "Corporate Documents",
    templates: [
      { id: "board-resolution", name: "Board Resolution", description: "Corporate board decision" },
      { id: "bylaws", name: "Corporate Bylaws", description: "Company governance rules" },
      { id: "minutes", name: "Meeting Minutes", description: "Official meeting record" },
      { id: "incorporation", name: "Articles of Incorporation", description: "Company formation document" },
      { id: "secretary-cert", name: "Secretary's Certificate", description: "Certified corporate document" },
    ],
  },
  notarial: {
    label: "Notarial Documents",
    templates: [
      { id: "affidavit", name: "Affidavit", description: "General sworn statement" },
      { id: "affidavit-loss", name: "Affidavit of Loss", description: "Report loss of document" },
      { id: "affidavit-support", name: "Affidavit of Support", description: "Financial support declaration" },
      { id: "affidavit-service", name: "Affidavit of Service", description: "Proof of document service" },
    ],
  },
};

export const VERIFICATION_TEMPLATE = `
VERIFICATION

I, [NAME], of legal age, Filipino, resident of [ADDRESS], after being sworn, depose and say:

1. I am the [plaintiff/defendant/petitioner] in the above-entitled case;
2. I caused the preparation of the foregoing [DOCUMENT];
3. The allegations therein are true and correct of my personal knowledge or based on authentic records;
4. I have not commenced a similar action in any other court or tribunal.

__________________________________
[NAME]
Affiant

SUBSCRIBED AND SWORN to before me this _____ day of ___________, 20___.

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.
__________________________________
Notary Public
`;

export const CERTIFICATION_FORUM_SHOPPING_TEMPLATE = `
CERTIFICATION AGAINST FORUM SHOPPING

I, [NAME], [plaintiff/petitioner], after being sworn, certify:

1. I have not commenced any action involving the same issues in any court, tribunal, or agency;
2. If I learn of a similar action, I will report it to this Court within five (5) days;
3. I undertake to inform the Court of any change in address within five (5) days.

__________________________________
[NAME]

SUBSCRIBED AND SWORN to before me this _____ day of ___________, 20___.

Doc. No. _____; Page No. _____; Book No. _____; Series of 20___.
__________________________________
Notary Public
`;
