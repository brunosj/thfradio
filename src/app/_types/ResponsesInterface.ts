export interface PageTypes {
  attributes: PageComponent & {
    localizations?: {
      data: LocalizationType[];
    };
  };
  id: number;
}

export interface TagsList {
  attributes: {
    tag: TagTypes[];
  };
}

export interface TagTypes {
  name: string;
  synonyms: Array<{
    name: string;
  }>;
}

export interface CalendarEntry {
  start: string;
  end: string;
  summary: string;
}

export interface CloudShowTypes {
  name: string;
  url: string;
  key: string;
  pictures: {
    extra_large: string;
  };
  slug: string;
  tags: Array<{
    key: string;
    name: string;
    url: string;
  }>;
}

export interface CloudShowTag {
  key: string;
  name: string;
  url: string;
}

export interface CloudShows {
  shows: CloudShowTypes[];
}

export interface ValidShow extends CloudShowTypes {
  date: Date;
}

export interface NewsType {
  attributes: {
    title: string;
    text: string;
    date: string;
    slug: string;
    summary: string;
    picture: {
      data: {
        id: number;
        attributes: {
          name: string;
          url: string;
        };
      };
    };
    locale: string;
    shows?: ShowTypes[];
    localizations?: {
      data: LocalizationType[];
    };
  };
}

export interface ShowTypes {
  attributes: {
    title: string;
    description: string;
    slug: string;
    keyword: string;
    teaserSentence: string;
    activeShow: boolean;
    locale: string;
    url: string;
    startTime: string;
    endTime: string;
    frequency: string;
    day: string;
    instagram: string;
    soundcloud: string;
    mail: string;
    picture: {
      data: {
        id: number;
        attributes: {
          name: string;
          url: string;
        };
      };
    };
    pictureFullWidth: {
      data: {
        id: number;
        attributes: {
          name: string;
          url: string;
        };
      };
    };
    localizations?: {
      data: LocalizationType[];
    };
  };
  id: number;
}

export interface Shows {
  shows: ShowTypes[];
}

export interface HomepageSection {
  title: string;
  subtitle: string;
  text: string;
  showListings?: ShowTypes[];
  calendarEntries?: CalendarEntry[];
  shows?: CloudShowTypes[];
  tagsList?: TagsList;
}

export interface AboutSection {
  title: string;
  description: string;
  acceptApplications?: boolean;
  button: Array<{
    id: number;
    text: string;
    path: string;
    color: 'white-orange' | 'white-blue' | 'blue';
  }>;
  links: {
    data: Array<{
      id: number;
      attributes: {
        title: string;
        links: string;
      };
    }>;
  };
}

export interface PictureType {
  attributes: {
    url: string;
  };
}

export interface Pictures {
  data: Array<{
    attributes: {
      url: string;
    };
  }>;
}

export interface HomepageTypes {
  attributes: {
    page: PageComponent & {
      localizations?: {
        data: LocalizationType[];
      };
    };
    heroText: string;
    heroPictures: {
      data: Array<{
        attributes: {
          url: string;
        };
      }>;
    };
    shows: HomepageSection;
    news: HomepageSection;
    programme: HomepageSection;
    archive: HomepageSection;
    pictureGallery: {
      data: Array<{
        attributes: {
          url: string;
        };
      }>;
    };
    localizations?: {
      data: LocalizationType[];
    };
  };
}

export interface AboutTypes {
  attributes: {
    page: PageComponent & {
      localizations?: {
        data: LocalizationType[];
      };
    };
    heroText: string;
    heroPictures: {
      data: Array<{
        attributes: {
          url: string;
        };
      }>;
    };
    acceptApplications: boolean;
    radioSection: AboutSection;
    torhausSection: AboutSection;
    imageBanner: {
      data: {
        attributes: {
          url: string;
        };
      };
    };
    codeOfConduct: TextSlide[];
    localizations?: {
      data: LocalizationType[];
    };
  };
}

export interface PageComponent {
  id: number;
  title: string;
  description: string;
  slug: string;
}

export interface TextSlide {
  heading: string;
  text: string;
}

export interface LocalizationType {
  id: number;
  attributes: {
    slug: string;
    locale: string;
  };
}
