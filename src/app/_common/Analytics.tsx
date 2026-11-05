'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { EVENTS, track, UMAMI_DOMAINS, UMAMI_RECORDER, UMAMI_SCRIPT, UMAMI_WEBSITE_ID } from '@/app/_lib/analytics';

const CLICKABLE = 'a[href],button,[role="button"],[role="tab"],[role="menuitem"],summary,select,label';

/** Where on the page: a marked area (data-area="player"…), else header / footer / page. */
function areaOf(el: Element): string {
  const marked = el.closest('[data-area]')?.getAttribute('data-area');
  if (marked) return marked;
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  if (el.closest('nav')) return 'menu';
  return 'page';
}

/** A short name for what was clicked: its label, its text, an image's alt text or the link's path. */
function labelOf(el: Element): string {
  const clean = (v: string | null | undefined) => (v || '').replace(/\s+/g, ' ').trim();
  let label =
    clean(el.getAttribute('aria-label')) ||
    clean(el.getAttribute('title')) ||
    clean((el as HTMLElement).innerText?.split('\n').find((line) => line.trim())) ||
    clean(el.querySelector('img[alt]')?.getAttribute('alt'));
  if (!label && el instanceof HTMLAnchorElement) {
    try {
      label = new URL(el.href).pathname;
    } catch {
      // ignore
    }
  }
  if (!label) label = el.tagName.toLowerCase();
  return label.length > 28 ? `${label.slice(0, 27)}…` : label;
}

// Loads the analytics script (page views + marked clicks) and the click heatmap recorder,
// only on thfradio.de itself (not on localhost, preview deployments or inside the intranet's
// heatmap view, which shows the site in a frame). Every click on a link or button is counted
// as "click: <area> · <label>", links to other sites as "out: <host>".
export default function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!UMAMI_DOMAINS.includes(window.location.hostname)) return;
    let framed = true;
    try {
      framed = window.self !== window.top;
    } catch {
      // cross-origin parent: framed
    }
    if (framed) return;
    setEnabled(true);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE);
      if (!el) return;
      if (el instanceof HTMLAnchorElement) {
        let url: URL | null = null;
        try {
          url = new URL(el.href, window.location.href);
        } catch {
          // fall through: counted as a click
        }
        if (url?.protocol === 'mailto:') return track(EVENTS.outbound('email'));
        const host = url?.hostname.replace(/^www\./, '') || '';
        const ownHost = window.location.hostname.replace(/^www\./, '');
        if (url && /^https?:$/.test(url.protocol) && host !== ownHost && !UMAMI_DOMAINS.includes(url.hostname)) {
          return track(EVENTS.outbound(host));
        }
      }
      const area = areaOf(el);
      // Chat: only fixed button labels, never text people typed (names, messages)
      const label = area === 'chat' ? el.getAttribute('aria-label') || el.getAttribute('title') || 'button' : labelOf(el);
      track(EVENTS.click(area, label), { path: window.location.pathname });
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
