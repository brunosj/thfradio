'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/reportError';

// Reports JavaScript errors that nothing else caught (see src/app/_lib/reportError.ts).
// Errors inside the page itself are reported by the error pages ([locale]/error.tsx, global-error.tsx).
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) =>
      reportClientError(event.error ?? event.message, { route: 'window.onerror', filename: event.filename });
    const onRejection = (event: PromiseRejectionEvent) =>
      reportClientError(event.reason, { route: 'unhandledrejection' });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
