'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Auronix Application Recovery]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f6f7f9', color: '#172033', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: 'min(100%, 520px)', border: '1px solid #d9dee7', borderRadius: 16, background: '#fff', padding: 32, boxSizing: 'border-box' }}>
            <p style={{ margin: 0, color: '#1d65bc', fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Auronix recovery</p>
            <h1 style={{ margin: '14px 0 10px', fontSize: 30, letterSpacing: '-.035em' }}>Something interrupted the application.</h1>
            <p style={{ margin: 0, color: '#5d6675', lineHeight: 1.65 }}>Reload the Auronix experience. No form or account change was made by this error screen.</p>
            {error.digest && <p style={{ margin: '14px 0 0', color: '#707887', fontSize: 12 }}>Reference: {error.digest}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
              <button type="button" onClick={reset} style={{ minHeight: 44, border: 0, borderRadius: 10, background: '#172033', color: '#fff', padding: '0 18px', fontWeight: 650, cursor: 'pointer' }}>Try again</button>
              <button type="button" onClick={() => window.location.assign('/')} style={{ minHeight: 44, border: '1px solid #cbd2de', borderRadius: 10, background: '#fff', color: '#172033', padding: '0 18px', fontWeight: 650, cursor: 'pointer' }}>Return home</button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
