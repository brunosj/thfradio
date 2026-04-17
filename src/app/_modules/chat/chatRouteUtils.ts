/** Path without query or trailing slash, for stable suffix checks. */
export function normalizeAppPath(pathname: string | null): string {
  return pathname?.split("?")[0]?.replace(/\/$/, "") ?? "";
}

export function isGlobalChatOverlaySuppressed(normalizedPath: string): boolean {
  return (
    normalizedPath.endsWith("/chat") ||
    normalizedPath.endsWith("/studio-chat")
  );
}
