'use client';

import { useLocale, useTranslations } from 'next-intl';
import { enUS, de } from 'date-fns/locale';
import LiveChannelRow from '@/modules/live-ticker/LiveChannelRow';
import useLiveStreamPlayer from '@/hooks/useLiveStreamPlayer';
import { useCalendarData } from '@/hooks/useCalendarStore';
import { isChannel2Available } from '@/app/_lib/liveChannels';
import { useGlobalStore } from '@/hooks/useStore';
import { FiChevronDown } from 'react-icons/fi';

export default function LiveTicker() {
  const t = useTranslations();
  const locale = useLocale();
  const localeModule = locale === 'de' ? de : enUS;
  const { ch1, ch2 } = useCalendarData({ enablePolling: true });
  const { isPlaying, activeStreamChannel, toggle } = useLiveStreamPlayer();
  const channel2Available = isChannel2Available(ch2);
  const scheduleOpen = useGlobalStore((s) => s.scheduleOpen);
  const setScheduleOpen = useGlobalStore((s) => s.setScheduleOpen);

  return (
    <div className='w-full bg-white border-b border-thf-blue-500'>
      <div className='layout flex items-stretch py-2'>
        <div className='hidden lg:flex shrink-0 items-center pr-4 mr-2 border-r border-thf-blue-500'>
          <span className='text-[11px] font-medium uppercase tracking-widest leading-none text-thf-blue-500/70'>
            Live Now
          </span>
        </div>
        <div className='flex flex-1 min-w-0 flex-col lg:flex-row lg:gap-1 lg:items-stretch'>
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
          {channel2Available && (
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
          )}
        </div>
        {/* Folds the week schedule out under the ticker */}
        <button
          type='button'
          onClick={() => setScheduleOpen(!scheduleOpen)}
          aria-expanded={scheduleOpen}
          aria-controls='week-schedule'
          className={`group shrink-0 ml-2 lg:ml-3 pl-2 lg:pl-4 border-l border-thf-blue-500 flex items-center gap-2 text-thf-blue-500`}
        >
          <span className='hidden md:inline text-[11px] font-medium uppercase tracking-widest leading-none'>
            {t('weekSchedule')}
          </span>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-thf-blue-500 transition-colors
              ${scheduleOpen ? 'bg-thf-blue-500 text-white' : 'group-hover:bg-thf-blue-500 group-hover:text-white'}`}
          >
            <FiChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${scheduleOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </span>
          <span className='sr-only md:hidden'>{t('weekSchedule')}</span>
        </button>
      </div>
    </div>
  );
}
