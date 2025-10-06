import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { ChatClient } from '@/components/ChatClient';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const conversationIdFromCookie = cookies().get('conversationId')?.value;
  const conversationId = conversationIdFromCookie ?? randomUUID();

  const ensuredConversation = memoryStore.ensureConversation(conversationId);
  const initialMessages = memoryStore.getMessages(ensuredConversation);

  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <ChatClient initialMessages={initialMessages} initialConversationId={conversationId} />
    </main>
  );
}
