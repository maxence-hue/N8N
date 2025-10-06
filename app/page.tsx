import { ChatClient } from '@/components/ChatClient';

// Le composant ne dépend pas des données de requête : on laisse Next.js le
// pré-rendre statiquement afin que Vercel serve toujours / sans fonction
// serverless (évite le NOT_FOUND observé en preview).
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <ChatClient initialMessages={[]} />
    </main>
  );
}
