// Staff Picks + Community Picks from thfradio.space (the intranet).
// Staff keep their own list there, members vote for recent recordings.
// The image is the clean photo behind the show graphic where one exists,
// otherwise the SoundCloud cover (imageSource "soundcloud").
// API: THF_Space-main/app/api/public/community-picks/route.ts

export type PickImage = {
  originalUrl: string;
  squareUrl: string | null;
  width: number;
  height: number;
};

export type Pick = {
  rank: number;
  trackId: string;
  title: string;
  showName: string;
  airDate: string;
  durationSec: number | null;
  soundcloudUrl: string;
  genres: string[];
  showId: string | null;
  image: PickImage;
  imageSource: 'photo' | 'soundcloud';
  /** community picks only */
  votes?: number;
  /** staff picks only */
  note?: string | null;
};

export type Picks = { staff: Pick[]; community: Pick[] };

const PICKS_URL =
  process.env.COMMUNITY_PICKS_URL ||
  'https://www.thfradio.space/api/public/community-picks';

// Any timetable key of thfradio.space works here, so the Channel 2 key is reused.
const PICKS_KEY = process.env.COMMUNITY_PICKS_KEY || process.env.CALENDAR_2_KEY;

const EMPTY: Picks = { staff: [], community: [] };

/** Community Picks: shown in random order out of the top COMMUNITY_POOL. */
const COMMUNITY_POOL = 18;
const COMMUNITY_SHOWN = 12;

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A fresh mix of the top community picks. Runs when the homepage is rendered,
 * so the order changes every few minutes (page revalidation).
 */
export function mixCommunityPicks(picks: Picks): Picks {
  return {
    ...picks,
    community: shuffled(picks.community.slice(0, COMMUNITY_POOL)).slice(0, COMMUNITY_SHOWN),
  };
}

/** Never throws: no picks means the sections are left out. */
export async function fetchPicks(): Promise<Picks> {
  if (!PICKS_KEY) {
    if (process.env.NODE_ENV === 'development') return samplePicks();
    console.error('fetchPicks: COMMUNITY_PICKS_KEY / CALENDAR_2_KEY missing');
    return EMPTY;
  }

  try {
    const url = new URL(PICKS_URL);
    url.searchParams.set('type', 'all');
    url.searchParams.set('limit', String(COMMUNITY_POOL));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${PICKS_KEY}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`fetchPicks: upstream error ${res.status}`);
      return EMPTY;
    }
    const data = await res.json();
    return {
      staff: Array.isArray(data?.staff) ? data.staff : [],
      community: Array.isArray(data?.community) ? data.community : [],
    };
  } catch (error) {
    console.error('fetchPicks failed:', error);
    return EMPTY;
  }
}

// Local preview without a key: made-up picks with stock photos.
function samplePicks(): Picks {
  const day = 24 * 60 * 60 * 1000;
  const item = (i: number, title: string, showName: string, genres: string[]): Pick => ({
    rank: i + 1,
    trackId: String(1900000000 + i),
    title,
    showName,
    airDate: new Date(Date.now() - (i + 2) * 3 * day).toISOString(),
    durationSec: 3600 + i * 900,
    soundcloudUrl: 'https://soundcloud.com/thfradio',
    genres,
    showId: null,
    image: {
      originalUrl: `https://picsum.photos/seed/thf${i}/900/1100`,
      squareUrl: `https://picsum.photos/seed/thf${i}/600/600`,
      width: 900,
      height: 1100,
    },
    imageSource: 'photo',
  });
  const staff = [
    item(0, 'Tempelhof Tapes w/ Mira Solo', 'Tempelhof Tapes', ['Ambient', 'Field Recording']),
    item(1, 'Feuerwache Nights w/ DJ Kuro', 'Feuerwache Nights', ['House', 'Disco']),
    item(2, 'Morning Static', 'Morning Static', ['Jazz', 'Soul']),
    item(3, 'Dub Gardens w/ Lenni', 'Dub Gardens', ['Dub', 'Reggae']),
    item(16, 'THF Presents: Nachtflug', 'THF Presents', ['Electro', 'Breaks']),
  ].map((p, i) => ({
    ...p,
    note: i % 2 === 0 ? 'Two hours that feel like a summer evening on the field.' : null,
  }));
  const community = [
    item(4, 'Hangar Bass w/ Okto', 'Hangar Bass', ['Drum & Bass']),
    item(5, 'Slow Sunday', 'Slow Sunday', ['Downtempo']),
    item(6, 'THF Presents: Fiestuki', 'THF Presents', ['Cumbia', 'Latin']),
    item(7, 'Radio Kiez w/ Ana B.', 'Radio Kiez', ['Talk']),
    item(8, 'Concrete Waves', 'Concrete Waves', ['Techno']),
    item(9, 'Neue Töne', 'Neue Töne', ['Experimental']),
    item(10, 'Feldfunk w/ Juno', 'Feldfunk', ['Broken Beat', 'Jazz']),
    item(11, 'Afterhours Tempelhof', 'Afterhours Tempelhof', ['Minimal']),
    item(12, 'Soul Kitchen Radio', 'Soul Kitchen Radio', ['Soul', 'Funk']),
    item(13, 'Kassettendeck', 'Kassettendeck', ['Lo-Fi', 'Beats']),
    item(14, 'Grime Time w/ MC Hafen', 'Grime Time', ['Grime']),
    item(15, 'Balkon Sessions', 'Balkon Sessions', ['Folk', 'Acoustic']),
  ].map((p, i) => ({ ...p, rank: i + 1, votes: 40 - i * 3 }));
  return { staff, community };
}
