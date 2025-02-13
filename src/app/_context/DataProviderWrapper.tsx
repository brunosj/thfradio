import { DataProvider } from './DataContext';
import type { CloudShowTypes, TagsList } from '@/types/ResponsesInterface';
import { fetchCloudShows } from '@/lib/shows';
import { fetchTags } from '@/lib/tags';

async function fetchInitialData() {
  try {
    // Fetch locale-independent data
    const [cloudShows, tagsList] = await Promise.all([
      fetchCloudShows(),
      fetchTags(),
    ]);

    return {
      cloudShows: Array.isArray(cloudShows) ? cloudShows : [],
      tagsList: tagsList || { attributes: { tag: [] } },
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return {
      cloudShows: [] as CloudShowTypes[],
      tagsList: { attributes: { tag: [] } } as TagsList,
    };
  }
}

export async function DataProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialData = await fetchInitialData();
  return <DataProvider initialData={initialData}>{children}</DataProvider>;
}
