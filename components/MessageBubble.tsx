'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChatMessage } from '@/lib/store';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const timestamp = format(new Date(message.createdAt), 'HH:mm', { locale: fr });

  const statusLabel = message.status === 'sending' ? 'Envoi…' : message.status === 'error' ? 'Erreur' : message.status === 'delivered' ? 'Livré' : undefined;

  return (
    <div className={clsx('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-md',
          isUser
            ? 'rounded-br-sm border-blue-100 bg-blue-600 text-white'
            : 'rounded-bl-sm border-slate-200 bg-white text-slate-900'
        )}
        role="group"
        aria-label={message.role === 'assistant' ? 'Message assistant' : message.role === 'system' ? 'Message système' : 'Votre message'}
      >
        {message.type === 'text' && message.text && (
          <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>
        )}
        {message.type !== 'text' && message.fileUrl && (
          <AttachmentContent message={message} isUser={isUser} />
        )}
        <div className={clsx('mt-2 flex items-center justify-end gap-2 text-[11px]', isUser ? 'text-blue-100' : 'text-slate-400')}>
          {statusLabel && <span>{statusLabel}</span>}
          <span aria-label={`Envoyé à ${timestamp}`}>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}

function AttachmentContent({ message, isUser }: { message: ChatMessage; isUser: boolean }) {
  if (!message.fileUrl) return null;
  if (message.type === 'image') {
    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block overflow-hidden rounded-lg border border-white/30"
      >
        <Image
          src={message.fileUrl}
          alt={message.fileName ?? 'Image envoyée'}
          width={640}
          height={640}
          className="max-h-64 w-full rounded-lg object-cover"
          unoptimized
        />
      </a>
    );
  }
  return (
    <a
      href={message.fileUrl}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        'mt-1 flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition',
        isUser
          ? 'border-white/30 bg-white/20 text-white hover:bg-white/30'
          : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
      )}
    >
      <span aria-hidden className="text-lg">📎</span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{message.fileName}</span>
        {typeof message.fileSize === 'number' && (
          <span className="text-xs opacity-80">{(message.fileSize / 1024 / 1024).toFixed(2)} Mo</span>
        )}
      </div>
    </a>
  );
}
