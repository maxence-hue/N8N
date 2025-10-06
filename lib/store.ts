import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: MessageType;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  metadata?: Record<string, any>;
}

class MemoryStore {
  private conversations = new Map<string, ChatMessage[]>();
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  appendMessage(conversationId: string, message: ChatMessage) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }
    const existing = this.conversations.get(conversationId)!;
    const index = existing.findIndex((m) => m.id === message.id);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...message };
    } else {
      existing.push(message);
    }
    this.emitter.emit('message', { conversationId, message });
  }

  getMessages(conversationId: string) {
    return this.conversations.get(conversationId) ?? [];
  }

  getEmitter() {
    return this.emitter;
  }

  ensureConversation(conversationId?: string) {
    if (conversationId && this.conversations.has(conversationId)) {
      return conversationId;
    }
    const id = conversationId ?? randomUUID();
    if (!this.conversations.has(id)) {
      this.conversations.set(id, []);
    }
    return id;
  }
}

export const memoryStore = new MemoryStore();
export type MessageEventPayload = {
  conversationId: string;
  message: ChatMessage;
};
