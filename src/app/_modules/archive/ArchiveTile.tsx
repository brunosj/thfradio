'use client';

// One archive show as a card in the intranet's Latest Shows look (ShowCard).
// Click on the photo plays it in the site's Mixcloud or SoundCloud player.
import { useLocale, useTranslations } from 'next-intl';
import ShowCard from '@/common/ui/ShowCard';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import { getMixcloudKey } from '@/utils/getMixcloudKey';
import { formatDuration, formatShowDate, type ArchiveShow } from '@/utils/showUtils';

/** Plays the show in the site's Mixcloud or SoundCloud player. */
function useArchivePlayer({ show }: ArchiveShow) {
  const activePlayer = useGlobalStore((s) => s.activePlayer);
  const currentShowUrl = useGlobalStore((s) => s.currentShowUrl);
  const showKeySet = useGlobalStore((s) => s.showKeySet);
  const trackIdSet = useGlobalStore((s) => s.trackIdSet);
  const setCurrentShowUrl = useGlobalStore((s) => s.setCurrentShowUrl);

  const isMixcloud = show.platform === 'mixcloud';
  const isCurrent =
    currentShowUrl === show.url &&
    activePlayer === (isMixcloud ? ActivePlayer.MIXCLOUD : ActivePlayer.SOUNDCLOUD);

  const play = () => {
    if (isMixcloud) showKeySet(getMixcloudKey(show.url));
    else if (show.key) trackIdSet(show.key);
    setCurrentShowUrl(show.url);
  };

  return { isCurrent, play };
}

export default function ArchiveTile({ item, lazy = true }: { item: ArchiveShow; lazy?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { isCurrent, play } = useArchivePlayer(item);
  const meta = [formatShowDate(item.date, locale), formatDuration(item.durationSec)].filter(Boolean).join(' | ');

  return (
    <ShowCard
      title={item.title}
      meta={meta}
      genres={item.genres}
      image={item.image}
      isCurrent={isCurrent}
      onPlay={play}
      playLabel={t('archivePlay', { title: item.title })}
      lazy={lazy}
    />
  );
}
