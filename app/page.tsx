import { ChatClient } from '@/components/ChatClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <ChatClient initialMessages={[]} />
    </main>
  );
}
