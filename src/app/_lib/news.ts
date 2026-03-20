import type { NewsType } from "@/types/ResponsesInterface";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

type NewsItemsType = {
  data: NewsType[];
};

export async function fetchNews(locale: string) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/content/news?lang=${locale}&limit=20`,
      {
        next: { revalidate: 600 },
      },
    );

    if (!response.ok) {
      console.warn(`News API returned status ${response.status}`);
      return [];
    }

    const result = await response.json();

    // Handle both formats: { data: [...] } and direct array
    if (Array.isArray(result)) {
      return result;
    }
    if (result && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

export async function fetchNewsArticle(slug: string, locale: string) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/content/news/${slug}?lang=${locale}`,
      {
        next: { revalidate: 600 },
      },
    );
    return await response.json();
  } catch (error) {
    console.error(`Error fetching news article ${slug}:`, error);
    return null;
  }
}
