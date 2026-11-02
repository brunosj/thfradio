'use client';

import { Component, type ReactNode } from 'react';

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
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
