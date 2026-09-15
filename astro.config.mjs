// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";

// Bun carga automáticamente .env, así que process.env ya está poblado
// cuando este archivo se ejecuta (sin necesidad de vite.loadEnv aquí).
const siteUrl = process.env.SITE_URL ?? "https://kevintarqui.vercel.app";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  trailingSlash: "always",
  adapter: vercel(),
  redirects: {
    "/": "/es/",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
