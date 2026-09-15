// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { DEFAULT_SITE_URL } from "./src/lib/site.ts";

// Bun carga automáticamente .env, así que process.env ya está poblado
// cuando este archivo se ejecuta (sin necesidad de vite.loadEnv aquí).
const siteUrl = process.env.SITE_URL ?? DEFAULT_SITE_URL;

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  trailingSlash: "always",
  adapter: vercel(),
  redirects: {
    "/": "/es/",
  },
  env: {
    schema: {
      // Todas opcionales: el handler de /api/contact comprueba su
      // presencia en runtime y responde 503 si falta alguna requerida,
      // en vez de que astro:env lance al arrancar.
      BREVO_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CONTACT_SENDER_EMAIL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CONTACT_SENDER_NAME: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      CONTACT_RECIPIENT_EMAIL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      SITE_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
