import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { deepSearch } from "@/lib/ai/deep-searcher";

// POST - Send message to existing chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const { message, chatMode, deepThink = false } = await request.json();

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  if (user.searchesLeft <= 0) {
    return NextResponse.json({ error: "No searches remaining" }, { status: 403 });
  }

  // Save user message
  await prisma.message.create({
    data: { chatId, role: "user", content: message },
  });

  // Build conversation history for context
  const history = chat.messages.slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // DeepSearch with conversation history
  const sourceFilters = chat.sources.split(",").map((s: string) => s.trim()).filter(Boolean);

  let result;
  try {
    result = await deepSearch(message, {
      mode: chat.mode,
      sourceFilters: sourceFilters.length > 0 ? sourceFilters : undefined,
      includeUserFiles: true,
      userId: user.id,
      chatMode,
      deepThink,
      history,
      maxSources: deepThink ? 30 : 20,
    });
  } catch (err) {
    console.error("DeepSearch error in POST /api/chat/[chatId]:", err);
    return NextResponse.json(
      { error: "An error occurred during the search. Please try again." },
      { status: 500 }
    );
  }

  const assistantMessage = await prisma.message.create({
    data: {
      chatId,
      role: "assistant",
      content: result.answer,
      sources: JSON.stringify(result.sources.slice(0, 20)),
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
      sources: result.sources.slice(0, 20),
      createdAt: assistantMessage.createdAt.toISOString(),
    },
    searchesLeft: user.searchesLeft - 1,
    deepSearchMeta: {
      subQueries: result.subQueries,
      steps: result.steps,
      totalSourcesScanned: result.totalSourcesScanned,
    },
  });
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
