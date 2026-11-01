import type {
  CloudShowListItem,
  CloudShowTypes,
  ValidShow,
} from '@/types/ResponsesInterface';
import { parse, toDate, isValid, format } from 'date-fns';
import { cleanGenres } from '@/utils/genres';

export const getShowName = (item: CloudShowListItem): string | null => {
  if (!item.name?.includes('//')) {
    return null;
  }
  const showNameSplitted = item.name.split('//');
  return showNameSplitted[0].trim();
};

export const getDateFromShow = (item: CloudShowListItem): Date | null => {
  if (!item.name?.includes('//')) {
    return null;
  }

  const showNameSplitted = item.name.split('//');
  const dateStr =
    showNameSplitted.length > 0 ? showNameSplitted[1]?.trim() : null;

  if (dateStr) {
    // First try to parse as 'dd.MM.yy'
    let parsedDate = parse(dateStr, 'dd.MM.yy', new Date());

    if (!isValid(parsedDate)) {
      // If it was invalid, try to parse as 'dd.MM.yyyy'
      parsedDate = parse(dateStr, 'dd.MM.yyyy', new Date());
    }

    if (isValid(parsedDate)) {
      return toDate(parsedDate);
    }
  }

  return null;
};

export const getFormattedDateString = (
  item: CloudShowListItem,
): string | null => {
  // const date = formatDate(item);
  const date = getDateFromShow(item);
  return date ? format(date, 'dd.MM.yyyy') : null;
};

const getValidShows = (shows: CloudShowTypes[]): ValidShow[] => {
  return shows
    .map((show) => {
      const date = getDateFromShow(show);
      return date ? { ...show, date } : null;
    })
    .filter((show): show is ValidShow => show !== null);
};

const sortShows = (shows: ValidShow[]): ValidShow[] => {
  return shows.sort((a, b) => {
    return b.date.getTime() - a.date.getTime();
  });
};

export const processShows = (shows: CloudShowTypes[]): ValidShow[] => {
  const validShows = getValidShows(shows);
  const sortedShows = sortShows(validShows);
  return sortedShows;
};

// ---------------------------------------------------------------------------
// Archive browsing (genre chips + tiles)
// ---------------------------------------------------------------------------

/** One archive show, ready for the genre filter and the tile. */
export type ArchiveShow = {
  id: string;
  /** "Name" without the "// dd.MM.yy" stamp */
  title: string;
  genres: string[];
  date: Date;
  durationSec: number | null;
  image: string | null;
  show: ValidShow;
};

/** Cleaned genres; older cached payloads only have raw tags. */
export const getShowGenres = (item: CloudShowListItem): string[] =>
  item.genres ?? cleanGenres((item.tags ?? []).map((t) => t?.name));

export const toArchiveShow = (show: ValidShow): ArchiveShow => {
  const image = show.pictures?.extra_large || show.picture || null;
  return {
    id: String(show.key ?? show.url),
    title: getShowName(show) || show.name || show.title || '',
    genres: getShowGenres(show),
    date: show.date,
    durationSec: show.durationSec ?? null,
    image: image && !image.includes('placeholder') ? image : null,
    show,
  };
};

/** Newest first, as tiles. */
export const toArchiveShows = (shows: CloudShowTypes[]): ArchiveShow[] =>
  processShows(shows).map(toArchiveShow);

/** 3714 → "1h 02m", 1500 → "25 min" (as on the intranet) */
export const formatDuration = (sec: number | null | undefined): string => {
  if (!sec) return '';
  // Round the total first, so 7170 s is "2h 00m", not "1h 60m"
  const total = Math.round(sec / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
};

/** "16 Oct 2026" / "16. Okt. 2026" */
export const formatShowDate = (date: Date, locale: string): string =>
  date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
