import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n"; 
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


if (typeof window !== "undefined") {
  const isDiscordActivity = window.location.href.includes("discord.com") || 
                            window.location.href.includes("discord.gg") ||
                            window.navigator.userAgent.includes("Discord");
  
  if (isDiscordActivity) {
    import("@discord/embedded-app-sdk").then(({ patchUrlMappings }) => {
      patchUrlMappings([
        {
          prefix: "/api",
          target: "https://decibel-lrst.onrender.com",
        },
      ]);
      console.log("Discord URL mappings patched for /api");
    }).catch((err) => {
      console.warn("Failed to load Discord Embedded App SDK:", err);
    });
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
