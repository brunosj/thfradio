'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/reportError';

// Last resort when even the page frame (header, player) crashed. It replaces the root layout,
// so it brings its own <html>/<body> and has neither translations nor the site's CSS:
// inline styles in the site's colours, both languages at once.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // With a digest the error happened on the server and src/instrumentation.ts already reported it
    if (!error.digest) reportClientError(error, { route: 'global-error.tsx' });
  }, [error]);

  return (
    <html lang='en'>
      <head>
        <title>THF Radio</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          background: '#100f2e',
          color: '#fff',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          textAlign: 'center',
        }}
      >
        <main>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 8px' }}>Something went wrong</h1>
          <p lang='de' style={{ fontSize: '1.25rem', margin: '0 0 24px', opacity: 0.8 }}>
            Etwas ist schiefgelaufen
          </p>
          <p style={{ margin: '0 0 4px' }}>The page could not be loaded. Please try again.</p>
          <p lang='de' style={{ margin: '0 0 32px', opacity: 0.8 }}>
            Die Seite konnte nicht geladen werden. Bitte versuch es noch einmal.
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            style={{
              font: 'inherit',
              fontSize: '0.875rem',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid #100f2e',
              background: '#fff',
              color: '#100f2e',
              cursor: 'pointer',
            }}
          >
            Reload · Neu laden
          </button>
        </main>
      </body>
    </html>
  );
}
