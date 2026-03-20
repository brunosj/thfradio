import type { TagsList } from "@/types/ResponsesInterface";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function fetchTags(): Promise<TagsList> {
  try {
    const response = await fetch(`${BACKEND_URL}/content/tags`, {
      next: { revalidate: 3600 },
    });
    const data = await response.json();
    return { attributes: { tag: Array.isArray(data) ? data : [] } };
  } catch (error) {
    console.error("Error fetching tags:", error);
    return { attributes: { tag: [] } };
  }
}
