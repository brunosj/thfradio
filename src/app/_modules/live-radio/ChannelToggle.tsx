'use client';

import { useTranslations } from 'next-intl';
import type { LiveChannelId } from '@/app/_lib/liveChannels';

type ChannelToggleProps = {
  channel2Available: boolean;
  activeChannel: LiveChannelId;
  onChannelChange: (channel: LiveChannelId) => void;
  variant?: 'calendar' | 'ticker';
};

export default function ChannelToggle({
  channel2Available,
  activeChannel,
  onChannelChange,
  variant = 'calendar',
}: ChannelToggleProps) {
  const t = useTranslations('liveChannels');

  const handleSelect = (channel: LiveChannelId) => {
    if (channel === activeChannel) return;
    onChannelChange(channel);
  };

  const baseButton =
    variant === 'ticker'
      ? 'px-2 py-0.5 text-xs font-mono uppercase transition-colors cursor-pointer'
      : 'px-3 py-1.5 lg:px-4 lg:py-2 text-sm font-mono uppercase transition-colors cursor-pointer';

  const containerClass =
    variant === 'ticker'
      ? 'inline-flex rounded border border-thf-blue-500 overflow-hidden shrink-0'
      : 'inline-flex rounded-lg border border-gray-600 overflow-hidden';

  const groupAriaLabel =
    variant === 'calendar' ? t('scheduleAriaLabel') : t('label');

  return (
    <div
      className={
        variant === 'calendar'
          ? 'flex justify-end items-center gap-3 px-4 lg:pr-16 pb-0 lg:pb-6'
          : 'flex items-center'
      }
      role='group'
      aria-label={groupAriaLabel}
    >
      {variant === 'calendar' && (
        <span className='font-mono text-sm uppercase text-gray-400 shrink-0'>
          {t('scheduleLabel')}
        </span>
      )}
      <div className={containerClass}>
        <button
          type='button'
          className={`${baseButton} ${
            activeChannel === 1
              ? 'bg-thf-blue-500 text-white'
              : variant === 'ticker'
                ? 'bg-white text-thf-blue-500 hover:bg-gray-100'
                : 'bg-dark-blue text-white hover:bg-gray-800'
          }`}
          aria-pressed={activeChannel === 1}
          onClick={() => handleSelect(1)}
        >
          {t('thf1')}
        </button>
        {channel2Available && (
          <button
            type='button'
            className={`${baseButton} border-l ${
              variant === 'ticker' ? 'border-thf-blue-500' : 'border-gray-600'
            } ${
              activeChannel === 2
                ? 'bg-thf-blue-500 text-white'
                : variant === 'ticker'
                  ? 'bg-white text-thf-blue-500 hover:bg-gray-100'
                  : 'bg-dark-blue text-white hover:bg-gray-800'
            }`}
            aria-pressed={activeChannel === 2}
            onClick={() => handleSelect(2)}
          >
            {t('thf2')}
          </button>
        )}
      </div>
    </div>
  );
}
