import type {
  PageTypes,
  HomepageTypes,
  HomepageSection,
  NewsType,
  AboutTypes,
  AboutSection,
  TextSlide,
} from "@/types/ResponsesInterface";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

function toAbsoluteUploadUrls(paths: string[]): string[] {
  if (!BACKEND_URL) return paths;
  return paths.map((url) => {
    if (typeof url === "string" && url.startsWith("/")) {
      return `${BACKEND_URL}${url}`;
    }
    return url;
  });
}

function isTextSlide(x: unknown): x is TextSlide {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.heading !== "string") return false;
  const hasText = typeof o.text === "string" && o.text.trim().length > 0;
  const hasHtml =
    typeof o.textHtml === "string" && o.textHtml.trim().length > 0;
  return hasText || hasHtml || o.heading.trim().length > 0;
}

function parseAboutExtras(
  extras: unknown,
): Partial<Pick<AboutTypes, "codeOfConduct" | "imageBanner" | "radioSection" | "torhausSection">> {
  if (!extras || typeof extras !== "object" || Array.isArray(extras)) {
    return {};
  }
  const e = extras as Record<string, unknown>;
  const out: Partial<
    Pick<AboutTypes, "codeOfConduct" | "imageBanner" | "radioSection" | "torhausSection">
  > = {};

  if (Array.isArray(e.codeOfConduct)) {
    const slides = e.codeOfConduct.filter(isTextSlide).map((s) => ({
      heading: s.heading,
      text: typeof s.text === "string" ? s.text : "",
      textHtml: typeof s.textHtml === "string" ? s.textHtml : undefined,
    }));
    if (slides.length > 0) out.codeOfConduct = slides;
  }

  if (typeof e.imageBanner === "string") {
    out.imageBanner = e.imageBanner;
  } else if (e.imageBanner && typeof e.imageBanner === "object") {
    const ib = e.imageBanner as Record<string, unknown>;
    const nested = ib.data as Record<string, unknown> | undefined;
    const attrs = nested?.attributes as Record<string, unknown> | undefined;
    const url =
      (typeof ib.url === "string" && ib.url) ||
      (typeof attrs?.url === "string" && attrs.url) ||
      undefined;
    if (url) out.imageBanner = url;
  }

  if (e.radioSection && typeof e.radioSection === "object" && !Array.isArray(e.radioSection)) {
    out.radioSection = e.radioSection as AboutSection;
  }
  if (e.torhausSection && typeof e.torhausSection === "object" && !Array.isArray(e.torhausSection)) {
    out.torhausSection = e.torhausSection as AboutSection;
  }

  return out;
}

function pageFromAttributes(
  a: Record<string, unknown>,
  parent: Record<string, unknown>,
): PageTypes {
  return {
    id: parent.id != null ? String(parent.id) : a.id != null ? String(a.id) : undefined,
    title: (a.title as string) || "",
    slug: (a.slug as string) || "",
    description: (a.description as string) || undefined,
    content: (a.content as string) || undefined,
    locale: (a.locale as string) || undefined,
  };
}

export function normalizePagePayload(raw: unknown): PageTypes | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (typeof o.statusCode === "number" && o.statusCode >= 400) {
    return null;
  }

  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    const inner = o.data as Record<string, unknown>;
    if (inner.attributes && typeof inner.attributes === "object") {
      return pageFromAttributes(inner.attributes as Record<string, unknown>, inner);
    }
    return normalizePagePayload(inner);
  }

  if (o.attributes && typeof o.attributes === "object") {
    return pageFromAttributes(o.attributes as Record<string, unknown>, o);
  }

  if (typeof o.title === "string" || typeof o.slug === "string") {
    return {
      id: o.id != null ? String(o.id) : undefined,
      title: (o.title as string) || "",
      slug: (o.slug as string) || "",
      description: (o.description as string) || undefined,
      content: (o.content as string) || undefined,
      locale: (o.locale as string) || undefined,
    };
  }

  return null;
}

function flattenAboutRecord(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    const d = raw.data as Record<string, unknown>;
    if (d.attributes && typeof d.attributes === "object") {
      return { ...(d.attributes as Record<string, unknown>), id: d.id };
    }
    return d;
  }
  if (raw.attributes && typeof raw.attributes === "object") {
    return { ...(raw.attributes as Record<string, unknown>), id: raw.id };
  }
  return raw;
}

export function normalizeAboutPayload(raw: unknown): AboutTypes | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.statusCode === "number" && o.statusCode >= 400) {
    return null;
  }

  const flat = flattenAboutRecord(o);
  const heroPicturesRaw = flat.heroPictures;
  let pictures: string[] = [];
  if (Array.isArray(heroPicturesRaw)) {
    pictures = heroPicturesRaw.map((u) => String(u));
  } else if (typeof heroPicturesRaw === "string" && heroPicturesRaw.trim()) {
    try {
      const parsed: unknown = JSON.parse(heroPicturesRaw);
      if (Array.isArray(parsed)) {
        pictures = parsed.filter((u): u is string => typeof u === "string");
      }
    } catch {
      /* ignore */
    }
  }

  const extras = flat.extras as Record<string, unknown> | undefined;
  const parsed = parseAboutExtras(extras);

  let codeOfConductFromApi: TextSlide[] | undefined;
  if (Array.isArray(flat.codeOfConduct)) {
    const slides = flat.codeOfConduct.filter(isTextSlide).map((s) => ({
      heading: s.heading,
      text: typeof s.text === "string" ? s.text : "",
      textHtml: typeof s.textHtml === "string" ? s.textHtml : undefined,
    }));
    if (slides.length > 0) codeOfConductFromApi = slides;
  }

  const base: AboutTypes = {
    id: flat.id != null ? String(flat.id) : undefined,
    locale: flat.locale as string | undefined,
    heroText: flat.heroText as string | undefined,
    heroPictures: toAbsoluteUploadUrls(pictures),
    acceptApplications: Boolean(flat.acceptApplications),
    radioTitle: flat.radioTitle as string | undefined,
    radioHtml: flat.radioHtml as string | undefined,
    radioLinksHtml: flat.radioLinksHtml as string | undefined,
    torhausTitle: flat.torhausTitle as string | undefined,
    torhausHtml: flat.torhausHtml as string | undefined,
    torhausLinksHtml: flat.torhausLinksHtml as string | undefined,
    imageBanner: typeof flat.imageBanner === "string" ? flat.imageBanner : undefined,
    ...(codeOfConductFromApi ? { codeOfConduct: codeOfConductFromApi } : {}),
    createdAt: flat.createdAt as string | undefined,
    updatedAt: flat.updatedAt as string | undefined,
    extras: extras && typeof extras === "object" && !Array.isArray(extras) ? extras : undefined,
  };

  const merged: AboutTypes = { ...parsed, ...base };
  if (!merged.imageBanner?.trim() && parsed.imageBanner) {
    merged.imageBanner = parsed.imageBanner;
  }
  if (!merged.codeOfConduct?.length && parsed.codeOfConduct?.length) {
    merged.codeOfConduct = parsed.codeOfConduct;
  }
  if (merged.imageBanner?.startsWith("/") && BACKEND_URL) {
    merged.imageBanner = `${BACKEND_URL}${merged.imageBanner}`;
  }
  return merged;
}

export async function fetchPageBySlug(
  slug: string,
  locale: string = "en",
): Promise<PageTypes | null> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/content/pages/${slug}?lang=${locale}`,
      {
        next: { revalidate: 600 },
      },
    );

    if (!response.ok) {
      return null;
    }

    const raw: unknown = await response.json();
    return normalizePagePayload(raw);
  } catch (error) {
    console.error(`Error fetching page ${slug}:`, error);
    return null;
  }
}

function createDefaultHomepage(_locale: string): HomepageTypes {
  return {
    id: "default",
    meta: {
      title: "THF Radio",
      description: "Community radio based in Berlin",
    },
    heroText: "Welcome to THF Radio",
    heroPictures: [],
    pictureGallery: [],
    shows: { title: "Shows" },
    news: { title: "News", newsPreview: [] },
    programme: { title: "Programme" },
    archive: { title: "Archive" },
  };
}

function toAbsoluteUploadUrl(path: string): string {
  if (!BACKEND_URL) return path;
  if (path.startsWith("/")) return `${BACKEND_URL}${path}`;
  return path;
}

function mergeHomepageSection(
  raw: unknown,
  base: HomepageSection,
): HomepageSection {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...base };
  return { ...base, ...(raw as HomepageSection) };
}

function mapLegacyHomepageNewsPreview(raw: unknown): NewsType[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item): NewsType | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const attrs = (o.attributes as Record<string, unknown> | undefined) ?? o;
      const picture = attrs.picture as Record<string, unknown> | undefined;
      const pictureData = picture?.data as Record<string, unknown> | undefined;
      const pictureAttrs = pictureData?.attributes as Record<string, unknown> | undefined;
      const rawImage = pictureAttrs?.url;
      const image = typeof rawImage === "string" ? toAbsoluteUploadUrl(rawImage) : undefined;

      return {
        id: o.id != null ? String(o.id) : undefined,
        title: typeof attrs.title === "string" ? attrs.title : "",
        slug: typeof attrs.slug === "string" ? attrs.slug : "",
        summary: typeof attrs.summary === "string" ? attrs.summary : "",
        text: typeof attrs.text === "string" ? attrs.text : "",
        date: typeof attrs.date === "string" ? attrs.date : "",
        image,
        locale: typeof attrs.locale === "string" ? attrs.locale : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}

function normalizeLegacyHomepagePayload(
  id: string,
  attributesRaw: unknown,
): HomepageTypes | null {
  if (!attributesRaw || typeof attributesRaw !== "object" || Array.isArray(attributesRaw)) {
    return null;
  }
  const attrs = attributesRaw as Record<string, unknown>;
  const d = createDefaultHomepage("en");

  const page = attrs.page as Record<string, unknown> | undefined;
  const heroPicturesNode = attrs.heroPictures as Record<string, unknown> | undefined;
  const pictureGalleryNode = attrs.pictureGallery as Record<string, unknown> | undefined;
  const heroPicturesRaw = heroPicturesNode?.data;
  const pictureGalleryRaw = pictureGalleryNode?.data;
  const heroPictures = Array.isArray(heroPicturesRaw)
    ? heroPicturesRaw.filter((u): u is string => typeof u === "string")
    : [];
  const pictureGallery = Array.isArray(pictureGalleryRaw)
    ? pictureGalleryRaw.filter((u): u is string => typeof u === "string")
    : [];

  const newsSection = mergeHomepageSection(attrs.news, d.news);
  const newsObj =
    attrs.news && typeof attrs.news === "object" && !Array.isArray(attrs.news)
      ? (attrs.news as Record<string, unknown>)
      : undefined;
  newsSection.newsPreview =
    newsSection.newsPreview ?? mapLegacyHomepageNewsPreview(newsObj?.showListings);

  return {
    id,
    meta: {
      title: typeof page?.title === "string" ? page.title : d.meta.title,
      description:
        typeof page?.description === "string" ? page.description : d.meta.description,
    },
    heroText: typeof attrs.heroText === "string" ? attrs.heroText : "",
    heroPictures: toAbsoluteUploadUrls(heroPictures),
    pictureGallery: toAbsoluteUploadUrls(pictureGallery),
    shows: mergeHomepageSection(attrs.shows, d.shows),
    news: newsSection,
    programme: mergeHomepageSection(attrs.programme, d.programme),
    archive: mergeHomepageSection(attrs.archive, d.archive),
  };
}

/** Normalizes `GET /content/homepage` JSON into `HomepageTypes`. */
function normalizeHomepagePayload(raw: unknown): HomepageTypes | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (typeof o.statusCode === "number" && o.statusCode >= 400) {
    return null;
  }

  const id = o.id != null ? String(o.id) : null;
  if (!id) return null;

  // Live backend compatibility: some environments still return `{ id, attributes }`.
  if (o.attributes && typeof o.attributes === "object" && !Array.isArray(o.attributes)) {
    return normalizeLegacyHomepagePayload(id, o.attributes);
  }

  // Tolerate an additional `data` wrapper and normalize recursively.
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    return normalizeHomepagePayload(o.data);
  }

  const metaRaw = o.meta;
  if (!metaRaw || typeof metaRaw !== "object" || Array.isArray(metaRaw)) {
    return null;
  }
  const m = metaRaw as Record<string, unknown>;

  const d = createDefaultHomepage("en");
  const heroText = o.heroText == null ? "" : String(o.heroText);
  const heroPictures = Array.isArray(o.heroPictures)
    ? o.heroPictures.filter((u): u is string => typeof u === "string")
    : [];
  const pictureGallery = Array.isArray(o.pictureGallery)
    ? o.pictureGallery.filter((u): u is string => typeof u === "string")
    : [];

  return {
    id,
    locale: typeof o.locale === "string" ? o.locale : undefined,
    meta: {
      title: typeof m.title === "string" ? m.title : d.meta.title,
      description:
        typeof m.description === "string" ? m.description : d.meta.description,
    },
    heroText,
    heroPictures: toAbsoluteUploadUrls(heroPictures),
    pictureGallery: toAbsoluteUploadUrls(pictureGallery),
    shows: mergeHomepageSection(o.shows, d.shows),
    news: mergeHomepageSection(o.news, d.news),
    programme: mergeHomepageSection(o.programme, d.programme),
    archive: mergeHomepageSection(o.archive, d.archive),
  };
}

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

    const raw: unknown = await response.json();
    const normalized = normalizeHomepagePayload(raw);

    if (!normalized) {
      console.warn(
        `Homepage API response missing expected structure for locale ${locale}:`,
        raw,
      );
      return createDefaultHomepage(locale);
    }

    return normalized;
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

    const raw: unknown = await response.json();
    return normalizeAboutPayload(raw);
  } catch (error) {
    console.error("Error fetching about page data:", error);
    return null;
  }
}
