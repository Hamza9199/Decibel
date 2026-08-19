export function getApiBase(): string {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_API_BASE_URL as string;
  }

  const isDiscordActivity =
    window.location.hostname.endsWith("discordsays.com") ||
    window.location.hostname.includes("discord.com") ||
    window.location.hostname.includes("discord.gg");

  if (isDiscordActivity) {
    return "/backend/api";
  }

  return import.meta.env.VITE_API_BASE_URL as string;
}

export const API_BASE = getApiBase();