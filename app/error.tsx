'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Auronix Page Recovery]', error);
  }, [error]);

  return (
    <main className="ac-recovery-screen">
      <section className="ac-content-panel ac-recovery-card" role="alert">
        <span className="ac-recovery-icon"><AlertTriangle aria-hidden="true" /></span>
        <p className="ac-eyebrow">Auronix recovery</p>
        <h1>This page could not finish loading.</h1>
        <p>Your information has not been changed. Try the page again, or return home and continue from there.</p>
        {error.digest && <small>Reference: {error.digest}</small>}
        <div>
          <button type="button" className="ac-button" onClick={reset}><RotateCcw size={17} />Try again</button>
          <Link href="/" className="ac-button ac-button-secondary"><Home size={17} />Home</Link>
        </div>
      </section>
    </main>
  );
}
