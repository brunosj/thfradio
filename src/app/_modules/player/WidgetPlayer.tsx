'use client';

import React from 'react';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import MixcloudWidget from '@/modules/mixcloud/MixcloudWidget';
import SoundcloudWidget from '@/modules/soundcloud/SoundcloudWidget';

export default function WidgetPlayer() {
  const activePlayer = useGlobalStore((state) => state.activePlayer);

  // If no active player, don't render
  if (activePlayer === undefined) {
    return null;
  }

  // For Mixcloud, we use the dedicated MixcloudWidget component
  if (activePlayer === ActivePlayer.MIXCLOUD) {
    return <MixcloudWidget />;
  }

  // For Soundcloud, use the dedicated SoundcloudWidget component
  if (activePlayer === ActivePlayer.SOUNDCLOUD) {
    return <SoundcloudWidget />;
  }

  // This should never happen, but just in case
  return null;
}
