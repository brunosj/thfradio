import type { CalendarEntry } from '@/types/ResponsesInterface';

export async function fetchCalendar(): Promise<CalendarEntry[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/fetchCalendar`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return [];
  }
}
