import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hybridSearch, buildUnifiedPrompt, type UnifiedSearchResult } from "@/lib/ai/unified-search";
import { generateCompletion } from "@/lib/ai/llm";

// POST - Send message to existing chat (follow-up)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;

  let body: { message?: string; chatMode?: string; deepThink?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, chatMode, deepThink = false } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  let chat;
  try {
    chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
  } catch (err) {
    console.error("Prisma error fetching chat:", err);
    return NextResponse.json({ error: "Database error. Please try again." }, { status: 500 });
  }

  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  if (user.searchesLeft <= 0) {
    return NextResponse.json({ error: "No searches remaining. Please upgrade your plan." }, { status: 403 });
  }

  // Save user message
  try {
    await prisma.message.create({
      data: { chatId, role: "user", content: message },
    });
  } catch (err) {
    console.error("Prisma error saving user message:", err);
    return NextResponse.json({ error: "Database error. Please try again." }, { status: 500 });
  }

  // Build conversation history for context (last 8 exchanges)
  const history = chat.messages.slice(-16).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, 1200),
  }));

  const sourceFilters = chat.sources.split(",").map((s: string) => s.trim()).filter(Boolean);

  let answer: string;
  let searchedSources: UnifiedSearchResult["results"] = [];
  let subQueriesOut: string[] = [];
  let totalScanned = 0;

  try {
    const strategy = deepThink ? "agentic" : "auto";
    const searchResult = await hybridSearch(message, {
      mode: chat.mode,
      sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
      maxResults: deepThink ? 30 : 15,
      strategy,
      enableKAG: true,
      enableDeepSearcher: true,
      enableFilesystem: true,
    });

    if (searchResult.agenticAnswer) {
      answer = searchResult.agenticAnswer;
    } else {
      const systemPrompt = buildUnifiedPrompt(searchResult, chat.mode);

      // Build messages array including conversation history for context
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ];

      answer = await generateCompletion(messages, {
        temperature: 0.3,
        maxTokens: deepThink ? 8192 : 4096,
      });
    }

    searchedSources = searchResult.results;
    subQueriesOut = searchResult.subQueries || [];
    totalScanned = searchResult.results.length;
  } catch (err) {
    console.error("Search error in POST /api/chat/[chatId]:", err);
    return NextResponse.json(
      { error: "An error occurred during the search. Please try again." },
      { status: 500 }
    );
  }

  // Save assistant response and update counters
  try {
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: answer,
        sources: JSON.stringify(searchedSources.slice(0, 20)),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { searchesLeft: { decrement: 1 } },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        ...assistantMessage,
        sources: searchedSources.slice(0, 20),
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      searchesLeft: user.searchesLeft - 1,
      deepSearchMeta: {
        subQueries: subQueriesOut,
        totalSourcesScanned: totalScanned,
      },
    });
  } catch (err) {
    console.error("Prisma error saving assistant message:", err);
    return NextResponse.json({ error: "Failed to save response. Please try again." }, { status: 500 });
  }
}

// GET - Get chat with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  return NextResponse.json({
    chat: {
      ...chat,
      messages: chat.messages.map((m) => ({
        ...m,
        sources: m.sources ? JSON.parse(m.sources) : [],
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}

// DELETE - Delete a single chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: user.id },
  });
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  await prisma.message.deleteMany({ where: { chatId } });
  await prisma.chat.delete({ where: { id: chatId } });

  return NextResponse.json({ success: true });
}
