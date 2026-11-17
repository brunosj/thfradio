'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/reportError';
import { reloadOnChunkError } from '@/lib/chunkReload';

// Reports JavaScript errors that nothing else caught (see src/app/_lib/reportError.ts).
// Errors inside the page itself are reported by the error pages ([locale]/error.tsx, global-error.tsx).
export default function ErrorReporter() {
  useEffect(() => {
    // A script piece that didn't load (old page after a deploy, slow line): reload once instead
    const onError = (event: ErrorEvent) => {
      if (reloadOnChunkError(event.error ?? event.message)) return;
      reportClientError(event.error ?? event.message, { route: 'window.onerror', filename: event.filename });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (reloadOnChunkError(event.reason)) return;
      reportClientError(event.reason, { route: 'unhandledrejection' });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
