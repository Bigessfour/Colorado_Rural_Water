/**
 * Tenant-scoped conversation history for the agent (E1).
 * sk = CONV#{userId}#{isoCreated}#{messageId}
 */

export interface ConversationMessage {
  tenantId: string;
  userId: string;
  messageId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  model?: string | null;
}

export interface ConversationStore {
  putMessage(msg: ConversationMessage): Promise<void>;
  listRecent(
    tenantId: string,
    userId: string,
    limit?: number,
  ): Promise<ConversationMessage[]>;
}

export function conversationSk(userId: string, createdAt: string, messageId: string): string {
  return `CONV#${userId}#${createdAt}#${messageId}`;
}

export class MemoryConversationStore implements ConversationStore {
  private messages: ConversationMessage[] = [];

  async putMessage(msg: ConversationMessage): Promise<void> {
    this.messages.push(msg);
  }

  async listRecent(
    tenantId: string,
    userId: string,
    limit = 20,
  ): Promise<ConversationMessage[]> {
    return this.messages
      .filter((m) => m.tenantId === tenantId && m.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-limit);
  }
}
