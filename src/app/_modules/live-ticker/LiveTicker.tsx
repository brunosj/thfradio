'use client';

import { useLocale, useTranslations } from 'next-intl';
import { enUS, de } from 'date-fns/locale';
import LiveChannelRow from '@/modules/live-ticker/LiveChannelRow';
import useLiveStreamPlayer from '@/hooks/useLiveStreamPlayer';
import { useCalendarData } from '@/hooks/useCalendarStore';

export default function LiveTicker() {
  const t = useTranslations();
  const locale = useLocale();
  const localeModule = locale === 'de' ? de : enUS;
  const { ch1, ch2 } = useCalendarData({ enablePolling: true });
  const { isPlaying, activeStreamChannel, toggle } = useLiveStreamPlayer();

  return (
    <div className='w-full bg-white border-b border-thf-blue-500'>
      <div className='layout flex items-stretch py-2 font-mono'>
        <div className='hidden lg:flex shrink-0 items-center pr-4 mr-2 border-r border-thf-blue-500 text-xs uppercase text-thf-blue-500'>
          <span className='font-semibold tracking-wide'>Live Now</span>
        </div>
        <div className='flex flex-1 min-w-0 items-stretch'>
          <LiveChannelRow
            key={1}
            channelId={1}
            entries={ch1}
            localeModule={localeModule}
            t={t}
            isPlaying={isPlaying && activeStreamChannel === 1}
            onToggle={() => {
              void toggle(1);
            }}
          />
          <LiveChannelRow
            key={2}
            channelId={2}
            entries={ch2}
            localeModule={localeModule}
            t={t}
            isPlaying={isPlaying && activeStreamChannel === 2}
            onToggle={() => {
              void toggle(2);
            }}
          />
        </div>
      </div>
    </div>
  );
}
