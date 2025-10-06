import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { PropsWithChildren } from 'react';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#2563eb'
};

export const metadata: Metadata = {
  title: 'ADSolar Chat Opérateur',
  description: "Interface de chat pour l'équipe ADSolar",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ADSolar Chat'
  }
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-slate-100`}> 
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
