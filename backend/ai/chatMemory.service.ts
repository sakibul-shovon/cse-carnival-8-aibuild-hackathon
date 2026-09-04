import type { ChatRole } from "@prisma/client";
import { database } from "../config/database.js";

const MAX_MESSAGES_PER_SESSION = 10;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const chatMemoryService = {
  /**
   * Persist one message for a session and trim the session back down to
   * MAX_MESSAGES_PER_SESSION, dropping the oldest messages first.
   */
  async saveMessage(sessionId: string, externalUserId: string, role: ChatMessage["role"], content: string): Promise<void> {
    await database.$transaction(async (transaction) => {
      const user = await transaction.user.findUniqueOrThrow({ where: { externalId: externalUserId } });
      await transaction.chatMemory.create({
        data: { sessionId, userId: user.id, role: role.toUpperCase() as ChatRole, content }
      });
      const overflow = await transaction.chatMemory.findMany({
        where: { sessionId, userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: MAX_MESSAGES_PER_SESSION,
        select: { id: true }
      });
      if (overflow.length) {
        await transaction.chatMemory.deleteMany({ where: { id: { in: overflow.map((row) => row.id) } } });
      }
    });
  },

  /**
   * Load the most recent MAX_MESSAGES_PER_SESSION messages for a session,
   * oldest first, ready to feed straight into the model's `input` array.
   */
  async getConversationHistory(sessionId: string, externalUserId: string): Promise<ChatMessage[]> {
    const messages = await database.chatMemory.findMany({
      where: { sessionId, user: { externalId: externalUserId } },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGES_PER_SESSION
    });
    return messages.reverse().map((message) => ({
      role: message.role.toLowerCase() as ChatMessage["role"],
      content: message.content
    }));
  },

  /**
   * Permanently delete every stored message for a session.
   */
  async clearSession(sessionId: string, externalUserId: string): Promise<void> {
    await database.chatMemory.deleteMany({ where: { sessionId, user: { externalId: externalUserId } } });
  }
};
