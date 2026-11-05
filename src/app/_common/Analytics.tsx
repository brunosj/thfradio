'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { EVENTS, track, UMAMI_DOMAINS, UMAMI_RECORDER, UMAMI_SCRIPT, UMAMI_WEBSITE_ID } from '@/app/_lib/analytics';

// Loads the analytics script (page views + marked clicks) and the click heatmap recorder,
// only on thfradio.de itself (not on localhost or preview deployments), and counts every
// link to another site as "out: <host>".
export default function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!UMAMI_DOMAINS.includes(window.location.hostname)) return;
    setEnabled(true);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol === 'mailto:') return track(EVENTS.outbound('email'));
      if (!/^https?:$/.test(url.protocol)) return;
      const host = url.hostname.replace(/^www\./, '');
      if (UMAMI_DOMAINS.includes(url.hostname) || host === window.location.hostname.replace(/^www\./, '')) return;
      track(EVENTS.outbound(host));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!enabled) return null;
  return (
    <>
      <Script
        src={UMAMI_SCRIPT}
        data-website-id={UMAMI_WEBSITE_ID}
        data-domains={UMAMI_DOMAINS.join(',')}
        strategy='afterInteractive'
      />
      <Script src={UMAMI_RECORDER} data-website-id={UMAMI_WEBSITE_ID} strategy='lazyOnload' />
    </>
  );
}
