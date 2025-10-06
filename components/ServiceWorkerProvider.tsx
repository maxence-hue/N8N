'use client';

import { ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
}

export function ServiceWorkerProvider({ children }: Props) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => console.error('Service worker registration failed', error));
    };

    window.addEventListener('load', register, { once: true });

    return () => {
      window.removeEventListener('load', register);
    };
  }, []);

  return <>{children}</>;
}
