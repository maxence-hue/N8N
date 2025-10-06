import { cookies } from 'next/headers';
import { ChatClient } from '@/components/ChatClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default function HomePage() {
  const conversationIdFromCookie = cookies().get('conversationId')?.value;

  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <ChatClient initialMessages={[]} initialConversationId={conversationIdFromCookie} />
    </main>
  );
}
