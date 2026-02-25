import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion } from "@/lib/ai/llm";

/**
 * POST /api/chat/summary
 * Generate a short AI summary of a chat conversation (for displaying in sidebar).
 * Body: { text: string } — the concatenated conversation messages
 * Returns: { summary: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  try {
    const summary = await generateCompletion(
      [
        {
          role: "system",
          content:
            "Summarize the following legal chat conversation in 1-2 concise sentences. Focus on the main legal topic discussed and the key takeaway. Keep it under 40 words.",
        },
        {
          role: "user",
          content: text.slice(0, 3000), // limit to prevent excessive tokens
        },
      ],
      { maxTokens: 80, temperature: 0.2 }
    );

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Chat summary error:", err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
