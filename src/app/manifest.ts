import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gabarita — Simulados ENEM",
    short_name: "Gabarita",
    description:
      "Simulados ENEM com questões oficiais e redações com temas atuais.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#1e40af",
    orientation: "portrait",
    categories: ["education"],
    lang: "pt-BR",
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
