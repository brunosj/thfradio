import { notFound } from 'next/navigation';

// Any address under /en or /de that no page handles: a real 404 with the site's
// layout ([locale]/not-found.tsx). Without this, unknown addresses fell through to the
// root not-found page outside the language context and answered with a server error
// (500) – Google Search Console reported every one of them.
export default function CatchAllNotFound() {
  notFound();
}
