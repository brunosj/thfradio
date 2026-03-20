import type {
  PageTypes,
  HomepageTypes,
  AboutTypes,
} from "@/types/ResponsesInterface";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

type PageResponseData = {
  data: PageTypes[];
};

export async function fetchPageBySlug(slug: string, locale: string = "en") {
  try {
    const response = await fetch(
      `${BACKEND_URL}/content/pages/${slug}?lang=${locale}`,
      {
        next: { revalidate: 600 },
      },
    );
    return await response.json();
  } catch (error) {
    console.error(`Error fetching page ${slug}:`, error);
    return null;
  }
}

type HomepageResponseData = {
  data: HomepageTypes;
};

export async function fetchHomePage(
  locale: string,
): Promise<HomepageTypes | null> {
  try {
    const url = `${BACKEND_URL}/content/homepage?lang=${locale}`;
    const response = await fetch(url, {
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      console.warn(
        `Homepage API returned status ${response.status} for locale ${locale}`,
      );
      return null;
    }

    const data = await response.json();

    // Validate that the response has the expected structure
    if (!data || typeof data !== "object" || !data.attributes) {
      console.warn(
        `Homepage API response missing expected structure for locale ${locale}:`,
        data,
      );
      // Return a minimal default structure to prevent crashes
      return createDefaultHomepage(locale);
    }

    // Transform relative image URLs to absolute URLs pointing to the backend
    if (
      data.attributes?.heroPictures?.data &&
      Array.isArray(data.attributes.heroPictures.data)
    ) {
      data.attributes.heroPictures.data = data.attributes.heroPictures.data.map(
        (url: string) => {
          if (typeof url === "string" && url.startsWith("/")) {
            return `${BACKEND_URL}${url}`;
          }
          return url;
        },
      );
    }

    return data as HomepageTypes;
  } catch (error) {
    console.error(
      "Error fetching homepage data for locale",
      locale,
      ":",
      error,
    );
    return null;
  }
}

function createDefaultHomepage(locale: string): HomepageTypes {
  return {
    id: "default",
    attributes: {
      page: {
        title: "THF Radio",
        description: "Community radio based in Berlin",
      },
      heroText: "Welcome to THF Radio",
      heroPictures: {
        data: [],
      },
      shows: {
        title: "Shows",
        subtitle: "",
        text: "",
      },
      news: {
        title: "News",
        subtitle: "",
        text: "",
        showListings: [],
      },
      programme: {
        title: "Programme",
        subtitle: "",
        text: "",
      },
      archive: {
        title: "Archive",
        subtitle: "",
        text: "",
      },
      pictureGallery: {
        data: [],
      },
    },
  };
}

export async function fetchAboutPage(
  locale: string,
): Promise<AboutTypes | null> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/content/about?lang=${locale}`,
      {
        next: { revalidate: 600 },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch about page: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching about page data:", error);
    return null;
  }
}
