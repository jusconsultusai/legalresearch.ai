import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion } from "@/lib/ai/llm";
import {
  DOCUMENT_TEMPLATES,
  type DocumentTemplateKey,
  type TemplateData,
} from "@/lib/documentFormats/scPaperRule";

/**
 * Build a dynamic system prompt that adapts to tone, style, and length parameters.
 */
function buildSystemPrompt(params: {
  documentType: string;
  tone: string;
  style: string;
  length: string;
  jurisdiction: string;
}): string {
  const { documentType, tone, style, length, jurisdiction } = params;

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

=== JURISDICTION ===
${jurisdiction}

=== TONE ===
${toneInstructions[tone] || toneInstructions.formal}

=== STYLE ===
${styleInstructions[style] || styleInstructions.standard}

=== LENGTH ===
${lengthInstructions[length] || lengthInstructions.medium}

=== FORMATTING RULES ===
- Follow proper Philippine legal format (caption, numbered paragraphs, prayer, signatures)
- Comply with the Supreme Court Efficient Use of Paper Rule (A.M. No. 11-9-4-SC)
- For courts: Include proper caption, case number placeholder, branch designation
- Use [BRACKET PLACEHOLDERS] ONLY for specific details that need to be filled in
- Cite relevant Philippine laws, Rules of Court, and jurisprudence where applicable
- Include Verification and Certification Against Forum Shopping if required

=== OUTPUT REQUIREMENTS ===
- Output ONLY the document content — no explanations, commentary, or metadata
- Start directly with the document (e.g., "REPUBLIC OF THE PHILIPPINES" or the first section)
- Generate a complete, ready-to-use document that can be filed or executed
- Fill in all details the user provides; use [PLACEHOLDER] only for truly unknown specifics`;
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

  // Try DeepSeek / LLM generation first
  try {
    const systemPrompt = buildSystemPrompt({
      documentType,
      tone,
      style,
      length,
      jurisdiction,
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
      return aiContent;
    }
  } catch (err) {
    console.error("AI generation error, falling back to local template:", err);
  }

  // Fall back to local templates
  const localKey = TEMPLATE_KEY_MAP[typeKey] || TEMPLATE_KEY_MAP[documentType] || null;
  if (localKey && DOCUMENT_TEMPLATES[localKey]) {
    return DOCUMENT_TEMPLATES[localKey](details);
  }

  // Generic fallback
  return `${documentType.toUpperCase()}

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
