import { DataProvider } from "./DataContext";
import { ChatProvider } from "./ChatContext";
import type { TagsList } from "@/types/ResponsesInterface";
import { fetchTags } from "@/lib/tags";

async function fetchInitialData() {
  try {
    const tagsList = await fetchTags();
    return {
      tagsList: tagsList || { attributes: { tag: [] } },
    };
  } catch (error) {
    console.error("Error fetching initial data:", error);
    return {
      tagsList: { attributes: { tag: [] } } as TagsList,
    };
  }
}

export async function DataProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tagsList } = await fetchInitialData();
  return (
    <DataProvider initialTagsList={tagsList}>
      <ChatProvider>{children}</ChatProvider>
    </DataProvider>
  );
}
