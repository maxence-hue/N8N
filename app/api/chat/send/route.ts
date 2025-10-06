import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { memoryStore, ChatMessage } from '@/lib/store';
import { signPayload } from '@/lib/signature';

const outboundUrl = process.env.N8N_OUTBOUND_WEBHOOK;
const sharedSecret = process.env.N8N_SHARED_SECRET ?? '';

if (!outboundUrl) {
  console.warn('⚠️  N8N_OUTBOUND_WEBHOOK non défini. Configurez la variable dans .env.local.');
}

export async function POST(request: NextRequest) {
  if (!outboundUrl) {
    return NextResponse.json({ error: 'Webhook n8n non configuré' }, { status: 500 });
  }

  let payload: { conversationId?: string; message?: Partial<ChatMessage> };
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const { conversationId, message } = payload;

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId manquant' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'message manquant' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const messageId = message.id ?? randomUUID();
  const normalized: ChatMessage = {
    id: messageId,
    role: 'user',
    type: message.type ?? (message.fileUrl ? (message.mimeType?.startsWith('image/') ? 'image' : 'file') : 'text'),
    text: message.text,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileSize: message.fileSize,
    mimeType: message.mimeType,
    createdAt: message.createdAt ?? now,
    status: 'sending'
  };

  if (!['text', 'image', 'file', 'system'].includes(normalized.type)) {
    return NextResponse.json({ error: 'Type de message invalide' }, { status: 400 });
  }
  if (normalized.type === 'text' && !normalized.text?.trim()) {
    return NextResponse.json({ error: 'Message texte vide' }, { status: 400 });
  }
  if (normalized.type !== 'text' && !normalized.fileUrl) {
    return NextResponse.json({ error: 'Pièce jointe manquante' }, { status: 400 });
  }

  memoryStore.appendMessage(conversationId, normalized);

  const outboundBody = JSON.stringify({
    conversationId,
    messages: [
      {
        ...normalized,
        status: undefined
      }
    ]
  });

  const signature = sharedSecret ? signPayload(outboundBody, sharedSecret) : undefined;

  let response: Response;
  try {
    response = await fetch(outboundUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'X-ADSolar-Signature': signature } : {})
      },
      body: outboundBody
    });
  } catch (error) {
    const failedMessage: ChatMessage = { ...normalized, status: 'error' };
    memoryStore.appendMessage(conversationId, failedMessage);
    return NextResponse.json({ error: 'Erreur de connexion au webhook n8n', message: failedMessage }, { status: 502 });
  }

  const status: ChatMessage['status'] = response.ok ? 'sent' : 'error';
  const finalMessage: ChatMessage = { ...normalized, status };

  memoryStore.appendMessage(conversationId, finalMessage);

  if (!response.ok) {
    return NextResponse.json({ error: 'Webhook n8n a renvoyé une erreur', message: finalMessage }, { status: 502 });
  }

  return NextResponse.json({ message: finalMessage }, { status: 202 });
}
