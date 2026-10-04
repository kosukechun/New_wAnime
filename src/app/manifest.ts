import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "New_wAnime",
    short_name: "New_wAnime",
    description: "新作アニメ・ドラマを検索し、放送・配信予定を管理。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c1115",
    theme_color: "#0c1115",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
