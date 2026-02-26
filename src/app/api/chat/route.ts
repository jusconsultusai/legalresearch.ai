import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { deepSearch } from "@/lib/ai/deep-searcher";

// GET - List chats for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chats = await prisma.chat.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({ chats });
}

// POST - Create new chat and send first message
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, mode = "standard_v2", sources = "law,jurisprudence", chatMode, deepThink = false } = await request.json();

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Check search limits
  if (user.searchesLeft <= 0) {
    return NextResponse.json({ error: "No searches remaining. Please upgrade your plan." }, { status: 403 });
  }

  // Create chat
  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: message.slice(0, 100),
      mode,
      sources,
    },
  });

  // Save user message
  await prisma.message.create({
    data: {
      chatId: chat.id,
      role: "user",
      content: message,
    },
  });

  // DeepSearch Pipeline: decompose → retrieve → evaluate → synthesize
  const sourceFilters = sources.split(",").map((s: string) => s.trim()).filter(Boolean);

  let result;
  try {
    result = await deepSearch(message, {
      mode,
      sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
      includeUserFiles: true,
      userId: user.id,
      chatMode,
      deepThink,
      maxSources: deepThink ? 30 : 15,
    });
  } catch (err) {
    console.error("DeepSearch error in POST /api/chat:", err);
    // Clean up the created chat so it doesn't appear as an empty session
    await prisma.chat.delete({ where: { id: chat.id } }).catch(() => {});
    return NextResponse.json(
      { error: "An error occurred during the search. Please try again." },
      { status: 500 }
    );
  }

  // Save assistant message with sources
  const assistantMessage = await prisma.message.create({
    data: {
      chatId: chat.id,
      role: "assistant",
      content: result.answer,
      sources: JSON.stringify(result.sources.slice(0, 20)),
    },
  });

  // Decrement searches
  await prisma.user.update({
    where: { id: user.id },
    data: { searchesLeft: { decrement: 1 } },
  });

  return NextResponse.json({
    chat: {
      ...chat,
      messages: [
        { id: "user-msg", chatId: chat.id, role: "user", content: message, createdAt: new Date().toISOString() },
        {
          ...assistantMessage,
          sources: result.sources.slice(0, 20),
          createdAt: assistantMessage.createdAt.toISOString(),
        },
      ],
    },
    searchesLeft: user.searchesLeft - 1,
    deepSearchMeta: {
      subQueries: result.subQueries,
      steps: result.steps,
      totalSourcesScanned: result.totalSourcesScanned,
    },
  });
}

// DELETE - Clear all chats for current user
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete all messages first (foreign key), then chats
  await prisma.message.deleteMany({
    where: { chat: { userId: user.id } },
  });
  await prisma.chat.deleteMany({
    where: { userId: user.id },
  });

  return NextResponse.json({ success: true });
}
