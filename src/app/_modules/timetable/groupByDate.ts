// File: GroupByDate.ts
import type { CalendarEntry } from '@/types/ResponsesInterface';
import { startOfDay } from 'date-fns';

// Use a cache to avoid reprocessing the same data
const groupCache = new Map<string, { [key: string]: CalendarEntry[] }>();

const groupByDate = (entries: CalendarEntry[]) => {
  // Create a cache key based on entries data
  const cacheKey = JSON.stringify(entries.map((e) => e.start));

  // Check if we have cached results
  if (groupCache.has(cacheKey)) {
    return groupCache.get(cacheKey)!;
  }

  // Process entries if not cached
  const result = entries.reduce(
    (acc: { [key: string]: CalendarEntry[] }, entry) => {
      // Convert date only once outside the reducer for better performance
      const startDate = startOfDay(new Date(entry.start)).toISOString();

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
    result[date].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
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
