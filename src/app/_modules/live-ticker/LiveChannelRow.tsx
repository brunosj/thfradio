'use client';

import { useMemo } from 'react';
import type { Locale } from 'date-fns';
import {
  LIVE_CHANNELS,
  type LiveChannelId,
} from '@/app/_lib/liveChannels';
import type { CalendarEntry } from '@/types/ResponsesInterface';
import AdaptiveMarquee from './AdaptiveMarquee';
import {
  getChannelShowContent,
  getChannelShowMeasureKey,
} from './liveTickerUtils';
import { useGlobalStore } from '@/hooks/useStore';
import LiveStreamPlayButton from '@/modules/live-radio/LiveStreamPlayButton';

type LiveChannelRowProps = {
  channelId: LiveChannelId;
  entries: CalendarEntry[];
  localeModule: Locale;
  t: (key: string) => string;
  isPlaying: boolean;
  onToggle: () => void;
  showChannelLabel?: boolean;
};

export default function LiveChannelRow({
  channelId,
  entries,
  localeModule,
  t,
  isPlaying,
  onToggle,
  showChannelLabel = true,
}: LiveChannelRowProps) {
  const activeStreamChannel = useGlobalStore(
    (state) => state.activeStreamChannel,
  );
  const isActiveStream = activeStreamChannel === channelId;
  const label = LIVE_CHANNELS[channelId].label;

  const showContent = useMemo(
    () => getChannelShowContent(entries, localeModule, t),
    [entries, localeModule, t],
  );

  const measureKey = useMemo(
    () => getChannelShowMeasureKey(entries, channelId),
    [entries, channelId],
  );

  return (
    <div
      className={`flex w-full flex-1 min-w-0 items-center gap-2 lg:gap-3 px-2 lg:px-4 py-1.5
        border-b border-thf-blue-500 last:border-b-0 lg:border-b-0
        transition-colors duration-200 ${
        isActiveStream
          ? 'bg-thf-blue-500 text-white rounded-lg'
          : 'bg-white text-thf-blue-500'
      }`}
    >
      <span
        className={`shrink-0 w-5 h-5 inline-flex items-center justify-center font-mono text-[10px] font-bold leading-none border rounded-sm ${
          isActiveStream
            ? 'border-white bg-white text-thf-blue-500'
            : 'border-thf-blue-500 text-thf-blue-500 bg-white'
        }`}
      >
        {channelId}
      </span>

      <div className='shrink-0'>
        <LiveStreamPlayButton
          isPlaying={isPlaying}
          onToggle={onToggle}
          iconClassName='w-4 h-4 lg:w-5 lg:h-5'
          iconFill={isActiveStream ? '#ffffff' : '#1200ff'}
        />
      </div>

      <AdaptiveMarquee
        className='flex-1 min-w-0 leading-none **:text-inherit'
        measureKey={measureKey}
      >
        {showContent}
      </AdaptiveMarquee>

      {showChannelLabel && (
        <span
          className={`hidden sm:inline-flex h-[1em] items-center overflow-hidden shrink-0 font-mono text-[10px] lg:text-[11px] font-medium uppercase tracking-widest leading-none ${
            isActiveStream ? 'text-white/70' : 'text-thf-blue-500/40'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
