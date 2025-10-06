'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/store';
import { MessageBubble } from '@/components/MessageBubble';

interface ChatWindowProps {
  messages: ChatMessage[];
  conversationId?: string;
}

export function ChatWindow({ messages, conversationId }: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-6"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-24">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            <p>Bienvenue dans l&apos;interface opérateur ADSolar.</p>
            <p className="mt-2">Démarrez la conversation en envoyant un message ou une pièce jointe.</p>
            <p className="mt-4 text-xs text-slate-400">ID conversation: {conversationId ? conversationId : '–'}</p>
          </div>
        ) : (
          messages
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>
    </div>
  );
}
