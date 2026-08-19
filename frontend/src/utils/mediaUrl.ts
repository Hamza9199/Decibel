export function getMediaUrl(url?: string | null): string {
  if (!url) return "";

  const isDiscordActivity =
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith("discordsays.com") ||
      window.location.hostname.includes("discord.com") ||
      window.location.hostname.includes("discord.gg"));

  if (isDiscordActivity && url.includes("fra.cloud.appwrite.io")) {
    return url.replace("https://fra.cloud.appwrite.io", "/appwrite");
  }

  return url;
}