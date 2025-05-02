'use client';

import React from 'react';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import MixcloudWidget from '@/modules/mixcloud/MixcloudWidget';
import SoundcloudWidget from '@/modules/soundcloud/SoundcloudWidget';

export default function WidgetPlayer() {
  console.log('CustomAudioPlayer rendering');

  const activePlayer = useGlobalStore((state) => state.activePlayer);

  // If no active player, don't render
  if (activePlayer === undefined) {
    console.log('No active player, not rendering');
    return null;
  }

  // For Mixcloud, we use the dedicated MixcloudWidget component
  if (activePlayer === ActivePlayer.MIXCLOUD) {
    console.log('Using MixcloudWidget');
    return <MixcloudWidget />;
  }

  // For Soundcloud, use the dedicated SoundcloudWidget component
  if (activePlayer === ActivePlayer.SOUNDCLOUD) {
    console.log('Using SoundcloudWidget');
    return <SoundcloudWidget />;
  }

  // This should never happen, but just in case
  return null;
}
