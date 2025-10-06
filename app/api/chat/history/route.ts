import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId requis' }, { status: 400 });
  }

  const ensured = memoryStore.ensureConversation(conversationId);
  const messages = memoryStore.getMessages(ensured);

  return NextResponse.json({ messages });
}
