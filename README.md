# Portafolio — Kevin Tarqui

Portafolio personal de Kevin Tarqui (Software Developer), bilingüe (ES/EN),
construido con Astro y publicado en Vercel. Toda la información profesional
(experiencia, educación, proyectos, tecnologías, contacto) se lee en tiempo
de build desde JSON Resume; ningún componente la duplica manualmente.

## Stack

- **[Astro 7](https://docs.astro.build)** — generación estática, con una
  única ruta on-demand (`POST /api/contact/`) para el formulario de
  contacto.
- **TypeScript** en modo estricto (sin `any`).
- **Tailwind CSS 4** vía `@tailwindcss/vite`.
- **GSAP 3 + ScrollTrigger** para las animaciones de scroll, con import
  dinámico condicionado a `prefers-reduced-motion`.
- **[JSON Resume](https://jsonresume.org)** (`data/resume.json`) como única fuente de verdad de los datos
  profesionales, extendido con campos `x-*` propios del diseño (headline,
  tagline, especialización, prácticas de trabajo, etc.).
- **pdfkit** para generar el CV en PDF (una página, compatible con ATS)
  a partir del mismo resume.
- **[Brevo](https://www.brevo.com)** para el envío del formulario de
  contacto, sin exponer ninguna clave en el navegador.
- **Bun** como único gestor de paquetes y runtime de scripts/tests.
- **Vercel** (`@astrojs/vercel`) como plataforma de despliegue.

## Requisitos

- Bun `1.4.2` o superior.
- Node `>=22.12.0` (usado por el adaptador de Vercel y por herramientas
  auxiliares).

## Puesta en marcha

```bash
bun install
cp .env.example .env   # completar las variables que se usen (ver abajo)
bun run dev
```

`bun run dev` y `bun run build` regeneran primero el CV en PDF
(`bun run cv:generate`) y luego levantan/compilan el sitio.

## Scripts

| Comando                           | Qué hace                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `bun run dev`                     | Regenera el CV y levanta el servidor de desarrollo de Astro                               |
| `bun run build`                   | Regenera el CV y compila el sitio para producción (`.vercel/output`)                      |
| `bun run cv:generate`             | Genera `public/cv/*.pdf` a partir de `data/resume.json`                                   |
| `bun run check`                   | `astro check` (tipos y diagnósticos de Astro)                                             |
| `bun run test`                    | Ejecuta la suite de `bun test`                                                            |
| `bun run resume:validate`         | Valida el resume resuelto por idioma contra JSON Resume                                   |
| `bun run build:check`             | Verifica el build de producción (`.vercel/output`): rutas, SEO, PDFs…                     |
| `bun run secrets:check`           | Confirma que no hay secretos filtrados en los artefactos generados                        |
| `bun run format` / `format:check` | Aplica o comprueba el formato de Prettier                                                 |
| `bun run fix`                     | Formatea y corre `astro check`                                                            |
| `bun run verify`                  | Ejecuta toda la cadena de verificación (obligatoria antes de dar por terminado un cambio) |

`astro preview` no es compatible con el adaptador de Vercel; para servir el
build localmente:

```bash
bun run build
bunx serve .vercel/output/static
```

## Variables de entorno

Definidas en `astro:env` (`astro.config.mjs`), todas opcionales — si faltan,
el sitio sigue funcionando y el formulario de contacto responde `503` en
vez de fallar:

| Variable                  | Uso                                                                              |
| ------------------------- | -------------------------------------------------------------------------------- |
| `BREVO_API_KEY`           | Clave de API de Brevo (Transactional). Sin ella, `/api/contact/` responde `503`. |
| `CONTACT_SENDER_EMAIL`    | Remitente verificado en Brevo.                                                   |
| `CONTACT_SENDER_NAME`     | Nombre del remitente. Si falta, se usa `basics["x-displayName"]` del resume.     |
| `CONTACT_RECIPIENT_EMAIL` | Destinatario de los mensajes. Si falta, se usa `basics.email` del resume.        |
| `SITE_URL`                | Dominio de producción, usado en canonical, hreflang, sitemap y Open Graph.       |

`.env.example` documenta los nombres sin valores. `.env` nunca se commitea.

## Datos profesionales

`data/resume.json` es la única fuente de verdad. Los textos traducibles se
escriben como pares `{ "es": "…", "en": "…" }` y todo lo que no cambia entre
idiomas (fechas, empresas, URLs, tecnologías) queda como valor plano.
`src/lib/resume.ts` expone `getResume(locale)`; el resto de la capa de datos
(`src/lib/portfolio.ts`, `src/lib/cv.ts`, `src/lib/seo.ts`) transforma ese
resume en los view models que consumen los componentes. Ningún componente
de `src/components/` debe contener literales de experiencia, educación,
proyectos, tecnologías o contacto: si falta un dato, se agrega al resume,
nunca al componente.

Los campos con prefijo `x-*` (por ejemplo `x-displayName`, `x-headline`,
`x-tagline`, `x-practices`) son extensiones propias del diseño del
portafolio y no forman parte del schema estándar de JSON Resume; el CV en
PDF los ignora deliberadamente.

## CV en PDF

`bun run cv:generate` (invocado automáticamente por `dev`/`build`) genera
`public/cv/kevin-tarqui-cv-es.pdf` y `-en.pdf` con `scripts/generate-cv.ts`.
Son artefactos derivados, ignorados por Git (`public/cv/*.pdf` en
`.gitignore`) y nunca deben editarse a mano ni usarse como fuente de datos.

## Assets de marca

`public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` y
`og-image.png` son artefactos de marca (monograma "K"/"KT" + punto verde,
sin datos profesionales). Su proceso de regeneración es manual y está
documentado en `scripts/generate-brand-assets.md`.

## Despliegue en Vercel

1. Framework: **Astro**. Install command: `bun install`. Build command:
   `bun run build`. Node **22.x**.
2. Configurar en Production y Preview las variables de entorno listadas
   arriba (todas opcionales, pero necesarias para que el formulario de
   contacto funcione).
3. `vercel.json` define cabeceras de seguridad (`X-Content-Type-Options`,
   `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) y cache
   `immutable` para `/_astro/*`; la plataforma las aplica en el despliegue
   real.
4. Tras el deploy, verificar en la URL pública: `/` redirige a `/es/`, el
   formulario de contacto envía y llega el correo, los botones "Descargar
   CV" bajan el PDF del idioma correcto, `/sitemap.xml` y `/robots.txt`
   responden, y la vista previa de Open Graph se ve correctamente.

## Verificación antes de un cambio

```bash
bun run verify
```

Ejecuta, en orden: formato, validación del resume, tests, `astro check`,
build de producción, verificación del build (`build:check`) y verificación
de fuga de secretos (`secrets:check`). No se considera terminado un cambio
si `verify` falla.
