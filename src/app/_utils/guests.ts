// Shows page: who is a resident, who is a guest, and how a guest is named.
//
// Residents = the programme shows (minus THF's own umbrella shows).
// Guests = THF Presents nights and takeovers, from the archive recordings,
// shown by the DJ / act name with the night or series as a label:
//   "THF Presents: Amour Africain w/ JIUN // 12.09.26" → JIUN · Amour Africain
//   "THF Presents Kandylion // 23.10.26"              → Kandylion · THF Presents
//   "THF Presents: VERSION Takeover // 24.09.26"       → VERSION · Takeover

/** THF's own umbrella shows, not listed on the shows page. */
const HIDDEN_SHOWS = /^thf\s+(talks|presents|radio|features?)\s*$/i;

export const isHiddenShow = (title: string) => HIDDEN_SHOWS.test(title.trim());

const PRESENTS = /^thf\s*presents\b\s*:?\s*/i;
const TAKEOVER = /\btake?\s?over\b|\btakover\b/i;

/** A show or recording title that belongs under Guests. */
export const isGuestTitle = (title: string) => PRESENTS.test(title.trim()) || TAKEOVER.test(title);

export type GuestName = {
  /** DJ / act, the tile's title */
  name: string;
  /** Night, series or "THF Presents" / "Takeover" */
  label: string;
};

/** Splits a guest title (without "// date") into name and label. */
export function guestName(rawTitle: string): GuestName {
  const title = rawTitle.split('//')[0].replace(/\s+/g, ' ').trim();
  const presents = PRESENTS.test(title);
  // "Partenope (w/ Naga DJ)" → "Partenope w/ Naga DJ"
  const rest = title.replace(PRESENTS, '').replace(/\((\s*w\/[^)]*)\)/i, '$1').trim();
  const fallbackLabel = presents ? 'THF Presents' : 'Takeover';

  // "w/ LISA TBA" (no series in front)
  const lead = rest.match(/^(?:w\/|with)\s+(.+)$/i);
  if (lead) return { name: lead[1].trim(), label: fallbackLabel };

  // "<series> w/ <name>" or "<series> invites <name>"
  const split = rest.match(/^(.+?)\s+(?:w\/|with|invites|b2b w\/)\s+(.+)$/i);
  if (split) return { name: split[2].trim(), label: split[1].trim() };

  // "Tina & Friends: FUZZLER (live)"
  const colon = rest.match(/^(.+?):\s+(.+)$/);
  if (colon) return { name: colon[2].trim(), label: colon[1].trim() };

  // "VERSION Takeover" → VERSION · Takeover
  const takeover = rest.match(/^(.+?)\s+(?:take?\s?over|takover)$/i);
  if (takeover) return { name: takeover[1].trim(), label: 'Takeover' };

  return { name: rest || title, label: fallbackLabel };
}

/** Letters and digits only, for matching show titles against recordings. */
export const compactTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');

/** "Frequent Flyers w/ Tropical Timewarp" → "Frequent Flyers" (the show without its guest / host part). */
const withoutGuestPart = (title: string) =>
  title.replace(/\s*\(?\s*(?:w\/|with|feat\.|ft\.)\s.*$/i, '').trim();

/** Leading "the" dropped: "theflightzone" → "flightzone". */
const withoutThe = (key: string) => key.replace(/^the(?=[a-z0-9]{5})/, '');

/**
 * Recording / timetable title → slug of the programme show it belongs to.
 * The longest show name wins, so "Tina & Friends w/ …" goes to "Tina & Friends", not "Tina".
 * A show also matches by its name without the "w/ …" part and without a leading
 * "The" ("The Flight Zone w/ Loganic" ← "Flight Zone (r)").
 * THF's umbrella shows and guest titles never match.
 */
export function showMatcher(shows: { slug?: string; title?: string }[]) {
  const keys = shows
    .filter((s): s is { slug: string; title: string } => !!s.slug && !!s.title && !isHiddenShow(s.title) && !isGuestTitle(s.title))
    .flatMap((s) => {
      const full = compactTitle(s.title);
      const base = compactTitle(withoutGuestPart(s.title));
      const out = [{ slug: s.slug, key: full }];
      // Shortened names only when they are still a real name (5+ characters)
      for (const k of [base, withoutThe(full), withoutThe(base)]) {
        if (k.length >= 5 && k !== full) out.push({ slug: s.slug, key: k });
      }
      return out;
    })
    .filter((s) => s.key.length >= 3)
    .sort((a, b) => b.key.length - a.key.length);
  return (recordingTitle: string): string | null => {
    if (isGuestTitle(recordingTitle)) return null;
    const t = compactTitle(recordingTitle);
    const tNoThe = withoutThe(t);
    return keys.find((k) => t.startsWith(k.key) || tNoThe.startsWith(k.key))?.slug ?? null;
  };
}
