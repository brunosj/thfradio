'use client';

import { Component, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { reportClientError } from '@/lib/reportError';
import { PLAYER_BAR_HEIGHT } from '@/app/_modules/player/CloudPlayer';

function PlayerErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations();
  return (
  <div
    className='fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-dark-blue/95 text-white backdrop-blur-md'
    style={{ height: PLAYER_BAR_HEIGHT }}
    role='status'
  >
    <div className='layout flex h-full items-center justify-between gap-4'>
      <p className='min-w-0 truncate font-mono text-[12px] text-orange-400'>{t('playerError')}</p>
      <button
        type='button'
        onClick={onRetry}
        className='shrink-0 rounded-full border border-white/30 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide hover:bg-white/10'
      >
        {t('playerRetry')}
      </button>
    </div>
  </div>
  );
}

/**
 * A player error hides the player bar at most, never the whole page.
 * It tries again on the next change (e.g. the next track).
 */
export default class PlayerErrorBoundary extends Component<
  { children: ReactNode; resetKey?: unknown },
  { failed: boolean; key?: unknown }
> {
  state: { failed: boolean; key?: unknown } = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey?: unknown },
    state: { failed: boolean; key?: unknown },
  ) {
    if (props.resetKey !== state.key) return { failed: false, key: props.resetKey };
    return null;
  }

  componentDidCatch(error: unknown) {
    console.error('Player error:', error);
    // Caught here, so it never reaches the page's error reporting: report it ourselves
    reportClientError(error, { route: 'PlayerErrorBoundary' });
  }

  render() {
    if (this.state.failed) {
      return <PlayerErrorFallback onRetry={() => this.setState({ failed: false })} />;
    }
    return this.props.children;
  }
}