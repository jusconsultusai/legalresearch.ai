import { prisma } from "@/lib/db/prisma";
import { AICache } from "./cache";

export interface RAGResult {
  documentId: string;
  title: string;
  category: string;
  subcategory: string;
  number?: string;
  date?: string;
  summary?: string;
  relevantText: string;
  score: number;
  /** Relative path from legal-database root, for fetching full text and AI summary */
  relativePath?: string;
}

export interface RAGContext {
  query: string;
  results: RAGResult[];
  totalResults: number;
}

// Simple cosine similarity for vector comparison
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate a simple embedding using term frequency (fallback when no API key)
function simpleEmbed(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });
  // Create a 128-dim vector from word hashes
  const vec = new Array(128).fill(0);
  Object.entries(freq).forEach(([word, count]) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash = hash & hash;
    }
    const idx = Math.abs(hash) % 128;
    vec[idx] += count;
  });
  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

// Generate embedding - uses OpenAI if available, falls back to simple method
async function generateEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cached = await AICache.getEmbedding(text);
  if (cached) return cached;

  let embedding: number[];

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key") {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.slice(0, 8000),
        }),
      });
      const data = await response.json();
      embedding = data.data[0].embedding;
    } catch {
      embedding = simpleEmbed(text);
    }
  } else {
    embedding = simpleEmbed(text);
  }

  // Cache the embedding
  await AICache.setEmbedding(text, embedding);
  return embedding;
}

// Search legal documents using keyword matching and optional vector similarity
export async function searchLegalDocuments(
  query: string,
  options: {
    categories?: string[];
    subcategories?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<RAGContext> {
  const { categories, subcategories, limit = 20, offset = 0 } = options;

  // Check RAG context cache
  const cacheKey = `${categories?.join(",") || "all"}:${subcategories?.join(",") || "all"}`;
  const cachedContext = await AICache.getRAGContext(query, cacheKey);
  if (cachedContext) {
    return JSON.parse(cachedContext);
  }

  // Build where clause for keyword search
  const where: Record<string, unknown> = {};
  if (categories?.length) {
    where.category = { in: categories };
  }
  if (subcategories?.length) {
    where.subcategory = { in: subcategories };
  }

  // Keyword search across title, fullText, summary, doctrine
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const documents = await prisma.legalDocument.findMany({
    where: {
      ...where,
      OR: [
        ...keywords.map((kw) => ({ title: { contains: kw } })),
        ...keywords.map((kw) => ({ summary: { contains: kw } })),
        ...keywords.map((kw) => ({ doctrine: { contains: kw } })),
        ...keywords.map((kw) => ({ number: { contains: kw } })),
      ],
    },
    take: limit * 2, // Get more for re-ranking
    skip: offset,
  });

  // Generate query embedding for re-ranking
  const queryEmbedding = await generateEmbedding(query);

  // Score and rank results
  const scored: RAGResult[] = documents.map((doc) => {
    let score = 0;

    // Keyword frequency scoring
    const titleLower = doc.title.toLowerCase();
    const summaryLower = (doc.summary || "").toLowerCase();
    const doctrineLower = (doc.doctrine || "").toLowerCase();

    keywords.forEach((kw) => {
      if (titleLower.includes(kw)) score += 3;
      if (summaryLower.includes(kw)) score += 2;
      if (doctrineLower.includes(kw)) score += 2;
    });

    // Vector similarity if embeddings exist
    if (doc.embedding) {
      try {
        const docEmbedding = JSON.parse(doc.embedding);
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        score += similarity * 10;
      } catch {
        // Skip vector scoring
      }
    }

    // Recency bonus
    if (doc.date) {
      const yearsAgo = (Date.now() - new Date(doc.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      score += Math.max(0, 2 - yearsAgo * 0.1);
    }

    return {
      documentId: doc.id,
      title: doc.title,
      category: doc.category,
      subcategory: doc.subcategory,
      number: doc.number || undefined,
      date: doc.date?.toISOString() || undefined,
      summary: doc.summary || undefined,
      relevantText: doc.doctrine || doc.summary || doc.title,
      score,
    };
  });

  // Sort by score descending and take limit
  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit);

  const context: RAGContext = {
    query,
    results,
    totalResults: results.length,
  };

  // Cache the results
  await AICache.setRAGContext(query, cacheKey, JSON.stringify(context));

  return context;
}

// Build context string for LLM from RAG results
export function buildRAGPrompt(
  ragContext: RAGContext,
  mode: string = "standard_v2"
): string {
  const sourcesText = ragContext.results
    .map((r, i) => {
      let source = `[${i + 1}] ${r.title}`;
      if (r.number) source += ` (${r.number})`;
      if (r.date) source += ` - ${r.date.split("T")[0]}`;
      source += `\nCategory: ${r.category}/${r.subcategory}`;
      if (r.relevantText) source += `\n${r.relevantText}`;
      return source;
    })
    .join("\n\n");

  const modeInstructions: Record<string, string> = {
    standard_v2: "Provide a comprehensive, well-structured legal analysis. Include relevant citations and explain legal principles clearly. Use formal legal writing style.",
    standard: "Provide a balanced legal analysis with citations. Be thorough but readable.",
    concise: "Be extremely concise. Provide only the key legal points, citations, and conclusions in bullet points. Maximum efficiency.",
    professional: "Provide detailed legal analysis suitable for a legal practitioner. Include risk assessments, practical implications, and strategic considerations. Reference specific provisions and case holdings.",
    educational: "Explain legal concepts in an educational manner suitable for law students. Define legal terms, explain the reasoning behind legal principles, and use examples. Include learning points.",
    simple_english: "Explain in simple, everyday language. Avoid legal jargon. Use analogies and simple examples that a non-lawyer would understand easily.",
  };

  return `You are JusConsultus AI, an expert legal research assistant specializing in Philippine law. You provide accurate, well-cited legal analysis based on Philippine jurisprudence, statutes, and legal documents.

${modeInstructions[mode] || modeInstructions.standard_v2}

IMPORTANT RULES:
- ALWAYS provide a complete, accurate answer. Cite sources from the provided context when available. When sources are insufficient, use your knowledge of Philippine law clearly distinguishing retrieved sources from general knowledge.
- Always cite specific case names, G.R. numbers, and dates when available
- Clearly indicate when information might be incomplete
- Focus on Philippine law and jurisdiction
- Structure responses with clear headings and sections
- Start with **Legal Context:** — 1-2 sentence direct answer specific to the question asked

SOURCES FROM LEGAL DATABASE:
${sourcesText || "No specific sources found for this query. Provide general legal principles from Philippine law."}

Based on the above sources and your knowledge of Philippine law, provide your analysis.`;
}
