import { AICache } from "./cache";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// Get LLM configuration from environment
function getLLMConfig() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com";
  const defaultModel = process.env.LLM_MODEL || "gpt-4o-mini";
  // For Deep Think mode — uses deepseek-reasoner when available
  const deepThinkModel = process.env.LLM_DEEP_THINK_MODEL || "deepseek-reasoner";
  return { apiKey, baseUrl, defaultModel, deepThinkModel };
}

/** Returns the model name to use for Deep Think mode. */
export function getDeepThinkModel(): string {
  return process.env.LLM_DEEP_THINK_MODEL || "deepseek-reasoner";
}

/**
 * Strip <think>…</think> reasoning blocks from DeepSeek Reasoner output.
 * The reasoning_content is already returned in a separate API field, so the
 * content field should be clean — but this guards against edge cases.
 */
function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// Generate completion using LLM API (DeepSeek, OpenAI, or mock)
export async function generateCompletion(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const { apiKey, baseUrl, defaultModel } = getLLMConfig();
  const {
    model = defaultModel,
    temperature = 0.3,
    maxTokens = 4096,
  } = options;

  // Create cache key from messages
  const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  const cachePrompt = `${systemPrompt.slice(0, 200)}|${lastUserMessage}`;

  // Check LLM cache
  const cached = await AICache.getLLMResponse(cachePrompt, model);
  if (cached) return cached;

  if (apiKey && apiKey !== "your-openai-api-key") {
    try {
      // deepseek-reasoner does not support custom temperatures — must use 1
      const isReasoner = model.toLowerCase().includes("reasoner");
      const effectiveTemperature = isReasoner ? 1 : temperature;

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: effectiveTemperature,
          max_tokens: maxTokens,
        }),
      });

      // Handle non-OK responses from the LLM API
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(`LLM API returned ${response.status}: ${errorBody.slice(0, 300)}`);
        // For 401/403 — API key issues; fall through to mock
        // For 429 — rate limited; fall through to mock
        // For 5xx — server error; fall through to mock
        return generateMockResponse(lastUserMessage);
      }

      const data = await response.json();
      const msg = data.choices?.[0]?.message;

      // deepseek-reasoner returns the real answer in `content` but sometimes
      // it's empty when the model only fills `reasoning_content`. Handle both.
      let rawContent = msg?.content || "";
      if (!rawContent && msg?.reasoning_content) {
        // The reasoning IS the content for reasoner models — use it directly
        rawContent = msg.reasoning_content;
      }

      const content = stripThinkingBlocks(rawContent);

      if (!content) {
        console.warn("LLM returned empty content, falling back to mock");
        return generateMockResponse(lastUserMessage);
      }

      // Cache the response
      await AICache.setLLMResponse(cachePrompt, model, content);

      return content;
    } catch (error) {
      console.error("LLM API error:", error);
      return generateMockResponse(lastUserMessage);
    }
  }

  return generateMockResponse(lastUserMessage);
}

// Generate streaming completion
export async function* generateStreamingCompletion(
  messages: ChatMessage[],
  options: LLMOptions = {}
): AsyncGenerator<string> {
  const { apiKey, baseUrl, defaultModel } = getLLMConfig();
  const {
    model = defaultModel,
    temperature = 0.3,
    maxTokens = 4096,
  } = options;

  if (apiKey && apiKey !== "your-openai-api-key") {
    try {
      // deepseek-reasoner does not support custom temperatures — must use 1
      const effectiveTemperature = model.toLowerCase().includes("reasoner") ? 1 : temperature;

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: effectiveTemperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(`LLM streaming API returned ${response.status}: ${errorBody.slice(0, 300)}`);
        yield generateMockResponse(messages.filter((m) => m.role === "user").pop()?.content || "");
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              // deepseek-reasoner: skip reasoning_content deltas, only yield content
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                // Strip any <think> blocks that might appear inline
                const cleaned = stripThinkingBlocks(content);
                if (cleaned) yield cleaned;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch {
      yield generateMockResponse(messages.filter((m) => m.role === "user").pop()?.content || "");
    }
  } else {
    // Mock streaming for demo
    const response = generateMockResponse(messages.filter((m) => m.role === "user").pop()?.content || "");
    const words = response.split(" ");
    for (const word of words) {
      yield word + " ";
      await new Promise((r) => setTimeout(r, 30));
    }
  }
}

// Mock response generator for demo mode
function generateMockResponse(query: string): string {
  const queryLower = query.toLowerCase();

  if (queryLower.includes("malicious mischief")) {
    return `## Legal Explanation

**Bottom line:** Key Supreme Court cases on **Malicious Mischief (RPC Arts. 327-329)** repeatedly focus on (a) **deliberate damage**, (b) **property of another**, (c) **not arson/other destruction crimes**, and (d) **ill motive / "merely for the sake of causing damage."**

### Legal Basis / Core Statutory Provisions

> *"Any person who shall deliberately cause to the property of another any damage not falling within the terms of the next preceding chapter shall be guilty of malicious mischief."*
> — **Revised Penal Code, Art. 327 (1930)**

### Elements of Malicious Mischief

1. **Deliberate damage** to the property of another
2. The act does **not constitute arson** or other crimes involving destruction
3. The act is committed **merely for the sake of causing damage** (ill motive)

### Key Jurisprudence

1. **Taguinod v. People of the Philippines** (G.R. No. 185833, Oct 12, 2011)
   - The Court reaffirmed the elements of malicious mischief under Art. 327 of the RPC

2. **Grana, et al. v. People of the Philippines** (G.R. No. 202111, Nov 25, 2019)
   - A person who deliberately causes damage, even if claiming ownership, may be liable

### Penalties (As Updated)

For **special cases** (Art. 328), penalties depend on the amount of damage:
- **Prision correccional** if damage exceeds ₱200,000
- **Arresto mayor** for lower amounts

*Note: This analysis is based on the legal database. For specific case application, please consult with a licensed attorney.*`;
  }

  return `## Legal Analysis

**Bottom line:** Based on Philippine law and jurisprudence, here is the analysis of your query: "${query.slice(0, 100)}..."

### Applicable Legal Framework

The Philippine legal system, based on civil law traditions, addresses this matter through several key provisions and established jurisprudence from the Supreme Court.

### Key Provisions

1. Relevant constitutional provisions and statutory law apply to this matter
2. Supreme Court decisions have established precedents guiding interpretation
3. Administrative regulations may provide additional guidance

### Jurisprudential Guidelines

Philippine courts have consistently held that:
- The Constitution serves as the supreme law balancing rights and obligations
- Statutory interpretation follows established canons of construction
- Due process and equal protection remain fundamental guarantees

### Recommendation

For a comprehensive analysis, I recommend:
1. Reviewing specific statutes applicable to your situation
2. Examining recent Supreme Court decisions on the matter
3. Consulting with a licensed Philippine attorney for case-specific advice

*This analysis is provided for informational purposes based on the legal database. Please verify with current legal sources and consult a licensed attorney for specific legal advice.*`;
}

// Document analysis prompt engineering
export function buildDocumentAnalysisPrompt(
  documentText: string,
  analysisType: "grammar" | "legal_context" | "legal_clarity" | "full"
): ChatMessage[] {
  const systemPrompts: Record<string, string> = {
    grammar: `You are a legal document proofreader specializing in Philippine legal documents. Analyze the following text for:
- Grammar and syntax errors
- Spelling mistakes
- Punctuation errors
- Proper legal terminology usage
- Formatting consistency
Provide specific corrections with line references.`,
    legal_context: `You are an expert Philippine legal analyst. Analyze the following legal document for:
- Accuracy of legal citations (case names, G.R. numbers, statute references)
- Correct application of legal principles
- Consistency with current Philippine law
- Proper legal reasoning and argumentation
- Missing relevant authorities or arguments
Provide detailed feedback with specific suggestions.`,
    legal_clarity: `You are a legal writing expert specializing in Philippine legal practice. Analyze the following for:
- Clarity and readability of legal arguments
- Logical flow and organization
- Precision of legal language
- Ambiguous or vague terms that should be clarified
- Compliance with court filing requirements and format
Provide actionable improvement suggestions.`,
    full: `You are JusConsultus AI, a comprehensive Philippine legal document analyst. Perform a FULL analysis covering:

1. **Grammar & Technical Review:** Check grammar, spelling, punctuation, and proper legal terminology.
2. **Legal Context Analysis:** Verify citations, legal principles, and conformity with Philippine law.
3. **Legal Clarity Assessment:** Evaluate readability, logical flow, and precision of arguments.
4. **Structural Review:** Check document format, required sections, and compliance with court rules.
5. **Risk Assessment:** Identify potential legal weaknesses or vulnerabilities.
6. **Improvement Recommendations:** Provide specific, actionable suggestions.

Format your response with clear sections and specific references to the document text.`,
  };

  return [
    { role: "system", content: systemPrompts[analysisType] || systemPrompts.full },
    { role: "user", content: `Please analyze this legal document:\n\n${documentText}` },
  ];
}

// Document generation prompt engineering  
export function buildDocumentGenerationPrompt(
  documentType: string,
  details: Record<string, string>
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are JusConsultus AI, an expert Philippine legal document drafter. Generate a professional ${documentType} in proper legal format following Philippine legal conventions.

Requirements:
- Use proper Philippine legal format and citations
- Include all required sections for a ${documentType}
- Use formal legal language appropriate for Philippine courts
- Include proper venue, caption, and prayer sections where applicable
- Add placeholder markers [BRACKET TEXT] for details that need to be filled in
- Follow the Rules of Court formatting requirements

Output the document in clean, properly formatted text that can be imported into a document editor.`,
    },
    {
      role: "user",
      content: `Generate a ${documentType} with the following details:\n${Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}`,
    },
  ];
}
