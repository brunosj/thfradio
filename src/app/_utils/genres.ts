// Genres for browsing the archive (after NTS Explore), ported from the
// intranet (thfradio.space: lib/genre-families.ts, lib/soundcloud-genres.ts,
// community-picks/PickFilters.tsx) so both sites sort shows the same way.
//
// SoundCloud genres and Mixcloud tags are free text ("Deep House", "dub
// techno", "Trip-hop"). cleanGenres() tidies them up, familyOf() sorts each
// one into a family by keyword, genreFamilies() counts families and their
// subgenres for the chips, applyGenreFilter() does the filtering.
// Client-safe, no imports.

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export type GenreFamily = { id: string; label: string; labelDe?: string; match: RegExp };

// Order matters: the first family whose pattern matches wins, so the more
// specific ones come first ("dubstep" before "dub", "electronica" before "electro").
export const GENRE_FAMILIES: GenreFamily[] = [
  { id: 'talks', label: 'Talks / Spoken Word', labelDe: 'Talks / Wortbeiträge', match: /\b(talks?|spoken|podcast|interview|radio ?play|hörspiel|news|storytelling|stories|poetry|lecture)\b/i },
  { id: 'uk-dance', label: 'UK Dance / Bass', match: /(dubstep|grime|garage|\bukg\b|2[- ]?step|jungle|drum ?(&|and|n|'n')? ?bass|\bd(&|n)b\b|\bbass\b|uk dance|footwork|juke)/i },
  { id: 'reggae', label: 'Reggae / Dub', match: /(reggae|dancehall|\bdub\b(?! ?techno)|roots|ska\b|rocksteady|lovers rock)/i },
  { id: 'disco', label: 'Disco / Boogie', match: /(disco|boogie|italo|\bedits?\b|cosmic)/i },
  { id: 'electronica', label: 'Electronica / Downtempo', match: /(electronica|\belectronic\b|downtempo|trip[- ]?hop|\bbeats\b|\bidm\b|chill|lo-?fi|leftfield|glitch|balearic)/i },
  { id: 'electro', label: 'Electro / Breaks', match: /(\belectro\b|breaks|breakbeat|broken ?beat|\bebm\b|miami bass)/i },
  { id: 'house-techno', label: 'House / Techno', match: /(house|techno|minimal|\bacid\b|trance|detroit|progressive|rave|hardcore|gabber|\bdj ?set\b|club|\bedm\b|\bdance\b|\bpsy\b|psy-?trance|\bgoa\b|eurodance|hi-?nrg)/i },
  { id: 'ambient', label: 'Ambient / Experimental', labelDe: 'Ambient / Experimentell', match: /(ambient|experimental|drone|noise|avant|field record|new ?age|sound ?art|musique|modular|kosmische|soundscape)/i },
  { id: 'hiphop', label: 'Hip-Hop / RnB', match: /(hip[- ]?hop|\brap\b|\br ?(&|n|'n')? ?b\b|rnb|trap|drill|boom ?bap|g-?funk|memphis|phonk|grime rap)/i },
  { id: 'jazz', label: 'Jazz', match: /(jazz|bebop|swing|fusion)/i },
  { id: 'soul-funk', label: 'Soul / Funk', match: /(soul|funk|rhythm ?(&|and) ?blues|gospel|blues|motown)/i },
  { id: 'global', label: 'Afro / Latin / Global', match: /(afro|amapiano|\bmpb\b|gqom|kuduro|highlife|latin|cumbia|salsa|baile|brazil|bossa|samba|world|arab|turk|balkan|tropical|reggaeton|dembow|asia|k-?pop|j-?pop|bollywood|(^|[^a-z])ra[iï]($|[^a-z])|chaabi|maghreb|desert blues)/i },
  { id: 'folk', label: 'Folk / Country', match: /(folk|country|americana|bluegrass|acoustic|singer-?songwriter|chanson)/i },
  { id: 'rock', label: 'Rock / Punk / Wave', match: /(rock|punk|slowcore|sadcore|\bemo\b|indie|alternative|new wave|\bwave\b|shoegaze|metal|grunge|post-?punk|garage rock|psych)/i },
  { id: 'pop', label: 'Pop', match: /(\bpop\b|synth-?pop|hyperpop|schlager|city ?pop|italo ?pop)/i },
  { id: 'classical', label: 'Classical / Soundtrack', labelDe: 'Klassik / Soundtrack', match: /(classical|opera|baroque|orchestra|soundtrack|score|piano|minimalism)/i },
];

export const OTHER_FAMILY: GenreFamily = { id: 'other', label: 'Other', labelDe: 'Sonstiges', match: /$^/ };

export const familyLabel = (f: Pick<GenreFamily, 'label' | 'labelDe'>, locale: string) =>
  (locale === 'de' && f.labelDe) || f.label;

const familyCache = new Map<string, GenreFamily>();

/** The family a single genre belongs to ("Deep House" → House / Techno). */
export function familyOf(genre: string): GenreFamily {
  const key = genre.trim().toLowerCase();
  let f = familyCache.get(key);
  if (!f) {
    f = GENRE_FAMILIES.find((x) => x.match.test(key)) ?? OTHER_FAMILY;
    familyCache.set(key, f);
  }
  return f;
}

// ---------------------------------------------------------------------------
// Cleaning free-text genres (SoundCloud genre + tags, Mixcloud tags)
// ---------------------------------------------------------------------------

/** The genres offered in the intranet's SoundCloud upload dialog. */
const GENRE_OPTIONS = [
  'Afrobeat', 'Alternative Rock / Punk', 'Ambient', 'Beats', 'Breaks', 'Broken Beat', 'Disco / Boogie',
  'Downtempo', 'Electro', 'Experimental', 'Funk', 'Hip-Hop', 'House', 'Jazz', 'Reggae', 'RnB',
  'Soul / Rhythm & Blues', 'Talks', 'Techno', 'Trip-hop', 'UK Dance / Grime',
];

const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Spellings we always show the same way (key = letters/digits only, lowercase). */
const CANONICAL: Record<string, string> = {
  ...Object.fromEntries(GENRE_OPTIONS.map((g) => [keyOf(g), g])),
  hiphop: 'Hip-Hop',
  rap: 'Rap',
  rb: 'RnB',
  randb: 'RnB',
  rnb: 'RnB',
  triphop: 'Trip-hop',
  dnb: 'Drum & Bass',
  db: 'Drum & Bass',
  drumbass: 'Drum & Bass',
  drumandbass: 'Drum & Bass',
  drumnbass: 'Drum & Bass',
  ukg: 'UK Garage',
  ukgarage: 'UK Garage',
  '2step': '2-Step',
  idm: 'IDM',
  ebm: 'EBM',
  edm: 'EDM',
  lofi: 'Lo-Fi',
  nudisco: 'Nu Disco',
  italodisco: 'Italo Disco',
  electronic: 'Electronic',
  electronica: 'Electronica',
  danceedm: 'Dance & EDM',
  postpunk: 'Post-Punk',
  synthpop: 'Synth-Pop',
  newwave: 'New Wave',
  kpop: 'K-Pop',
  jpop: 'J-Pop',
  spokenword: 'Spoken Word',
  talk: 'Talks',
};

/** Not a genre: dropped. */
const NOT_A_GENRE = new Set([
  'mix', 'dj mix', 'djmix', 'dj set', 'djset', 'set', 'live', 'live set', 'radio', 'radio show', 'show',
  'thf', 'thf radio', 'thfradio', 'berlin', 'tempelhof', 'none', 'other', 'various', 'misc', 'music', 'unknown', 'n/a',
]);

/** Words kept in capitals when title-casing. */
const UPPER = new Set(['uk', 'us', 'dj', 'idm', 'ebm', 'edm', 'ny', 'la', 'mc', 'ii', 'iii']);

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) =>
      w
        .split('-')
        .map((p) => (UPPER.has(p.toLowerCase()) ? p.toUpperCase() : p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join('-'),
    )
    .join(' ');
}

/**
 * Free-text genres → clean list: split on , ; | # and on "/" (except the
 * upload dialog's own "Disco / Boogie"-style names), strip stray punctuation,
 * fix known spellings, title-case the rest, drop non-genres ("dj mix",
 * "berlin"), no duplicates.
 *   "techno, , deep house;#acid" → ["Techno", "Deep House", "Acid"]
 *   "hip hop / r&b"              → ["Hip-Hop", "RnB"]
 */
export function cleanGenres(raw: string | (string | null | undefined)[] | null | undefined, max = 6): string[] {
  const parts = (Array.isArray(raw) ? raw : [raw ?? '']).flatMap((s) => String(s ?? '').split(/[,;|#\n]+/));
  const out = new Map<string, string>();
  for (let part of parts) {
    part = part.replace(/["'`´]/g, '').replace(/\s+/g, ' ').trim();
    if (!part) continue;
    const whole = CANONICAL[keyOf(part)];
    const pieces = whole ? [whole] : part.split(/\s*\/\s*/);
    for (let p of pieces) {
      p = p.replace(/^[\s.\-–—:+*_~]+|[\s.\-–—:+*_~]+$/g, '').trim();
      if (!p || p.length > 40 || /^\d+$/.test(p) || NOT_A_GENRE.has(p.toLowerCase())) continue;
      const nice = CANONICAL[keyOf(p)] ?? titleCase(p);
      const key = nice.toLowerCase();
      if (!out.has(key)) out.set(key, nice);
    }
  }
  return [...out.values()].slice(0, max);
}

// ---------------------------------------------------------------------------
// Counting and filtering (PickFilters.tsx on the intranet)
// ---------------------------------------------------------------------------

/** What the filter needs from a show. */
export type GenreFilterable = { id: string; title: string; genres: string[] };

export type GenreCount = { key: string; label: string; count: number };
export type FamilyCount = { id: string; label: string; labelDe?: string; count: number; subs: GenreCount[] };

const az = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * Genre families across these shows, A–Z ("Other" last), each with its
 * subgenres A–Z. Counts are shows, not genre mentions.
 */
export function genreFamilies(shows: GenreFilterable[]): FamilyCount[] {
  type Acc = { fam: GenreFamily; shows: Set<string>; subs: Map<string, { label: string; shows: Set<string> }> };
  const fams = new Map<string, Acc>();
  for (const s of shows)
    for (const raw of s.genres) {
      const g = raw.trim();
      if (!g) continue;
      const fam = familyOf(g);
      const f = fams.get(fam.id) ?? { fam, shows: new Set<string>(), subs: new Map() };
      f.shows.add(s.id);
      const key = g.toLowerCase();
      const sub = f.subs.get(key) ?? { label: g, shows: new Set<string>() };
      sub.shows.add(s.id);
      f.subs.set(key, sub);
      fams.set(fam.id, f);
    }
  return [...fams.values()]
    .map((f) => ({
      id: f.fam.id,
      label: f.fam.label,
      labelDe: f.fam.labelDe,
      count: f.shows.size,
      subs: [...f.subs.entries()]
        .map(([key, s]) => ({ key, label: s.label, count: s.shows.size }))
        .sort((a, b) => az(a.label, b.label)),
    }))
    .sort((a, b) => (a.id === 'other' ? 1 : b.id === 'other' ? -1 : az(a.label, b.label)));
}

/** families = picked family ids; subs = picked subgenres (lowercase), narrowing their family. */
export type GenreFilter = { q: string; families: string[]; subs: string[] };

export const NO_GENRE_FILTER: GenreFilter = { q: '', families: [], subs: [] };

export const isFiltered = (f: GenreFilter) => !!(f.q.trim() || f.families.length);

export function applyGenreFilter<T extends GenreFilterable>(shows: T[], f: GenreFilter): T[] {
  const needle = f.q.trim().toLowerCase();
  return shows.filter((s) => {
    if (needle && !s.title.toLowerCase().includes(needle) && !s.genres.some((g) => g.toLowerCase().includes(needle)))
      return false;
    if (!f.families.length) return true;
    // Any picked family matches; inside a family, picked subgenres narrow it down.
    return f.families.some((fid) => {
      const subs = f.subs.filter((sub) => familyOf(sub).id === fid);
      return s.genres.some((g) => familyOf(g).id === fid && (!subs.length || subs.includes(g.trim().toLowerCase())));
    });
  });
}

/** Picking a family again closes it and drops its subgenres. */
export function toggleFamily(f: GenreFilter, id: string): GenreFilter {
  return f.families.includes(id)
    ? { ...f, families: f.families.filter((x) => x !== id), subs: f.subs.filter((s) => familyOf(s).id !== id) }
    : { ...f, families: [...f.families, id] };
}

export function toggleSub(f: GenreFilter, key: string): GenreFilter {
  return { ...f, subs: f.subs.includes(key) ? f.subs.filter((s) => s !== key) : [...f.subs, key] };
}
