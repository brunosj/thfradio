/**
 * Keeps "w/" (and "ft." / "feat.") on the same line as the name after it:
 * "Takeoff w/ Vincent Grabowski" or "Low Pass (w/ Bejal)" may break before
 * "w/", never right after it.
 */
export const keepWithName = (title: string): string =>
  title.replace(/(^|[\s(\[])(w\/|ft\.|feat\.)\s+/gi, (_, lead: string, word: string) => `${lead}${word}\u00A0`);
