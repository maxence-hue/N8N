'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage } from '@/lib/store';
import { ChatWindow } from '@/components/ChatWindow';
import { Composer, ComposerAttachment } from '@/components/Composer';
import { v4 as uuidv4 } from 'uuid';

interface ChatClientProps {
  initialMessages: ChatMessage[];
  initialConversationId?: string;
}

export function ChatClient({ initialMessages, initialConversationId }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState(initialConversationId ?? '');
  const [isReady, setIsReady] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const initialMessagesCountRef = useRef(initialMessages.length);

  useEffect(() => {
    let active = true;

    const initConversation = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      const storedId = window.localStorage.getItem('conversationId');
      let resolvedId = storedId ?? initialConversationId ?? uuidv4();

      if (
        storedId &&
        initialConversationId &&
        storedId !== initialConversationId &&
        initialMessagesCountRef.current > 0
      ) {
        resolvedId = initialConversationId;
      }

      if (!storedId || storedId !== resolvedId) {
        window.localStorage.setItem('conversationId', resolvedId);
      }

      if (initialConversationId && resolvedId !== initialConversationId) {
        const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `conversationId=${resolvedId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secureAttribute}`;
      }

      if (!active) return;
      setConversationId(resolvedId);

      try {
        const response = await fetch(`/api/chat/history?conversationId=${resolvedId}`, { cache: 'no-store' });
        if (response.ok) {
          const data = (await response.json()) as { messages: ChatMessage[] };
          if (active) {
            setMessages(data.messages);
          }
        } else {
          console.error('Unable to load chat history', response.statusText);
        }
      } catch (error) {
        console.error('Unable to load chat history', error);
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    initConversation();

    return () => {
      active = false;
    };
  }, [initialConversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!conversationId) return;
    const stored = window.localStorage.getItem('conversationId');
    if (stored !== conversationId) {
      window.localStorage.setItem('conversationId', conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const source = new EventSource(`/api/events?conversationId=${conversationId}`);
      eventSourceRef.current = source;
      source.onmessage = (event) => {
        if (!event?.data) return;
        try {
          const payload = JSON.parse(event.data) as { conversationId: string; message: ChatMessage };
          if (payload.conversationId !== conversationId) return;
          setMessages((prev) => {
            const existingIndex = prev.findIndex((m) => m.id === payload.message.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...prev[existingIndex], ...payload.message };
              return updated;
            }
            return [...prev, payload.message];
          });
        } catch (error) {
          console.error('Invalid SSE payload', error);
        }
      };
      source.onerror = (error) => {
        console.error('SSE error', error);
        source.close();
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      eventSourceRef.current?.close();
    };
  }, [conversationId]);

  const handleSend = useCallback(
    async (text: string, files: ComposerAttachment[]) => {
      if (!conversationId) {
        return;
      }
      const trimmedText = text.trim();
      if (!trimmedText && files.length === 0) {
        return;
      }

      const outgoing: ChatMessage[] = [];
      let uploadResults: { fileUrl: string; fileName: string; fileSize: number; mimeType: string }[] = [];

      try {
        if (files.length > 0) {
          uploadResults = await Promise.all(
            files.map(async (attachment) => {
              const formData = new FormData();
              formData.append('file', attachment.file);
              formData.append('conversationId', conversationId);
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });
              if (!response.ok) {
                throw new Error('Erreur lors de l\'upload');
              }
              return response.json() as Promise<{
                fileUrl: string;
                fileName: string;
                fileSize: number;
                mimeType: string;
              }>;
            })
          );
        }

        if (trimmedText) {
          outgoing.push({
            id: uuidv4(),
            role: 'user',
            type: 'text',
            text: trimmedText,
            createdAt: new Date().toISOString(),
            status: 'sending'
          });
        }

        uploadResults.forEach((result, index) => {
          const file = files[index];
          outgoing.push({
            id: uuidv4(),
            role: 'user',
            type: file.kind === 'image' ? 'image' : 'file',
            fileUrl: result.fileUrl,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
            createdAt: new Date().toISOString(),
            status: 'sending'
          });
        });

        setMessages((prev) => [...prev, ...outgoing]);
        setAttachments([]);

        await Promise.all(
          outgoing.map(async (message) => {
            const response = await fetch('/api/chat/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                conversationId,
                message
              })
            });
            if (!response.ok) {
              throw new Error('Erreur lors de l\'envoi du message');
            }
            const data = (await response.json()) as { message: ChatMessage };
            setMessages((prev) => {
              const index = prev.findIndex((m) => m.id === data.message.id);
              if (index >= 0) {
                const next = [...prev];
                next[index] = { ...prev[index], ...data.message };
                return next;
              }
              return [...prev, data.message];
            });
          })
        );
      } catch (error) {
        setMessages((prev) =>
          prev.map((existing) =>
            outgoing.some((pending) => pending.id === existing.id)
              ? { ...existing, status: 'error' }
              : existing
          )
        );
        setAttachments([]);
        throw error;
      }
    },
    [conversationId]
  );

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddAttachments = useCallback((items: ComposerAttachment[]) => {
    setAttachments((prev) => {
      const merged = [...prev, ...items];
      return merged.slice(0, 5);
    });
  }, []);

  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [attachments]);

  const totalSize = useMemo(
    () => attachments.reduce((acc, item) => acc + item.file.size, 0),
    [attachments]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">ADSolar Ops</h1>
            <p className="text-xs text-slate-500">
              {conversationId ? `Conversation #${conversationId.slice(0, 8)}` : 'Initialisation en cours...'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-400'}`}
              aria-hidden
            />
            <span aria-label="Statut de connexion">{isReady ? 'Connecté' : 'Initialisation'}</span>
          </div>
        </div>
      </header>
      <div className="flex h-full flex-col">
        <ChatWindow messages={messages} conversationId={conversationId} />
        <Composer
          onSend={handleSend}
          attachments={attachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
          totalAttachmentSize={totalSize}
          disabled={!isReady}
        />
      </div>
    </div>
  );
}
