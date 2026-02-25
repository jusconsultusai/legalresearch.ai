import { prisma } from "@/lib/db/prisma";

interface CacheOptions {
  ttlMs?: number; // Time to live in milliseconds
}

const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

export class AICache {
  // Query Cache - cache search queries and their results
  static async getQuery(query: string): Promise<string | null> {
    const key = `query:${this.hashKey(query)}`;
    return this.get(key, "query");
  }

  static async setQuery(query: string, result: string, options?: CacheOptions): Promise<void> {
    const key = `query:${this.hashKey(query)}`;
    await this.set(key, "query", result, options);
  }

  // Embedding Cache - cache document embeddings
  static async getEmbedding(text: string): Promise<number[] | null> {
    const key = `embedding:${this.hashKey(text)}`;
    const cached = await this.get(key, "embedding");
    if (cached) return JSON.parse(cached);
    return null;
  }

  static async setEmbedding(text: string, embedding: number[], options?: CacheOptions): Promise<void> {
    const key = `embedding:${this.hashKey(text)}`;
    await this.set(key, "embedding", JSON.stringify(embedding), { ttlMs: 1000 * 60 * 60 * 24 * 7, ...options }); // 7 days default
  }

  // LLM Response Cache - cache LLM completions
  static async getLLMResponse(prompt: string, mode: string): Promise<string | null> {
    const key = `llm:${mode}:${this.hashKey(prompt)}`;
    return this.get(key, "llm");
  }

  static async setLLMResponse(prompt: string, mode: string, response: string, options?: CacheOptions): Promise<void> {
    const key = `llm:${mode}:${this.hashKey(prompt)}`;
    await this.set(key, "llm", response, { ttlMs: 1000 * 60 * 60 * 4, ...options }); // 4 hours default
  }

  // RAG Context Cache
  static async getRAGContext(query: string, sources: string): Promise<string | null> {
    const key = `rag:${sources}:${this.hashKey(query)}`;
    return this.get(key, "query");
  }

  static async setRAGContext(query: string, sources: string, context: string, options?: CacheOptions): Promise<void> {
    const key = `rag:${sources}:${this.hashKey(query)}`;
    await this.set(key, "query", context, { ttlMs: 1000 * 60 * 60 * 2, ...options }); // 2 hours default
  }

  // Core methods
  private static async get(key: string, type: string): Promise<string | null> {
    try {
      const entry = await prisma.cacheEntry.findUnique({ where: { key } });
      if (!entry) return null;
      if (new Date() > entry.expiresAt) {
        await prisma.cacheEntry.delete({ where: { key } }).catch(() => {});
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  private static async set(key: string, type: string, value: string, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttlMs ?? DEFAULT_TTL;
    const expiresAt = new Date(Date.now() + ttl);
    try {
      await prisma.cacheEntry.upsert({
        where: { key },
        update: { value, expiresAt, type },
        create: { key, type, value, expiresAt },
      });
    } catch {
      // Silently fail cache writes
    }
  }

  // Clean up expired cache entries
  static async cleanup(): Promise<number> {
    const result = await prisma.cacheEntry.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  // Simple hash for cache keys
  private static hashKey(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
