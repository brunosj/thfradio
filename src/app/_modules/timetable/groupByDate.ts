// File: GroupByDate.ts
import type { CalendarEntry } from '@/types/ResponsesInterface';
import { startOfDay } from 'date-fns';

function entryStartIso(entry: CalendarEntry): string | undefined {
  return entry.startTime ?? entry.start;
}

// Use a cache to avoid reprocessing the same data
const groupCache = new Map<string, { [key: string]: CalendarEntry[] }>();

const groupByDate = (entries: CalendarEntry[]) => {
  // Create a cache key based on entries data
  const cacheKey = JSON.stringify(entries.map((e) => entryStartIso(e)));

  // Check if we have cached results
  if (groupCache.has(cacheKey)) {
    return groupCache.get(cacheKey)!;
  }

  // Process entries if not cached
  const result = entries.reduce(
    (acc: { [key: string]: CalendarEntry[] }, entry) => {
      const startIso = entryStartIso(entry);
      if (!startIso) {
        return acc;
      }
      const startDate = startOfDay(new Date(startIso)).toISOString();

      if (!acc[startDate]) {
        acc[startDate] = [];
      }

      acc[startDate].push(entry);

      return acc;
    },
    {}
  );

  // Sort entries for each date
  Object.keys(result).forEach((date) => {
    result[date].sort((a, b) => {
      const aS = entryStartIso(a);
      const bS = entryStartIso(b);
      if (!aS || !bS) return 0;
      return new Date(aS).getTime() - new Date(bS).getTime();
    });
  });

  // Store in cache
  groupCache.set(cacheKey, result);

  // Limit cache size to prevent memory leaks
  if (groupCache.size > 10) {
    // Delete oldest entry - ensure we have a valid key
    const firstKey = Array.from(groupCache.keys())[0];
    if (firstKey) {
      groupCache.delete(firstKey);
    }
  }

  return result;
};

export default groupByDate;
