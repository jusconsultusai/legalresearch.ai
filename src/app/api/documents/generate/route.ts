import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion } from "@/lib/ai/llm";
import {
  DOCUMENT_TEMPLATES,
  type DocumentTemplateKey,
  type TemplateData,
  formatLegalHtml,
  wrapWithScPaperStyles,
} from "@/lib/documentFormats/scPaperRule";

/**
 * Smart jurisdiction detection and court mapping for Philippine legal documents.
 */
function getJurisdictionDetails(jurisdiction: string, userPrompt: string): {
  heading: string;
  courtType: string;
  branchInfo: string;
  cityProvince: string;
} {
  const prompt = (userPrompt || "").toLowerCase();
  const jurisdictionLower = jurisdiction.toLowerCase();

  // Detect specific court types from prompt
  let courtType = "REGIONAL TRIAL COURT";
  let branchInfo = "Branch ___";
  
  if (prompt.includes("supreme court") || prompt.includes("sc ")) {
    courtType = "SUPREME COURT";
    branchInfo = "En Banc / Division";
  } else if (prompt.includes("court of appeals") || prompt.includes("ca ")) {
    courtType = "COURT OF APPEALS";
    branchInfo = "_____ Division";
  } else if (prompt.includes("sandiganbayan")) {
    courtType = "SANDIGANBAYAN";
    branchInfo = "_____ Division";
  } else if (prompt.includes("court of tax appeals") || prompt.includes("cta")) {
    courtType = "COURT OF TAX APPEALS";
    branchInfo = "_____ Division";
  } else if (prompt.includes("municipal trial court") || prompt.includes("mtc ") || prompt.includes("mctc")) {
    courtType = "MUNICIPAL TRIAL COURT";
  } else if (prompt.includes("metropolitan trial court") || prompt.includes("metc")) {
    courtType = "METROPOLITAN TRIAL COURT";
  } else if (prompt.includes("municipal circuit") || prompt.includes("mctc")) {
    courtType = "MUNICIPAL CIRCUIT TRIAL COURT";
  } else if (prompt.includes("family court")) {
    courtType = "FAMILY COURT";
  } else if (prompt.includes("labor arbiter") || prompt.includes("nlrc") || prompt.includes("national labor")) {
    courtType = "NATIONAL LABOR RELATIONS COMMISSION";
    branchInfo = "Regional Arbitration Branch No. ___";
  } else if (prompt.includes("darab") || prompt.includes("agrarian")) {
    courtType = "DEPARTMENT OF AGRARIAN REFORM ADJUDICATION BOARD";
    branchInfo = "Regional Office No. ___";
  } else if (prompt.includes("ombudsman")) {
    courtType = "OFFICE OF THE OMBUDSMAN";
    branchInfo = "";
  } else if (prompt.includes("sec ") || prompt.includes("securities")) {
    courtType = "SECURITIES AND EXCHANGE COMMISSION";
    branchInfo = "";
  }

  // Detect city/province for branch assignment
  const cityMapping: Record<string, string> = {
    "quezon city": "Quezon City",
    "makati": "Makati City",
    "manila": "City of Manila",
    "pasig": "Pasig City",
    "taguig": "Taguig City",
    "mandaluyong": "Mandaluyong City",
    "pasay": "Pasay City",
    "parañaque": "Parañaque City",
    "paranaque": "Parañaque City",
    "caloocan": "Caloocan City",
    "las piñas": "Las Piñas City",
    "las pinas": "Las Piñas City",
    "muntinlupa": "Muntinlupa City",
    "marikina": "Marikina City",
    "san juan": "San Juan City",
    "valenzuela": "Valenzuela City",
    "malabon": "Malabon City",
    "navotas": "Navotas City",
    "pateros": "Pateros",
    "cebu city": "Cebu City",
    "cebu": "Cebu City",
    "davao city": "Davao City",
    "davao": "Davao City",
    "cagayan de oro": "Cagayan de Oro City",
    "zamboanga city": "Zamboanga City",
    "zamboanga": "Zamboanga City",
    "iloilo city": "Iloilo City",
    "iloilo": "Iloilo City",
    "bacolod city": "Bacolod City",
    "bacolod": "Bacolod City",
    "general santos": "General Santos City",
    "gensan": "General Santos City",
    "baguio city": "Baguio City",
    "baguio": "Baguio City",
    "angeles city": "Angeles City",
    "angeles": "Angeles City",
    "olongapo": "Olongapo City",
    "san fernando la union": "San Fernando City, La Union",
    "san fernando pampanga": "City of San Fernando, Pampanga",
    "laoag": "Laoag City",
    "vigan": "Vigan City",
    "tuguegarao": "Tuguegarao City",
    "batangas city": "Batangas City",
    "batangas": "Batangas City",
    "lucena": "Lucena City",
    "naga city": "Naga City",
    "naga": "Naga City",
    "legazpi": "Legazpi City",
    "tacloban": "Tacloban City",
    "ormoc": "Ormoc City",
    "dumaguete": "Dumaguete City",
    "tagbilaran": "Tagbilaran City",
    "puerto princesa": "Puerto Princesa City",
    "palawan": "Puerto Princesa City",
    "cotabato city": "Cotabato City",
    "cotabato": "Cotabato City",
    "butuan city": "Butuan City",
    "butuan": "Butuan City",
    "surigao": "Surigao City",
    "dipolog": "Dipolog City",
    "pagadian": "Pagadian City",
    "iligan city": "Iligan City",
    "iligan": "Iligan City",
    "marawi": "Marawi City",
    "kidapawan": "Kidapawan City",
    "koronadal": "Koronadal City",
    "tacurong": "Tacurong City",
    "antipolo": "Antipolo City",
    "cainta": "Cainta, Rizal",
    "taytay": "Taytay, Rizal",
    "biñan": "City of Biñan",
    "binan": "City of Biñan",
    "santa rosa": "City of Santa Rosa",
    "calamba": "Calamba City",
    "san pablo": "San Pablo City",
    "lipa": "Lipa City",
    "tarlac": "Tarlac City",
    "dagupan": "Dagupan City",
    "urdaneta": "Urdaneta City",
    "san carlos pangasinan": "San Carlos City, Pangasinan",
    "cabanatuan": "Cabanatuan City",
    "san jose nueva ecija": "San Jose City, Nueva Ecija",
    "meycauayan": "Meycauayan City",
    "malolos": "City of Malolos",
    "san jose del monte": "San Jose del Monte City",
  };

  let cityProvince = "";
  for (const [key, value] of Object.entries(cityMapping)) {
    if (prompt.includes(key) || jurisdictionLower.includes(key)) {
      cityProvince = value;
      break;
    }
  }

  // Default to jurisdiction if no city found
  if (!cityProvince) {
    if (jurisdictionLower.includes("metro manila") || jurisdictionLower.includes("ncr")) {
      cityProvince = "Metro Manila";
    } else if (jurisdictionLower.includes("philippines") || jurisdictionLower === "republic of the philippines") {
      cityProvince = "[City/Municipality]";
    } else {
      cityProvince = jurisdiction;
    }
  }

  const heading = "REPUBLIC OF THE PHILIPPINES";

  return {
    heading,
    courtType,
    branchInfo,
    cityProvince,
  };
}

/**
 * Build a dynamic system prompt that adapts to tone, style, and length parameters.
 */
function buildSystemPrompt(params: {
  documentType: string;
  tone: string;
  style: string;
  length: string;
  jurisdiction: string;
  userPrompt?: string;
}): string {
  const { documentType, tone, style, length, jurisdiction, userPrompt = "" } = params;

  const jurisdictionInfo = getJurisdictionDetails(jurisdiction, userPrompt);

  const toneInstructions: Record<string, string> = {
    formal: "Use formal, professional legal language with proper honorifics and courteous phrasing.",
    assertive: "Use strong, persuasive language emphasizing key arguments. Be direct and confident.",
    neutral: "Use balanced, objective language presenting facts without emotional appeals.",
    conciliatory: "Use cooperative, diplomatic language seeking mutual understanding and resolution.",
  };

  const styleInstructions: Record<string, string> = {
    standard: "Follow traditional Philippine legal document format with standard structure.",
    modern: "Use a contemporary, reader-friendly format while maintaining legal sufficiency.",
    concise: "Be brief and to the point. Avoid unnecessary verbosity while covering all essentials.",
    comprehensive: "Be thorough and detailed. Cover all possible angles and contingencies.",
  };

  const lengthInstructions: Record<string, string> = {
    short: "Keep the document concise: approximately 1-2 pages. Focus on essential elements only.",
    medium: "Create a standard-length document: approximately 3-5 pages with adequate detail.",
    long: "Produce a comprehensive document: approximately 6-10 pages with full elaboration.",
    detailed: "Generate an exhaustive document: 10+ pages covering every detail and contingency.",
  };

  return `You are JusConsultus AI, an expert Philippine legal document drafter. Generate a professional, complete ${documentType} that is fully compliant with Philippine law.

=== SMART JURISDICTION DETECTION ===
Based on the user's input, you have detected:
- Heading: ${jurisdictionInfo.heading}
- Court/Forum: ${jurisdictionInfo.courtType}
- Branch/Division: ${jurisdictionInfo.branchInfo}
- Location: ${jurisdictionInfo.cityProvince}

IMPORTANT: Always start court pleadings with the proper heading:

${jurisdictionInfo.heading}
${jurisdictionInfo.courtType}
${jurisdictionInfo.branchInfo}
${jurisdictionInfo.cityProvince}

For non-court documents (contracts, affidavits, notarial docs), use:
${jurisdictionInfo.heading}
[City/Municipality], [Province]

=== JURISDICTION ===
${jurisdiction}

=== TONE ===
${toneInstructions[tone] || toneInstructions.formal}

=== STYLE ===
${styleInstructions[style] || styleInstructions.standard}

=== LENGTH ===
${lengthInstructions[length] || lengthInstructions.medium}

=== FORMATTING RULES ===
- ALWAYS start with "REPUBLIC OF THE PHILIPPINES" as the first line for court documents
- Include proper caption with case number placeholder (Civil Case No. ___ or Criminal Case No. ___)
- Follow proper Philippine legal format (caption, numbered paragraphs, prayer, signatures)
- Comply with the Supreme Court Efficient Use of Paper Rule (A.M. No. 11-9-4-SC)
- For courts: Include proper branch designation based on detected city/municipality
- Use [BRACKET PLACEHOLDERS] ONLY for specific details that need to be filled in
- Cite relevant Philippine laws, Rules of Court, and jurisprudence where applicable
- Include Verification and Certification Against Forum Shopping if required for pleadings
- For contracts/agreements: Include proper venue clause matching the detected jurisdiction

=== JUDICIAL AFFIDAVIT RULE (A.M. No. 12-8-8-SC) ===
For Judicial Affidavits, strictly follow this format:
1. Start with proper caption (case number, court, parties)
2. Include: "JUDICIAL AFFIDAVIT OF [WITNESS NAME]"
3. Use Q&A format for direct examination questions
4. Number each question and answer consecutively (Q1, A1, Q2, A2, etc.)
5. Include attestation clause at the end
6. Include JURAT with notarial details
7. Required contents per Section 3:
   - Name, age, residence, occupation of witness
   - Name and address of lawyer who conducted examination
   - Place where affidavit was taken
   - A statement that affiant was fully apprised of duties to tell truth
   - Signature of witness over printed name
   - Signature of examining lawyer

=== DOCUMENT HEADING EXAMPLES ===
For Court Pleadings:
REPUBLIC OF THE PHILIPPINES
REGIONAL TRIAL COURT
Branch ___
${jurisdictionInfo.cityProvince}

For NLRC Cases:
REPUBLIC OF THE PHILIPPINES
NATIONAL LABOR RELATIONS COMMISSION
Regional Arbitration Branch No. ___
${jurisdictionInfo.cityProvince}

For Notarial Documents:
REPUBLIC OF THE PHILIPPINES)
${jurisdictionInfo.cityProvince}         ) S.S.

=== OUTPUT REQUIREMENTS ===
- Output ONLY the document content — no explanations, commentary, or metadata
- Start directly with the document heading "Republic of the Philippines" (title case)
- Generate a complete, ready-to-use document that can be filed or executed
- Fill in all details the user provides; use [PLACEHOLDER] only for truly unknown specifics
- Automatically detect and use the correct court/forum based on subject matter

=== HTML FORMATTING RULES (Pleading Structure - Font is User's Choice) ===
Generate HTML using this EXACT structural format (Legal paper, proper positioning):

1. COURT HEADING FORMAT (all centered):
   <p style="text-align: center;">Republic of the Philippines</p>
   <p style="text-align: center; font-weight: bold;">REGIONAL TRIAL COURT</p>
   <p style="text-align: center;">Second Judicial Region</p>
   <p style="text-align: center; font-weight: bold;">Branch ___</p>
   <p style="text-align: center;">Quezon City</p>

2. CASE CAPTION FORMAT:
   - Plaintiff name: left side, BOLD, ALL CAPS
   - "Plaintiff," designation: indented with tabs, ITALIC
   - "--- versus ---": indented (NOT centered)
   - Case number & For: right side, BOLD
   - "x---x" separator at bottom
   Example:
   <p style="font-weight: bold;">JUAN DELA CRUZ</p>
   <p style="text-indent: 144px; font-style: italic;">Plaintiff,</p>
   <p></p>
   <p style="text-indent: 144px;">--- versus ---</p>
   <p style="text-align: right; font-weight: bold;">Civil Case No. ___________</p>
   <p style="text-align: right; font-weight: bold;">For: COLLECTION OF SUM OF MONEY</p>
   <p></p>
   <p style="font-weight: bold;">PEDRO SANTOS</p>
   <p style="text-indent: 144px; font-style: italic;">Defendant.</p>
   <p>x-----------------------------------x</p>

3. DOCUMENT TITLE:
   - CENTERED, BOLD, with letter-spacing
   - Title in ALL CAPS
   Example:
   <p style="text-align: center; font-weight: bold; letter-spacing: 0.3em;">C O M P L A I N T</p>
   <p style="text-align: center; font-weight: bold; letter-spacing: 0.3em;">M O T I O N</p>

4. BODY PARAGRAPHS:
   - First-line indent of 36px (0.5 inch)
   - Justified text alignment
   - 1.5 line spacing (handled automatically)
   Example:
   <p style="text-indent: 36px; text-align: justify;">COMES NOW, Plaintiff, through the undersigned counsel...</p>

5. NUMBERED PARAGRAPHS:
   - Number at start, followed by content
   - Justified, first-line indent
   Example:
   <p style="text-indent: 36px; text-align: justify;">1. Plaintiff is of legal age...</p>

6. BLOCKQUOTES (for citations):
   - Indented from both margins
   - Single line spacing
   Example:
   <blockquote>Quoted jurisprudence or statutory provision...</blockquote>

7. PRAYER SECTION:
   - "PRAYER" centered, bold
   - "WHEREFORE" in paragraph, bold
   Example:
   <p style="text-align: center; font-weight: bold;">P R A Y E R</p>
   <p style="text-indent: 36px; text-align: justify;"><strong>WHEREFORE</strong>, premises considered...</p>

8. SIGNATURE BLOCKS:
   - "Respectfully submitted." left with indent
   - Attorney info right-aligned
   Example:
   <p style="text-indent: 36px;">Respectfully submitted.</p>
   <p style="text-align: right; margin-top: 24px;"><strong>ATTY. [NAME]</strong></p>
   <p style="text-align: right;">Counsel for Plaintiff</p>
   <p style="text-align: right;">[Address]</p>`;
}

/**
 * Build a structured user prompt that incorporates all user inputs accurately.
 */
function buildUserPrompt(params: {
  documentType: string;
  userInstructions: string;
  tone: string;
  style: string;
  length: string;
  jurisdiction: string;
  title?: string;
  additionalDetails: Record<string, unknown>;
}): string {
  const { documentType, userInstructions, tone, style, length, jurisdiction, title, additionalDetails } = params;

  // Extract any additional context provided
  const detailsText = Object.entries(additionalDetails)
    .filter(([k, v]) => v && k !== "prompt" && k !== "jurisdiction" && k !== "title")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  let prompt = `Generate a ${documentType}`;
  
  if (title) {
    prompt += ` titled "${title}"`;
  }

  prompt += `.\n\n=== USER INSTRUCTIONS ===\n${userInstructions || "Generate a standard document with appropriate placeholders for missing details."}`;

  prompt += `\n\n=== PARAMETERS ===
- Document Type: ${documentType}
- Jurisdiction: ${jurisdiction}
- Tone: ${tone}
- Style: ${style}
- Target Length: ${length}`;

  if (detailsText) {
    prompt += `\n\n=== ADDITIONAL DETAILS ===\n${detailsText}`;
  }

  prompt += `\n\nGenerate the complete document now, following all instructions and parameters precisely.`;

  return prompt;
}

// Map AI template IDs to local template keys
const TEMPLATE_KEY_MAP: Record<string, DocumentTemplateKey> = {
  complaint: "complaint",
  answer: "answer",
  motion: "motion",
  "motion-dismiss": "motion",
  "motion-summary": "motion",
  reply: "motion",
  demurrer: "motion",
  memorandum: "memorandum",
  "counter-affidavit": "counterAffidavit",
  "motion-quash": "motion",
  "bail-petition": "petition",
  "motion-reconsideration": "motion",
  "motion-reinvestigation": "motion",
  "admin-complaint": "affidavit",
  "answer-admin": "answer",
  "position-paper": "memorandum",
  "petition-review": "petition",
  contract: "contract",
  nda: "nda",
  lease: "lease",
  deed: "deed",
  spa: "spa",
  employment: "contract",
  "demand-letter": "demandLetter",
  "cease-desist": "demandLetter",
  affidavit: "affidavit",
  "affidavit-loss": "affidavit",
  "affidavit-support": "affidavit",
  "affidavit-service": "affidavit",
  "judicial-affidavit": "affidavit",
  "board-resolution": "boardResolution",
  bylaws: "boardResolution",
  minutes: "boardResolution",
  incorporation: "boardResolution",
  "secretary-cert": "affidavit",
  // Additional mappings for common variations
  "complaint-affidavit": "complaint",
  "contract-service": "contract",
  "contract-lease": "lease",
  "deed-sale": "deed",
  moa: "contract",
  mou: "contract",
  "employment-contract": "contract",
  "articles-inc": "boardResolution",
  "board-resolution": "boardResolution",
  "secretary-cert": "affidavit",
  gis: "boardResolution",
  "position-paper": "memorandum",
  appeal: "petition",
  jurat: "affidavit",
  gpa: "spa",
};

// Generate via AI API with local template fallback
async function generateDocument(params: {
  documentType: string;
  details: TemplateData;
  tone: string;
  style: string;
  length: string;
  jurisdiction: string;
  title?: string;
}): Promise<string> {
  const { documentType, details, tone, style, length, jurisdiction, title } = params;
  const typeKey = documentType.toLowerCase().replace(/\s+/g, "-");

  // Extract user prompt for smart jurisdiction detection
  const userInstructions = details.prompt || "";

  // Try DeepSeek / LLM generation first
  try {
    const systemPrompt = buildSystemPrompt({
      documentType,
      tone,
      style,
      length,
      jurisdiction,
      userPrompt: userInstructions,
    });

    const userPrompt = buildUserPrompt({
      documentType,
      userInstructions: details.prompt || "",
      tone,
      style,
      length,
      jurisdiction,
      title,
      additionalDetails: details,
    });

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    // Adjust maxTokens based on length parameter
    const tokenMap: Record<string, number> = {
      short: 2000,
      medium: 4000,
      long: 6000,
      detailed: 8000,
    };
    const maxTokens = tokenMap[length] || 4000;

    const aiContent = await generateCompletion(messages, { 
      maxTokens, 
      temperature: tone === "assertive" ? 0.4 : 0.3 
    });

    if (aiContent && aiContent.length > 100) {
      // If AI returned HTML (contains <p> or <div> tags), use as-is with wrapper
      if (/<(p|div|span|br|strong|em)\s*[^>]*>/i.test(aiContent)) {
        return wrapWithScPaperStyles(aiContent);
      }
      // Otherwise format plain text using SC Paper Rule formatter
      return wrapWithScPaperStyles(formatLegalHtml(aiContent, true));
    }
  } catch (err) {
    console.error("AI generation error, falling back to local template:", err);
  }

  // Fall back to local templates - format the plain text output
  const localKey = TEMPLATE_KEY_MAP[typeKey] || TEMPLATE_KEY_MAP[documentType] || null;
  if (localKey && DOCUMENT_TEMPLATES[localKey]) {
    const rawContent = DOCUMENT_TEMPLATES[localKey](details);
    return wrapWithScPaperStyles(formatLegalHtml(rawContent, true));
  }

  // Generic fallback
  const fallbackContent = `${documentType.toUpperCase()}

[Generated: ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}]
[Jurisdiction: ${jurisdiction}]

CONTENTS:

[This is a template for a ${documentType}.]
[Please replace all [BRACKETED] items with the appropriate information.]
[Ensure compliance with Philippine legal requirements and the Rules of Court.]

---

This document was generated by JusConsultus AI as a starting template.
Please review and edit all content before use.
Consult a licensed Philippine attorney for legal advice.`;

  return wrapWithScPaperStyles(formatLegalHtml(fallbackContent, false));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      documentType, 
      templateId, 
      details, 
      tone = "formal", 
      style = "standard",
      length = "medium", 
      jurisdiction = "Republic of the Philippines", 
      prompt: userPrompt,
      title: documentTitle,
    } = body;

    const docType = documentType || templateId || "legal document";

    const detailsObj: TemplateData = {
      ...(typeof details === "object" ? details : {}),
      jurisdiction,
      prompt: details?.prompt || userPrompt || "",
    };

    const content = await generateDocument({
      documentType: docType,
      details: detailsObj,
      tone,
      style,
      length,
      jurisdiction,
      title: documentTitle || details?.title,
    });

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Document generate API error:", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}
