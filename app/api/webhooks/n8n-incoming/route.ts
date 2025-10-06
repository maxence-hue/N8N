import { NextRequest, NextResponse } from 'next/server';
import { memoryStore, ChatMessage } from '@/lib/store';
import { verifySignature } from '@/lib/signature';

const sharedSecret = process.env.N8N_SHARED_SECRET ?? '';

export async function POST(request: NextRequest) {
  if (!sharedSecret) {
    return NextResponse.json({ error: 'Secret partagé non configuré' }, { status: 500 });
  }
  const signatureHeader = request.headers.get('x-adsolar-signature');
  const rawBody = await request.text();

  if (!verifySignature(rawBody, signatureHeader, sharedSecret)) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
  }

  let payload: { conversationId?: string; messages?: ChatMessage[] };
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const { conversationId, messages } = payload;
  if (!conversationId || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Payload incomplet' }, { status: 400 });
  }

  messages.forEach((message) => {
    const normalized: ChatMessage = {
      ...message,
      role: message.role ?? 'assistant',
      status: message.status ?? 'delivered'
    };
    memoryStore.appendMessage(conversationId, normalized);
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
