export function getApiBase(): string {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_API_BASE_URL as string;
  }

  const isDiscordActivity =
    window.location.href.includes("discord.com") ||
    window.location.href.includes("discord.gg") ||
    window.navigator.userAgent.includes("Discord");

  if (isDiscordActivity) {
    return "/api";
  }

  return import.meta.env.VITE_API_BASE_URL as string;
}


export const API_BASE = getApiBase();