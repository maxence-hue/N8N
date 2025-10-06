import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { ChatClient } from '@/components/ChatClient';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cookieStore = cookies();
  let conversationId = cookieStore.get('conversationId')?.value;
  if (!conversationId) {
    conversationId = randomUUID();
    cookieStore.set('conversationId', conversationId, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
  }

  const ensuredConversation = memoryStore.ensureConversation(conversationId);
  const initialMessages = memoryStore.getMessages(ensuredConversation);

  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <ChatClient initialMessages={initialMessages} initialConversationId={conversationId} />
    </main>
  );
}
