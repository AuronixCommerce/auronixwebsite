'use client';
import { useEffect, useRef, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';

export function PwaRuntime() {
  const [networkState, setNetworkState] = useState<'online' | 'offline' | 'restored'>('online');
  const restoredTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      const reduced = localStorage.getItem('auronix-reduce-glass-motion') === 'true';
      document.documentElement.dataset.acReduceMotion = String(reduced);
    } catch {}
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);

    const offline = () => {
      clearTimeout(restoredTimer.current);
      setNetworkState('offline');
    };
    const online = () => {
      setNetworkState(current => current === 'offline' ? 'restored' : 'online');
      clearTimeout(restoredTimer.current);
      restoredTimer.current = setTimeout(() => setNetworkState('online'), 2600);
    };

    if (!navigator.onLine) offline();
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);

    return () => {
      clearTimeout(restoredTimer.current);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);

  if (networkState === 'online') return null;

  return (
    <div className="ac-network-status" role="status" data-state={networkState}>
      {networkState === 'offline' ? <CloudOff aria-hidden="true" /> : <Wifi aria-hidden="true" />}
      <span>{networkState === 'offline' ? 'You are offline. Saved pages may still be available.' : 'Connection restored.'}</span>
    </div>
  );
}
