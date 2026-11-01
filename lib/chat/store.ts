import type { UIMessage } from "ai";

import { deriveChatTitle } from "@/lib/chat/title";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toUIMessage(row: {
  id: string;
  role: string;
  parts: unknown;
  metadata: unknown | null;
}): UIMessage {
  const message: UIMessage = {
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
  };
  if (row.metadata != null) {
    message.metadata = row.metadata as UIMessage["metadata"];
  }
  return message;
}

export async function createChat(title?: string): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .insert({ title: title?.trim() || undefined })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

/** Creates the chat row with a client-generated id if it does not exist yet. */
export async function ensureChat(chatId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .upsert({ id: chatId }, { onConflict: "id", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

export async function listChats(
  limit = 20,
): Promise<{ id: string; title: string; updatedAt: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  }));
}

export async function loadChat(
  chatId: string,
): Promise<{ id: string; title: string; messages: UIMessage[] } | null> {
  if (!isUuid(chatId)) {
    return null;
  }

  const supabase = await createClient();
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, title")
    .eq("id", chatId)
    .maybeSingle();

  if (chatError) throw new Error(chatError.message);
  if (!chat) {
    return null;
  }

  const { data: rows, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, role, parts, metadata, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (messagesError) throw new Error(messagesError.message);

  return {
    id: chat.id,
    title: chat.title,
    messages: (rows ?? []).map(toUIMessage),
  };
}

export async function saveMessages(
  chatId: string,
  messages: UIMessage[],
): Promise<void> {
  const supabase = await createClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("chat_messages")
    .select("id, created_at")
    .eq("chat_id", chatId);

  if (existingError) throw new Error(existingError.message);

  const existingCreatedAt = new Map(
    (existingRows ?? []).map((row) => [row.id, row.created_at]),
  );

  let sequenceBaseMs = Date.now();
  if (existingCreatedAt.size > 0) {
    const maxExisting = Math.max(
      ...[...existingCreatedAt.values()].map((value) =>
        new Date(value).getTime(),
      ),
    );
    sequenceBaseMs = Math.max(sequenceBaseMs, maxExisting);
  }

  let newIndex = 0;
  const upsertRows: {
    id: string;
    chat_id: string;
    role: string;
    parts: unknown;
    metadata?: unknown | null;
    created_at?: string;
  }[] = [];

  for (const message of messages) {
    const row = {
      id: message.id,
      chat_id: chatId,
      role: message.role,
      parts: message.parts,
      metadata: message.metadata ?? null,
    };

    if (existingCreatedAt.has(message.id)) {
      upsertRows.push(row);
    } else {
      newIndex += 1;
      upsertRows.push({
        ...row,
        created_at: new Date(sequenceBaseMs + newIndex).toISOString(),
      });
    }
  }

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("chat_messages")
      .upsert(upsertRows, { onConflict: "id" });

    if (upsertError) throw new Error(upsertError.message);
  }

  const keptIds = new Set(messages.map((message) => message.id));
  const staleIds = [...existingCreatedAt.keys()].filter((id) => !keptIds.has(id));
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("chat_id", chatId)
      .in("id", staleIds);

    if (deleteError) throw new Error(deleteError.message);
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("title")
    .eq("id", chatId)
    .maybeSingle();

  if (chatError) throw new Error(chatError.message);

  const updatePayload: { updated_at: string; title?: string } = {
    updated_at: new Date().toISOString(),
  };

  if (chat?.title === "New chat") {
    const derived = deriveChatTitle(messages);
    if (derived) {
      updatePayload.title = derived;
    }
  }

  const { error: updateError } = await supabase
    .from("chats")
    .update(updatePayload)
    .eq("id", chatId);

  if (updateError) throw new Error(updateError.message);
}

export async function deleteChat(chatId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("chats").delete().eq("id", chatId);

  if (error) throw new Error(error.message);
}
