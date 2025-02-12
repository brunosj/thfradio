'use client';

import Script from 'next/script';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';

export default function SoundcloudPlayer() {
  const trackId = useGlobalStore((state) => state.trackId);
  const activePlayer = useGlobalStore((state) => state.activePlayer);

  return (
    <>
      {activePlayer === ActivePlayer.SOUNDCLOUD && trackId && (
        <iframe
          id='soundcloud-player'
          height={60}
          className='fixed bottom-0 left-0 w-full lg:w-5/6'
          allow='autoplay'
          src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
        />
      )}
      <Script src='https://w.soundcloud.com/player/api.js' />
    </>
  );
}
