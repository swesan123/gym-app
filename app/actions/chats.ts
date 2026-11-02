"use server";

import { revalidatePath } from "next/cache";

import { deleteChat } from "@/lib/chat/store";

export async function deleteChatAction(chatId: string): Promise<void> {
  await deleteChat(chatId);
  revalidatePath("/chat");
}
