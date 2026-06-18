'use client';

import { useEffect, useRef } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';

interface MobileDayTabsProps {
  days: Date[];
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}

const selectedTabClass = 'bg-orange-500 text-white';
const unselectedTabClass =
  'bg-thf-blue-500/30 text-gray-300 hover:bg-thf-blue-500/50';

export default function MobileDayTabs({
  days,
  selectedDay,
  onSelectDay,
}: MobileDayTabsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const today = startOfDay(new Date());
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const todayInRange = days.some((day) => isSameDay(day, today));
  const otherDays = days.filter((day) => !isSameDay(day, today));
  const isTodaySelected = isSameDay(selectedDay, today);

  const todayDayName = today.toLocaleString(locale, { weekday: 'short' });
  const todayDayNumber = format(today, 'd');

  const handleToday = () => {
    onSelectDay(today);
  };

  useEffect(() => {
    if (isSameDay(selectedDay, today)) return;

    const tab = tabRefs.current.get(selectedDay.toISOString());
    tab?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedDay, today]);

  const todayGroupClass = isTodaySelected ? selectedTabClass : unselectedTabClass;

  return (
    <div className='mb-0 flex items-center gap-2'>
      {todayInRange && (
        <div className='flex shrink-0 min-h-11 rounded-lg overflow-hidden'>
          <button
            type='button'
            onClick={handleToday}
            aria-label={t('today')}
            className={`px-3 py-2 text-xs font-mono uppercase transition-colors border-r border-white/10 ${todayGroupClass}`}
          >
            {t('today')}
          </button>
          <button
            type='button'
            role='tab'
            id={`mobile-day-tab-${today.toISOString()}`}
            aria-selected={isTodaySelected}
            tabIndex={isTodaySelected ? 0 : -1}
            onClick={handleToday}
            className={`min-w-14 px-2.5 py-2 font-mono text-center transition-colors ${todayGroupClass}`}
          >
            <span className='block text-[10px] uppercase opacity-80'>
              {todayDayName}
            </span>
            <span className='block text-sm font-bold'>{todayDayNumber}</span>
          </button>
        </div>
      )}

      {!todayInRange && (
        <button
          type='button'
          onClick={handleToday}
          className='shrink-0 min-h-11 px-3 py-2 text-xs font-mono uppercase rounded-lg
            bg-orange-600 hover:bg-orange-500 text-white transition-colors'
          aria-label={t('today')}
        >
          {t('today')}
        </button>
      )}

      <div
        role='tablist'
        aria-label={t('programme')}
        className='flex flex-1 gap-1.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-1 px-1'
      >
        {otherDays.map((day) => {
          const isSelected = isSameDay(day, selectedDay);
          const dayName = day.toLocaleString(locale, { weekday: 'short' });
          const dayNumber = format(day, 'd');
          const tabId = `mobile-day-tab-${day.toISOString()}`;

          return (
            <button
              key={day.toISOString()}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(day.toISOString(), el);
                } else {
                  tabRefs.current.delete(day.toISOString());
                }
              }}
              id={tabId}
              type='button'
              role='tab'
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectDay(day)}
              className={`shrink-0 snap-start min-h-11 min-w-14 px-2.5 py-2 rounded-lg font-mono text-center transition-colors
                ${isSelected ? selectedTabClass : unselectedTabClass}`}
            >
              <span className='block text-[10px] uppercase opacity-80'>
                {dayName}
              </span>
              <span className='block text-sm font-bold'>{dayNumber}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
