/**
 * Document Loader — Load, chunk, and search user-uploaded files
 *
 * Handles user files stored in the database (UserFile model) and provides
 * search functionality so the DeepSearch pipeline can include user documents
 * alongside the legal database.
 */

import { prisma } from "@/lib/db/prisma";
import type { RAGResult } from "./rag";

/* ── Text Extraction ── */

/** Strip HTML to plain text */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract text content from a base64-encoded data URL or plain text */
export function extractTextFromContent(content: string, mimeType: string): string {
  // If it's already plain text
  if (!content.startsWith("data:")) {
    return content;
  }

  // Data URL: data:mime;base64,PAYLOAD
  const base64Match = content.match(/^data:[^;]*;base64,(.+)$/);
  if (!base64Match) return "";

  try {
    const decoded = Buffer.from(base64Match[1], "base64").toString("utf-8");

    if (mimeType.includes("html")) {
      return htmlToText(decoded);
    }

    // For text-based files, return as-is
    if (
      mimeType.includes("text") ||
      mimeType.includes("json") ||
      mimeType.includes("xml") ||
      mimeType.includes("rtf")
    ) {
      return decoded;
    }

    // For PDFs and other binary formats, return whatever text we can extract
    // (Full PDF extraction would require a library; for now extract visible text)
    return decoded.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

/* ── Chunking ── */

interface TextChunk {
  text: string;
  startIdx: number;
  endIdx: number;
}

/**
 * Split text into overlapping chunks for better retrieval.
 * Uses ~800 character chunks with 200 character overlap.
 */
function chunkText(text: string, chunkSize = 800, overlap = 200): TextChunk[] {
  if (text.length <= chunkSize) {
    return [{ text, startIdx: 0, endIdx: text.length }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkEnd = end;

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + chunkSize * 0.5) {
        chunkEnd = breakPoint + 1;
      }
    }

    chunks.push({
      text: text.slice(start, chunkEnd).trim(),
      startIdx: start,
      endIdx: chunkEnd,
    });

    start = chunkEnd - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/* ── Keyword Scoring ── */

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
  "and", "or", "but", "not", "it", "its", "this", "that", "what", "which",
  "who", "whom", "how", "when", "where", "why", "can", "may", "shall",
  "will", "do", "does", "did", "has", "have", "had", "about", "under",
]);

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreText(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const textLower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const hits = (textLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    score += Math.min(hits, 10);
  }
  return score;
}

/* ── User File Search ── */

/**
 * Search user-uploaded files for documents matching a query.
 * Returns results in the same RAGResult format as the legal DB search.
 */
export async function searchUserFiles(
  query: string,
  userId: string,
  options: { limit?: number; category?: string } = {}
): Promise<RAGResult[]> {
  const { limit = 5, category } = options;
  const keywords = extractKeywords(query);

  if (keywords.length === 0) return [];

  // Fetch user files from DB
  const where: Record<string, unknown> = { userId };
  if (category && category !== "all") {
    where.category = category;
  }

  let userFiles;
  try {
    userFiles = await prisma.userFile.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        content: true,
        category: true,
        uploadedAt: true,
      },
    });
  } catch {
    return [];
  }

  if (userFiles.length === 0) return [];

  // Score each file
  const scored: RAGResult[] = [];

  for (const file of userFiles) {
    const text = extractTextFromContent(file.content, file.type);
    if (!text || text.length < 10) continue;

    // Score filename + content
    const nameScore = scoreText(file.name, keywords) * 3;
    const chunks = chunkText(text);

    // Find best-scoring chunk
    let bestChunk = chunks[0];
    let bestChunkScore = 0;
    for (const chunk of chunks) {
      const chunkScore = scoreText(chunk.text, keywords);
      if (chunkScore > bestChunkScore) {
        bestChunkScore = chunkScore;
        bestChunk = chunk;
      }
    }

    const totalScore = nameScore + bestChunkScore;
    if (totalScore > 0) {
      scored.push({
        documentId: `userfile:${file.id}`,
        title: file.name,
        category: "user_files",
        subcategory: file.category,
        date: file.uploadedAt.toISOString().split("T")[0],
        relevantText: bestChunk.text.slice(0, 600),
        score: totalScore,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Analyze a single user file — extract key information for AI-powered analysis.
 */
export async function analyzeUserFile(
  fileId: string,
  userId: string
): Promise<{ text: string; chunks: TextChunk[]; wordCount: number } | null> {
  try {
    const file = await prisma.userFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) return null;

    const text = extractTextFromContent(file.content, file.type);
    const chunks = chunkText(text);
    const wordCount = text.split(/\s+/).length;

    return { text, chunks, wordCount };
  } catch {
    return null;
  }
}
