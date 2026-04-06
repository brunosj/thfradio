// NestJS structure (flat objects)
export interface PageTypes {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  /** TipTap HTML from CMS; sanitize before rendering with dangerouslySetInnerHTML */
  content?: string;
  locale?: string;
}

export interface TagsList {
  id?: string;
  tags?: TagTypes[];
  // Support for legacy API responses
  attributes?: {
    tag?: TagTypes[];
  };
}

export interface TagTypes {
  id?: string;
  name?: string;
  title?: string;
  synonyms?: Array<{
    name: string;
  }>;
}

export interface CalendarEntry {
  id: string;
  showId?: string;
  showTitle?: string;
  showSlug?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  start?: string; // Legacy support
  end?: string; // Legacy support
  summary?: string; // Legacy support
  status?: string;
  confirmed?: boolean;
  djs?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

// Platform-specific types
export interface MixcloudShowType {
  name: string;
  url: string;
  key: string;
  pictures: {
    extra_large: string;
  };
  tags: Array<{
    key: string;
    name: string;
    url: string;
  }>;
}

export interface SoundcloudShowType {
  title: string;
  permalink_url: string;
  id: string;
  artwork_url: string;
  tag_list: string;
  created_at: string;
  user?: {
    avatar_url?: string;
  };
}

// Combined type for frontend use - supports both new flat and old nested structures
export interface CloudShowTypes {
  id: string;
  title?: string;
  name?: string;
  url: string;
  key?: string;
  platform?: "mixcloud" | "soundcloud";
  source?: "mixcloud" | "soundcloud";
  picture: string;
  pictures?: {
    extra_large: string;
  };
  tags?: Array<{
    key: string;
    name: string;
    url: string;
  }>;
  date: string;
}

export interface ValidShow extends Omit<CloudShowTypes, "date"> {
  date: Date;
}

/** Processed cloud shows (date as Date) or raw API shape (date as string) */
export type CloudShowListItem = CloudShowTypes | ValidShow;

export interface CloudShowTag {
  key: string;
  name: string;
  url: string;
}

export interface CloudShows {
  shows: CloudShowTypes[];
}

export interface ShowTypes {
  attributes?: {
    id?: string;
    slug: string;
    title: string;
    description: string;
    keyword?: string;
    teaserSentence?: string;
    image?: string;
    imageFullWidth?: string;
    rrule?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    locale: string;
    activeShow: boolean;
    status: string;
    instagram?: string;
    soundcloud?: string;
    website?: string;
    twitter?: string;
    twitterx?: string;
    spotify?: string;
    mail?: string;
    frequency?: string;
    day?: string;
    picture?: {
      data?: {
        id?: number;
        attributes?: {
          name: string;
          url: string;
        };
      };
    };
    pictureFullWidth?: {
      data?: {
        id?: number;
        attributes?: {
          name: string;
          url: string;
        };
      };
    };
    createdAt: string;
    updatedAt: string;
    djs: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };
  // Flat properties for direct access
  id: string;
  slug: string;
  title: string;
  description: string;
  keyword?: string;
  teaserSentence?: string;
  image?: string;
  imageFullWidth?: string;
  rrule?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  locale: string;
  activeShow: boolean;
  status: string;
  instagram?: string;
  soundcloud?: string;
  website?: string;
  twitter?: string;
  twitterx?: string;
  spotify?: string;
  mail?: string;
  frequency?: string;
  day?: string;
  createdAt: string;
  updatedAt: string;
  djs: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface NewsType {
  id?: string;
  title: string;
  slug: string;
  text: string;
  summary: string;
  date: string;
  image?: string;
  locale?: string;
  teaserSentence?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shows {
  shows: ShowTypes[];
}

export interface HomepageSection {
  title?: string;
  subtitle?: string;
  text?: string;
  /** Sanitized CMS HTML when set; otherwise `text` is rendered as markdown. */
  textHtml?: string;
  /** Recent news for the homepage news block (flat records, not Strapi-shaped). */
  newsPreview?: NewsType[];
  calendarEntries?: CalendarEntry[];
  shows?: ShowTypes[];
  tagsList?: TagsList;
}

export interface AboutSection {
  title?: string;
  description?: string;
  acceptApplications?: boolean;
  button?: Array<{
    id: number;
    text: string;
    path: string;
    color?: "white-orange" | "blue" | "white-blue";
  }>;
  links?: {
    data?: Array<{
      id: number;
      title: string;
      links: string;
    }>;
  };
  archive?: {
    title: string;
    text: string;
  };
  news?: {
    title: string;
    text: string;
  };
  shows?: {
    title: string;
    text: string;
  };
  pictureGallery?: Array<string>;
  program?: {
    title: string;
    text: string;
  };
}

/** `GET /content/homepage` — flat Nest response (no Strapi `attributes` wrapper). */
export interface HomepageTypes {
  id: string;
  /** CMS row locale (`en` / `de`). */
  locale?: string;
  meta: {
    title: string;
    description: string;
  };
  heroText: string;
  heroPictures: string[];
  pictureGallery: string[];
  shows: HomepageSection;
  news: HomepageSection;
  programme: HomepageSection;
  archive: HomepageSection;
}

export interface AboutTypes {
  id?: string;
  locale?: string;
  heroText?: string;
  heroPictures?: Array<string>;
  acceptApplications?: boolean;
  radioSection?: AboutSection;
  torhausSection?: AboutSection;
  imageBanner?: string;
  codeOfConduct?: TextSlide[];
  radioTitle?: string;
  radioHtml?: string;
  /** Rich text Links column for the Radio block (localized by API `lang`). */
  radioLinksHtml?: string;
  torhausTitle?: string;
  torhausHtml?: string;
  /** Rich text Links column for the Torhaus block (localized by API `lang`). */
  torhausLinksHtml?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Raw CMS JSON; optional structured keys parsed in fetchAboutPage */
  extras?: Record<string, unknown>;
}

export interface PageComponent {
  id: number;
  title: string;
  description: string;
  slug: string;
}

export interface TextSlide {
  heading: string;
  /** Plain / markdown body when `textHtml` is not used. */
  text: string;
  /** TipTap HTML from CMS; sanitize in the carousel when set. */
  textHtml?: string;
}

export interface LocalizationType {
  id: number;
  slug: string;
  locale: string;
}

export interface PictureType {
  url: string;
}

export interface Pictures {
  data: string[];
}
