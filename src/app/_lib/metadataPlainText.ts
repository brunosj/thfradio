import type { AboutTypes, PageTypes } from "@/types/ResponsesInterface";

/** Strip simple markdown noise for Open Graph / meta description. */
export function metadataPlainText(
  input: string | undefined,
  maxLength = 160,
): string {
  if (!input) return "";
  return input
    .replace(/#+\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function metadataFromPage(
  page: PageTypes | null | undefined,
): { title?: string; description?: string } {
  if (!page) return {};
  const description = page.description?.trim()
    ? metadataPlainText(page.description)
    : page.content?.trim()
      ? metadataPlainText(page.content.replace(/<[^>]*>/g, " "))
      : undefined;
  return {
    title: page.title || undefined,
    description,
  };
}

export function metadataFromAbout(
  page: AboutTypes | null | undefined,
): { title?: string; description?: string } {
  if (!page) return {};
  const fromHtml = page.radioHtml?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: page.radioTitle || undefined,
    description: metadataPlainText(fromHtml || page.heroText),
  };
}
