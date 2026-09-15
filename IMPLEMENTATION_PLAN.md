# IMPLEMENTATION_PLAN — Portfolio Kevin Tarqui

> **Paso 0 obligatorio:** copiar este documento tal cual a `IMPLEMENTATION_PLAN.md` en la raíz del repo y commitearlo (`7-docs: agrega plan de implementación del portfolio`) antes de tocar código. Después, marcar cada fase completada en ese archivo (estado + fecha + resultado de verify). No se avanza de fase con verificaciones fallidas. No hacer push a `main` ni merge automático.

## Precisiones aprobadas por el usuario (prevalecen sobre el resto del documento)

1. **Textos confirmados:**
   - `x-tagline` EN: "I build web applications, APIs, and systems that solve real business problems."
   - `x-summaryShort` ES: "Desarrollador Full Stack con orientación al backend y experiencia en el desarrollo de aplicaciones web, APIs REST, microservicios, sistemas frontend y backend, bases de datos y despliegues en producción."
   - `x-summaryShort` EN: "Full Stack Developer with a backend focus and experience building web applications, REST APIs, microservices, frontend and backend systems, databases, and production deployments."
   - `x-practices` ES: Arquitectura — APIs REST, Microservicios · Calidad de código — Clean Code, SOLID, Testing · DevOps — Docker, CI/CD · Flujo de trabajo — Git, Code Review, Scrum, SDD.
   - `x-practices` EN: Architecture — REST APIs, Microservices · Code Quality — Clean Code, SOLID, Testing · DevOps — Docker, CI/CD · Workflow — Git, Code Review, Scrum, SDD.
2. **`CONTACT_SENDER_NAME`:** opcional en `env.schema`, sin `default`. El fallback a `x-displayName` se hace en código (`src/lib/brevo.ts`).
3. **Brevo:** las credenciales reales ya están en el `.env` local (`BREVO_API_KEY`, `CONTACT_SENDER_EMAIL`, `CONTACT_SENDER_NAME`, `CONTACT_RECIPIENT_EMAIL`, `SITE_URL`). La Fase 5 incluye una prueba end-to-end real que confirme:
   - Brevo acepta el envío (2xx). La recepción física en la bandeja es **PENDIENTE DE VERIFICACIÓN MANUAL** porque el agente no tiene acceso a ella;
   - `replyTo` es el email del visitante (verificado en el payload con tests, sin revelar secretos);
   - sender y recipient salen de la configuración (ídem);
   - las validaciones devuelven 422;
   - el honeypot no envía;
   - un `Origin` inválido devuelve 403;
   - los errores de Brevo se manejan (por ejemplo, forzando una clave inválida solo en la variable de entorno del proceso de prueba, sin modificar `.env`);
   - ningún secreto aparece en logs, HTML, bundle cliente ni `.vercel/output/static`.

   **Nunca imprimir, copiar, mostrar ni commitear valores del `.env`.** Las comprobaciones de fuga se hacen con `scripts/check-secrets.ts` (ver "Configuración clave"), que busca el valor real sin mostrarlo. `.env` sigue ignorado y `.env.example` solo lleva nombres.

4. **Capturas de EcuStock:** `MediaPlaceholder` hasta que las capturas existan dentro del repo. No bloquea ninguna fase.
5. **Diseño aprobado:** implementar fielmente el artifact, sin reinterpretar. Solo se aplican las diferencias intencionales documentadas aquí.
6. **JSON Resume:** `getResume(locale)` sigue siendo el único acceso a datos profesionales. Nada de experiencia, educación, skills, proyectos ni contacto hardcodeado en componentes.

## Contexto

El repo tiene Astro 7.3.2, Tailwind 4.3.3 y GSAP 3.15 instalados, JSON Resume integrado (`data/resume.es.json`, `data/resume.en.json`, `src/lib/resume.ts → getResume(locale)`, `scripts/validate-resume.ts`, `bun run verify`) y una página `src/pages/index.astro` vacía. El diseño aprobado es un storyboard de escenas de scroll ("El punto"): https://claude.ai/artifact/4UYNh3HQZ3yteVmZSzQaRQ (10 escenas desktop a 1440×900, 6 pantallas mobile a 390 px, con notas GSAP por escena). El objetivo es convertirlo en un sitio bilingüe en producción en Vercel, con datos 100 % derivados de JSON Resume, contacto vía Brevo y CV PDF generado.

### Decisiones ya tomadas con el usuario

1. Los textos de identidad del diseño se guardan como **extensiones `x-*` en `resume.*.json`** (el schema acepta `additionalProperties`).
2. La escena **Stack muestra solo `skills` de resume.json**: no aparecen Quarkus, MySQL, Astro ni HTML & CSS, y sí Microservicios, Jira, Notion, etc.
3. **"Cómo trabajo" pasa a `x-practices`** en resume.json. Lo usa el portfolio, pero no el CV.
4. **Dominio:** `https://kevintarqui.vercel.app`, configurable con la variable `SITE_URL`.
5. **Se elimina la escena "Este portfolio"**: CLAUDE.md prohíbe incluir el portfolio como proyecto. Quedan 9 escenas.

### Diferencias respecto al diseño (intencionales, no rediseñar)

| Diseño                                 | Implementación                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 10 escenas                             | 9 escenas: Inicio, Sobre mí, Experiencia, Trabajo, EcuStock, Stack, Cómo trabajo, Educación, Contacto         |
| "Egresado"                             | `education[].status` ("Título en trámite" / "Degree issuance pending")                                        |
| "Backend Developer", "Software & Data" | `work[].position`, y `work[].description` como línea secundaria si existe                                     |
| Descripción SaaS de EcuStock           | `projects[].description`                                                                                      |
| Palabras de fondo INVENTARIO/VENTAS    | `projects[].keywords`                                                                                         |
| "01/04 — En curso"                     | "En curso" solo si falta `endDate`                                                                            |
| Gris `#6F6784` en texto pequeño        | Texto informativo con `--color-muted: #9A92AD` (contraste AA). `#6F6784` queda solo para decoración           |
| Punto verde que "viaja"                | Un punto por escena que entra animado desde la dirección de la escena anterior. No hay un elemento fijo único |

---

## Arquitectura

### Principios

- **Estático por defecto.** La única ruta on-demand es `POST /api/contact/` (`prerender = false`) con `@astrojs/vercel`.
- **Mejora progresiva.** El HTML sin JS o con `prefers-reduced-motion: reduce` muestra todo el contenido legible y en layout vertical. JS añade la clase `motion` a `<html>` y solo entonces se activan pins, scroll horizontal y estados iniciales. Nunca se oculta contenido con CSS por defecto.
- **GSAP con import dinámico.** Se importa solo si `matchMedia('(prefers-reduced-motion: no-preference)')` coincide, así que quien reduce movimiento no descarga GSAP.
- **Sin frameworks cliente.** Solo scripts TS de Astro: `motion.ts`, `contact-form.ts` y `language-switch.ts`.
- **Capa de datos pura.** `src/lib/*.ts` transforma el resume en view models tipados. Los componentes solo presentan.

### Decisión de routing i18n (contrastada con la documentación oficial de Astro)

**Documentación consultada** (`docs.astro.build`, guías _Internationalization_ y _Routing_):

- El routing i18n nativo con `prefixDefaultLocale: true` exige que _"your folder names must match the items in `locales` exactly"_ y que `src/pages/index.astro` exista siempre.
- La combinación con una ruta dinámica `[locale]` + `getStaticPaths` no está documentada.
- `routing: "manual"` desactiva el middleware i18n y no admite otras opciones de routing.
- Los `redirects` de configuración: _"Supported adapters will instead write redirects to the host's configuration file"_; en HTML estático generan meta refresh.
- _"File-based routes take precedence over redirects"_, así que un `src/pages/index.astro` anularía el redirect de `/`.

**Decisión: routing estático propio, sin el bloque `i18n` de Astro.** No se mezclan estrategias.

- `src/i18n/config.ts` define `locales = ["es","en"] as const` y `defaultLocale = "es"`. El tipo `Locale` sigue viniendo de `src/lib/resume.ts`.
- `src/pages/[locale]/index.astro` (y `contact/sent|error.astro`) usan `getStaticPaths()` sobre `locales`: se prerenderizan `/es/` y `/en/` sin duplicar la composición.
- `/` → `/es/` con `redirects` de `astro.config.mjs`, sin `src/pages/index.astro` (evita la colisión). El adaptador de Vercel lo escribe en su configuración y se verifica en `.vercel/output/config.json`.
- Canonical, hreflang (`es`, `en`, `x-default`) y sitemap se generan con `src/lib/seo.ts`. No dependen de `astro:i18n`.
- No se usa ninguna función del middleware i18n: fallback, dominios o detección de idioma. Si en el futuro hicieran falta, habría que migrar a carpetas literales `src/pages/es|en/` con i18n nativo.
- La única ruta on-demand sigue siendo `src/pages/api/contact.ts`.

### Estructura final (nuevo o modificado)

```text
data/resume.es.json, resume.en.json      (MOD: extensiones x-*)
public/favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png  (MOD/NEW)
public/cv/                                (generado, gitignored)
scripts/generate-cv.ts                    (NEW)
scripts/generate-brand-assets.md          (NEW: instrucciones one-off para OG y favicons)
src/assets/projects/ecustock/             (NEW cuando existan capturas reales)
src/components/
  Seo.astro  Hud.astro  LanguageSwitch.astro  MobileMenu.astro
  Hero.astro  About.astro  Experience.astro  WorkIntro.astro  FeaturedProject.astro
  Stack.astro  Practices.astro  Education.astro  Contact.astro  ContactForm.astro
  SignalDot.astro  MediaPlaceholder.astro
src/i18n/config.ts                        (NEW: locales, defaultLocale, helpers de ruta)
src/i18n/ui.ts                            (NEW: diccionario de interfaz ES/EN)
src/layouts/BaseLayout.astro              (NEW)
src/lib/resume.ts                         (sin cambios)
src/lib/dates.ts                          (NEW) + dates.test.ts
src/lib/portfolio.ts                      (NEW: getPortfolio(locale)) + portfolio.test.ts
src/lib/contact.ts                        (NEW: validación compartida) + contact.test.ts
src/lib/brevo.ts                          (NEW: envío server-side) + brevo.test.ts
src/lib/contact-handler.ts                (NEW: lógica HTTP testeable) + contact-handler.test.ts
scripts/check-build.ts, scripts/e2e-contact.ts (NEW)
src/lib/cv.ts                             (NEW: getCvHref(locale), layout del CV)
src/lib/seo.ts                            (NEW: canonical/alternates/JSON-LD) + seo.test.ts
src/pages/[locale]/index.astro            (NEW)
src/pages/[locale]/contact/sent.astro     (NEW, noindex; fallback sin JS)
src/pages/[locale]/contact/error.astro    (NEW, noindex; fallback sin JS)
src/pages/api/contact.ts                  (NEW, prerender=false)
src/pages/404.astro                       (NEW, bilingüe)
src/pages/sitemap.xml.ts, robots.txt.ts   (NEW)
src/pages/index.astro                     (DELETE: lo sustituye el redirect)
src/scripts/motion.ts, contact-form.ts, language-switch.ts (NEW)
scripts/check-secrets.ts                  (NEW: busca valores reales de secretos en artefactos sin imprimirlos)
src/styles/global.css                     (MOD: tokens @theme, @font-face, utilidades)
astro.config.mjs, package.json, .gitignore, vercel.json, .env.example, README.md (MOD/NEW)
```

Nota sobre desviaciones de la estructura de CLAUDE.md:

- `src/pages/[locale]/` sustituye a `pages/es` + `pages/en` para no duplicar la composición (ver "Decisión de routing i18n").
- Las capturas van en `src/assets/projects/` en lugar de `public/projects/` para que `astro:assets` las optimice.

Ambas desviaciones tienen responsabilidad real.

### Dependencias

| Paquete                                    | Tipo | Motivo                                                                             |
| ------------------------------------------ | ---- | ---------------------------------------------------------------------------------- |
| `@astrojs/vercel`                          | dep  | Función serverless para `/api/contact/` y output para Vercel                       |
| `@fontsource-variable/bricolage-grotesque` | dep  | Fuente display autoalojada con ejes `wdth` y `wght` (usar `full.css` o `wdth.css`) |
| `@fontsource/instrument-serif`             | dep  | Serif itálica autoalojada                                                          |
| `@fontsource/geist-mono`                   | dep  | Mono autoalojada (400/500)                                                         |
| `pdfkit`                                   | dev  | CV PDF con texto real, fuentes estándar Times (ATS) y sin Chromium                 |
| `@types/pdfkit`                            | dev  | Tipos                                                                              |
| `@types/bun`                               | dev  | Tipos de `bun:test` para que `astro check` acepte los tests                        |

No se añaden `@astrojs/sitemap` (dos URLs, endpoint propio), SDK de Brevo (basta `fetch`), Lenis ni librerías de validación. Se instala con `bun add` / `bun add -d`.

### Configuración clave

**`astro.config.mjs`**

- `site`: `loadEnv(...)` de `vite`, con `SITE_URL ?? "https://kevintarqui.vercel.app"`.
- `trailingSlash: "always"`.
- `adapter: vercel()`.
- **Sin bloque `i18n`** (ver "Decisión de routing i18n").
- `redirects: { "/": "/es/" }`.
- `env.schema` (`astro:env`):
  - `BREVO_API_KEY`: server/secret, `optional: true`. El handler comprueba su presencia y responde 503 `not_configured`, en lugar de que `astro:env` lance una excepción en runtime.
  - `CONTACT_SENDER_EMAIL`: server/secret, `optional: true`, remitente verificado en Brevo (misma comprobación → 503).
  - `CONTACT_SENDER_NAME`: server/public, `optional: true` sin default; el fallback a `x-displayName` va en `src/lib/brevo.ts`.
  - `CONTACT_RECIPIENT_EMAIL`: server/secret, opcional; si falta se usa `basics.email`.
  - `SITE_URL`: server/public, opcional.
- `vite.plugins: [tailwindcss()]`.

**`package.json` (scripts)**

```jsonc
"dev": "bun run cv:generate && astro dev",
"build": "bun run cv:generate && astro build",
"cv:generate": "bun scripts/generate-cv.ts",
"test": "bun test",
"build:check": "bun scripts/check-build.ts",
"secrets:check": "bun scripts/check-secrets.ts",
"verify": "bun run format:check && bun run resume:validate && bun test && bun run check && bun run build && bun run build:check && bun run secrets:check --allow-missing"
```

**Evolución de `verify` (para que nunca ejecute scripts inexistentes):**

- **Fase 1:** añade `test` → `format:check && resume:validate && bun test && check && build`.
- **Fase 2:** crea `check-build.ts` y añade `&& bun run build:check`.
- **Fase 5:** crea `check-secrets.ts` y añade `&& bun run secrets:check --allow-missing`.
- **Fase 6:** cambia `dev` y `build` para anteponer `cv:generate`.

La línea de arriba es el estado final.

- **`scripts/check-build.ts`**: se crea en la Fase 2 y cada fase añade sus comprobaciones (nunca comprobaciones de fases futuras). Sobre `.vercel/output` verifica:
  - **Fase 2:** `static/es/index.html` y `static/en/index.html` con `lang` correcto; redirect `/` → `/es/` en `config.json`; sin referencias a Google Fonts.
  - **Fase 3:** ningún texto profesional hardcodeado. Es un test aparte sobre `src/components`, no sobre el build.
  - **Fase 5:** función de `api/contact` presente en `config.json` / `functions/`.
  - **Fase 6:** PDFs en `static/cv/` que empiezan por `%PDF` y `href` del CV por idioma.
  - **Fase 7:** canonical propio y hreflang recíprocos (`es`, `en`, `x-default`); meta OG y Twitter con URLs absolutas; JSON-LD parseable con `@type: "Person"`; `sitemap.xml` con ambas URLs; `robots.txt` con `Sitemap:`; `og-image.png` presente.

  Sale con código 1 ante cualquier fallo.

- **`scripts/check-secrets.ts`**:
  - Bun carga `.env` automáticamente en solo lectura; el script nunca escribe ni modifica `.env`.
  - Lee `process.env.BREVO_API_KEY` y busca su **valor real** (`Buffer.includes`) en todos los archivos de `.vercel/output/static`, `.vercel/output/functions`, `dist/` (si existe), `public/` y `.tmp/logs/` (logs de build y dev redirigidos ahí; `.tmp/` ya está en `.gitignore`).
  - Nunca imprime el valor: solo el nombre de la variable y la ruta del archivo con coincidencia.
  - Sale con código 1 si encuentra alguna.
  - Si la variable no existe: sale con código 1 ("comprobación no ejecutable"), salvo con `--allow-missing`, que imprime `OMITIDA: BREVO_API_KEY no disponible` y sale con 0. En las aceptaciones de las Fases 5 y 9 se ejecuta **sin** `--allow-missing`.
  - Comprobación secundaria: el nombre literal `BREVO_API_KEY` tampoco puede aparecer en `.vercel/output/static`.
  - `CONTACT_SENDER_EMAIL` y `CONTACT_RECIPIENT_EMAIL` no se buscan: no son secretos criptográficos y el destinatario puede coincidir con `basics.email`, que es público en el HTML.

`astro preview` no está soportado por el adaptador de Vercel. Para servir el build: `bunx serve .vercel/output/static`.

---

## Especificación de diseño (fuente para implementar sin rediseñar)

### Tokens (`src/styles/global.css`, `@theme`)

```text
--color-bg #0B0812      --color-ink #F2EEF7     --color-body #CFC7DC
--color-soft #B7AEC8    --color-muted #9A92AD   --color-faint #6F6784 (solo decorativo)
--color-purple #7A3FE0  --color-purple-hi #9B6BF0  --color-deep #2A1245
--color-lilac #C9B6F2   --color-green #5FD18A   --color-panel #150E22
--font-display "Bricolage Grotesque Variable", "Arial Narrow", sans-serif
--font-serif   "Instrument Serif", Georgia, serif      (siempre italic)
--font-mono    "Geist Mono", ui-monospace, monospace
```

**Utilidades `@utility`**

- `display`: `font-family display; font-weight 800; font-stretch 75%; line-height .8; letter-spacing -0.012em`.
- `mono-label`: `12px; letter-spacing .16em; uppercase` (11px en mobile).
- `text-outline`: `color transparent; -webkit-text-stroke var(--stroke, 1.5px) var(--stroke-color)`.
- `grain`: overlay con ruido SVG en data URI, `opacity .07`, `pointer-events none`.
- `placeholder-hatch`: rayado a 135° sobre `--color-panel` con borde lila al 20 %.

**Fondos:** `radial-gradient` morado al 25–40 %. Prohibido `filter: blur` grande (rendimiento).

**Foco:** `:focus-visible { outline: 2px solid var(--color-green); outline-offset: 4px }`.

**Tipografía gigante:** tamaños en `vw` calculados a partir del diseño a 1440 px (`px / 14.4`), acotados con `clamp()` a su valor en 1920 px. Para títulos cuya longitud depende del idioma (HABLEMOS / LET'S TALK, palabras del hero) se pasa `style="--chars:N"` desde el frontmatter y `font-size: min(calc(92vw / (var(--chars) * .5)), <max>)`. Es el único estilo inline justificado.

**Breakpoints:**

- Base (390): diseño mobile.
- `md` (768): mobile ampliado.
- `lg` (1024): composiciones desktop.
- Pins y scroll horizontal solo con `(min-width:1024px) and (min-height:640px) and (prefers-reduced-motion:no-preference)`.

### HUD (`Hud.astro`, fijo)

**Desktop**

- **Header** de 80 px con padding 44 px.
  - A la izquierda, el logo "KT" con un punto verde de 8 px, que enlaza a `#top`.
  - A la derecha, el nav mono con Trabajo, Experiencia, Stack y Contacto, más `LanguageSwitch` (idioma activo en ink, el otro en muted, `aria-current`).
- **Rail vertical** abajo a la izquierda (`writing-mode: vertical-rl; rotate(180deg)`) con "NN — Escena". `aria-hidden`, lo actualiza `motion.ts`.
- **Contador** abajo a la derecha "NN / 09" con una barra de 120 px cuyo relleno verde escala con el progreso global.

**Mobile**

- **Header** de 68 px con logo, "ES / EN" y un botón de menú de 44×44.
- **Menú** con Popover API (`popovertarget`): overlay a pantalla completa con los enlaces en display a 56 px y cierre con Esc o con un botón.
- Sin rail ni contador.

### Escenas (ids estables sin idioma: `top, about, experience, work, featured, stack, practices, education, contact`)

**01 Hero `#top`** (datos: `x-displayName`, `x-headline`, `x-tagline`, `getCvHref`)

_Desktop_

- Nombre separado por palabras en `<h1>`.
  - Primera palabra sólida ink, ~37.5vw, sangrando por la izquierda (`left:-2.8vw`).
  - Segunda palabra alineada a la derecha y sangrando (`right:-10vw`): capa en contorno `purple-hi` más una copia `aria-hidden` en `purple` con `clip-path: inset(0 0 55% 0)`.
- Franja mono bajo la primera palabra: headline en verde, línea de 180 px y `ciudad — país`.
- Tagline en serif a 31 px, ancho 330 px, a la izquierda.
- CTAs abajo a la izquierda:
  - Círculo verde de 172 px con flecha y "Ver proyectos" (`#work`).
  - "Descargar CV" subrayado con chip PDF, con `download` y `hreflang`.
- Anillos decorativos de 720 y 480 px (dashed) a la derecha, `SignalDot` en el anillo y glow morado.

_Mobile_

- Palabras apiladas a 200 px: KEVIN, TAR en contorno, QUI en morado. Nombres de más de 5 letras se parten por la mitad con `aria-hidden` en los fragmentos y un `sr-only` con el nombre completo.
- Headline y ciudad en mono a la derecha de QUI.
- Tagline en serif a 25 px.
- Fila con pill "Ver proyectos" y enlace CV.

**02 Sobre mí `#about`** (datos: `x-specialization`, `x-summaryShort`, `x-focusAreas`)

- Palabra vertical gigante en contorno a la izquierda con `x-specialization.focus` en mayúsculas.
- Titular de tres líneas:
  - `role` en display a 11vw.
  - Conector i18n "con orientación" / "focused on" en serif lila, indentado.
  - `focus` + punto verde en display.
- Párrafo `x-summaryShort` a 28 px, partido en `<span>` por palabra para el scrub.
- Dos bandas cruzadas a ancho completo con `x-focusAreas`:
  - Banda A en deep, texto en contorno, rotada +3°.
  - Banda B en morado, texto sólido con puntos verdes, rotada −4°.
- Mobile: titular apilado ("Full" / "Stack" a 130 px), párrafo a 21 px y bandas de 56–60 px.

**03 Experiencia `#experience`** (datos: `work[]`)

_Desktop, con JS_

- **Escena pinned.**
- **Columna izquierda:** año inicial sólido a 23vw y año final en contorno lila.
- **Columna derecha:**
  - Mono "01 / 04" y fechas por mes.
  - Nombre corto en `<h3>` display a 96 px.
  - Posición en serif lila a 46 px.
  - `summary` en body a 20 px.
  - Descripción secundaria en mono.
- **Lista `<ol>`** de todos los trabajos en grid `36px 1fr 150px 104px`: número, nombre corto, posición y años. Riel vertical con nodo verde en la fila activa.
- **Texto fantasma** con el nombre corto en mayúsculas a 20vw, morado al 14 %, abajo.

_Sin JS, reduced motion o mobile_

- Lista vertical de bloques de 240 px: año vertical a la izquierda (el activo sólido, el resto en contorno) y a la derecha número, nombre, posición en serif y `summary`.

**04 Trabajo `#work`** (datos: `projects[]`)

- "Selected" en serif lila a 14.5vw, encima de "W(O)RK" en display a 40vw. La "O" es un círculo de 29vw con borde verde de 2 px, `SignalDot` arriba y dentro la imagen de landing del proyecto destacado o un placeholder.
- Abajo: label mono y el índice de proyectos (número + nombre desde `projects`).
- Mobile: la misma composición a 210 px con el círculo de 150 px.

**05 Proyecto destacado `#featured`** (datos: `projects[0]`; hoy EcuStock)

_Desktop, con JS_

- **Track horizontal de 2 viewports.**
- **Panel A:**
  - Número "01" en contorno a 44vw detrás.
  - Mono con `type` y rango de años.
  - Nombre en `<h3>` a 23vw.
  - `description` en serif a 44 px.
  - Fila "Stack" con `keywords` separadas por reglas de 1 px.
  - CTA "Visitar sitio" con icono ↗, subrayado verde, hostname en mono, `target="_blank" rel="noopener"`.
- **Panel B:**
  - `keywords` gigantes en contorno al 14 % en cuatro filas desfasadas.
  - Anillo de 640 px.
  - Tres medias superpuestas: panel admin 960×600 (A), landing 640×400 (B) y catálogo mobile 270×480 con radio de 30 px (C), con captions mono A/B/C.
  - Hint "Scroll horizontal".

_Sin JS o mobile_

- Todo apilado: título, texto, chips, CTA y composición de medias con solapes (330×206, 260×163 y 130×231).

_Medias:_ `MediaPlaceholder` hasta que existan capturas. Cuando existan, `<Picture>` avif/webp con `alt` descriptivo en i18n.

**06 Stack `#stack`** (datos: `skills[]`)

_Desktop_

- `<h2>` "Stack" vertical a 14.5vw a la izquierda, sangrando por abajo.
- N columnas (una por grupo), cada una con cabecera mono `NN Grupo` y una `<ul>` con las keywords (fuente semántica visible para lectores).
  - Además, una copia `aria-hidden` repetida para el loop visual, con ítems en contorno lila al 16 % y en ink los que cruzan la línea.
  - Tamaño por columna calculado según la longitud máxima de sus keywords para que no desborde.
- Línea horizontal verde al 50 % de alto con `SignalDot` a la izquierda.
- Máscaras degradadas arriba y abajo.

_Mobile:_ una fila por grupo con marquee (CSS `@keyframes` y dirección alterna, pausado con reduced motion), sólido y contorno alternados, separados por puntos verdes.

**07 Cómo trabajo `#practices`** (datos: `x-practices`)

- **Desktop:**
  - Anillos concéntricos de 300, 540, 780 (dashed) y 1120 px.
  - SVG con `textPath` de los nombres repetidos (`aria-hidden`).
  - Centro con "Cómo" en serif y "trabajo" en display.
  - Cuatro nodos en las diagonales del anillo de 780, cada práctica en su esquina: número, `<h3>` a 72 px y keywords en mono.
  - Es una `<ol>` real posicionada con grid de 2×2.
- **Mobile:** titular, riel vertical verde y cuatro ítems de 108 px con nodo.

**08 Educación `#education`** (datos: `education[]`)

- **Desktop:**
  - Año inicial en display peso 200 lila y año final en peso 800 ink, unidos por una línea de 330 px con degradado a verde y punto al final.
  - `<h3>` área a 88 px e institución en serif a 46 px.
  - Badge redondeado con punto y `status`.
- **Mobile:** años apilados a 140 px y el resto en flujo.

**09 Contacto `#contact`** (datos: `basics.email/phone/profiles/location`)

- Fondo con degradado hacia `--color-deep`.
- `<h2>` i18n "HABLEMOS" / "LET'S TALK" en display a pantalla completa con `--chars` y punto verde final (88 px desktop, 56 px mobile).
- **Desktop:** dos columnas.
  - `<ul>` de datos en grid `120px 1fr`: Email (`mailto`), LinkedIn, GitHub (URL sin protocolo), Teléfono (`tel:` normalizado), Ubicación (`Intl.DisplayNames`).
  - `ContactForm`: nombre y email en dos columnas, mensaje, botón pill verde de 60 px.
- **Mobile:** título apilado en sílabas i18n (`contact.titleMobile: ["HA","BLE","MOS"]` / `["LET'S","TALK"]`), datos y formulario en flujo.
- Footer con "© {año de build} {x-displayName}" y "Volver arriba".

---

## Fases

Cada fase termina con `bun run verify` en verde y un commit `7-<tipo>: <descripción en español>`. No se avanza con errores.

### Política de verificaciones

- **Bloquean el avance** (se corrigen antes de seguir): errores de formato, JSON Resume, tests, TypeScript/Astro check, build, `build:check`, `secrets:check`, respuestas incorrectas de la API, fugas de secretos o fallos de implementación.
- **Automatizar todo lo verificable** desde el entorno: Chrome headless (`C:/Program Files/Google/Chrome/Application/chrome.exe`) para capturas y `--force-prefers-reduced-motion`, Claude in Chrome si está disponible, `bunx lighthouse` con el Chrome local, `bun test` y scripts.
- **Si una comprobación no se puede ejecutar realmente** (bandeja de correo, VoiceOver/NVDA, Axe DevTools si no hay forma de correr axe, validadores web externos, preview de OG tras el deploy, Vercel Preview sin autenticación, medición de fps en DevTools):
  - marcarla en `IMPLEMENTATION_PLAN.md` como **PENDIENTE DE VERIFICACIÓN MANUAL**, con instrucciones exactas para el usuario;
  - no bloquear fases independientes;
  - **nunca** declarar superada una validación que no se ejecutó.
- Cada fase registra en `IMPLEMENTATION_PLAN.md` qué se verificó automáticamente (con el resultado real) y qué queda como verificación manual.

### Fase 1 — Datos y capa de transformación

1. **Extensiones en ambos resumes** (misma estructura en los dos; el tipo `Resume` las detecta):
   - `basics["x-displayName"]`: "Kevin Tarqui".
   - `basics["x-headline"]`: "Software Developer" (ES y EN).
   - `basics["x-tagline"]`:
     - ES: "Desarrollo aplicaciones web, APIs y sistemas orientados a resolver problemas reales de negocio."
     - EN: "I build web applications, APIs, and systems that solve real business problems."
   - `basics["x-specialization"]`: `{ "role": "Full Stack", "focus": "backend" }`.
   - `basics["x-summaryShort"]`:
     - ES: "Desarrollador Full Stack con orientación al backend y experiencia en el desarrollo de aplicaciones web, APIs REST, microservicios, sistemas frontend y backend, bases de datos y despliegues en producción."
     - EN: "Full Stack Developer with a backend focus and experience building web applications, REST APIs, microservices, frontend and backend systems, databases, and production deployments."
   - `basics["x-focusAreas"]`:
     - ES: `["Aplicaciones web","APIs REST","Microservicios","Frontend","Backend","Bases de datos","Despliegues"]`.
     - EN: `["Web applications","REST APIs","Microservices","Frontend","Backend","Databases","Deployments"]`.
   - `"x-practices"` (raíz): `[{ name, keywords[] }]`.
     - ES: Arquitectura [APIs REST, Microservicios], Calidad de código [Clean Code, SOLID, Testing], DevOps [Docker, CI/CD], Flujo de trabajo [Git, Code Review, Scrum, SDD].
     - EN: Architecture [REST APIs, Microservices], Code Quality [Clean Code, SOLID, Testing], DevOps [Docker, CI/CD], Workflow [Git, Code Review, Scrum, SDD].
2. **`src/lib/dates.ts`:**
   - `parseResumeDate("2023-06")`.
   - `formatYearRange(start, end, locale)`: "2025" si coinciden; "2023 — 2026"; si falta `end`, "2023 — Actualidad" (i18n).
   - `formatMonthRange` con `Intl.DateTimeFormat(locale, { month: "short", year: "numeric" })`.
3. **`src/lib/portfolio.ts`:** `getPortfolio(locale)` devuelve el view model tipado de todas las escenas.
   - `splitCompanyName`: `"RIOUC - Universidad Católica de Cuenca"` → `{ short: "RIOUC", parent: "Universidad Católica de Cuenca" }`; `"Sudamericana de Software (SASF)"` → `{ short: "Sudamericana de Software", acronym: "SASF" }`.
   - `phoneHref`, `displayUrl`, `countryName`.
   - Índices con `padStart(2, "0")`.
4. **`src/i18n/config.ts`:** `locales`, `defaultLocale`, `isLocale(value: unknown)`, `localePath(locale, hash?)`, `alternateLocale`.
5. **`src/i18n/ui.ts`:** `ui: Record<Locale, UiStrings>` con nav, escenas, hero, about, experience, work, stack, practices, education, contact (labels, placeholders, estados, errores por código), cv (títulos de sección), notFound, meta (formato del título), a11y (skip link, menú, "abre en nueva pestaña").
6. `bun add -d @types/bun` y script `"test": "bun test"` añadido a `verify`.
7. **Tests `bun test`:** fechas, split de empresas, paridad ES/EN (mismas longitudes en `work`, `skills[].keywords`, `projects`, `x-practices`, `x-focusAreas` y mismas claves `x-*`), y que `getPortfolio` no devuelva strings vacíos.

**Aceptación:**

- `resume:validate` 2/2 válidos.
- `bun test` en verde.
- `astro check` sin errores.
- `bun run verify` (con `bun test`) en verde.
- La página actual (`src/pages/index.astro`) sigue compilando; los componentes llegan en las Fases 2 y 3.

### Fase 2 — Base: layout, i18n, rutas, HUD

1. **Dependencias:** `bun add @astrojs/vercel @fontsource-variable/bricolage-grotesque @fontsource/instrument-serif @fontsource/geist-mono`. El adaptador se configura aquí (`adapter: vercel()`) para que desde esta fase el output sea `.vercel/output` y el redirect se pueda verificar. Sigue sin haber rutas on-demand hasta la Fase 5. Se crea `scripts/check-build.ts` (comprobaciones de la Fase 2) y se añade a `verify`.
2. **`global.css`:** tokens, utilidades, imports de fuentes (solo los subsets y pesos usados: Instrument Serif 400 normal + italic, Geist Mono 400/500) y `@font-face` de fallback con `size-adjust` para reducir CLS en los titulares.
3. **`BaseLayout.astro`:**
   - `<html lang>` con clase `no-js` y un script inline mínimo que la cambia a `js` (solo indica que hay JS). La clase `motion` la añade `motion.ts` cuando GSAP está inicializado; los estilos de pin y track dependen únicamente de `motion`.
   - `<Seo>`, preload del woff2 de Bricolage (`?url`).
   - Skip link a `#main`, `<Hud>`, `<main id="main">`, overlay `grain`.
   - Carga condicional de `motion.ts`.
4. **`src/pages/[locale]/index.astro`:** `getStaticPaths` con los locales y composición de las 9 escenas con `getPortfolio(locale)` y `ui[locale]`.
5. Borrar `src/pages/index.astro`. Configurar `redirects` y `trailingSlash` en `astro.config.mjs`, sin bloque `i18n`. Crear `404.astro`. Tras el build, comprobar que `.vercel/output/config.json` contiene la ruta de redirect `/` → `/es/`. Si el adaptador no la escribiera, el HTML con meta refresh que genera Astro sigue funcionando: documentarlo y añadir el redirect en `vercel.json` solo si Vercel lo respeta en el Preview.
6. **`Hud.astro`, `LanguageSwitch.astro`, `MobileMenu.astro`** (Popover API).
   - `language-switch.ts` conserva el `#hash` al cambiar de idioma.
   - `MobileMenu` cierra el popover al pulsar un enlace. Sin JS, el menú abre y los enlaces navegan igual.

**Aceptación:**

- **Automática:**
  - `curl -I` a `/` en `astro dev` devuelve el redirect a `/es/`;
  - `/es/` y `/en/` responden 200 con `lang` correcto;
  - los enlaces del selector apuntan al otro idioma;
  - el HTML construido no referencia `fonts.googleapis.com` ni `fonts.gstatic.com`.
- **Con navegador** (Claude in Chrome o headless): el menú mobile abre y cierra con teclado y Esc. Si no se puede ejecutar, PENDIENTE DE VERIFICACIÓN MANUAL: "Tab hasta el botón de menú, Enter abre, Esc cierra y el foco vuelve al botón".

### Fase 3 — Escenas estáticas (desktop y mobile, sin GSAP)

Implementar las 9 escenas según la especificación, mobile-first, junto con `SignalDot` y `MediaPlaceholder`. Todo el texto visible sale de `getPortfolio` o `ui`. El texto decorativo duplicado va con `aria-hidden="true"`. Jerarquía: un `h1` (nombre), un `h2` por escena y `h3` por ítem.

**Aceptación:**

- **Automática:**
  - capturas headless de `/es/` y `/en/` a 1440×900 y 390×844, comparadas contra el artifact aprobado, sin desviaciones fuera de las documentadas;
  - `document.documentElement.scrollWidth <= innerWidth` a 320, 390, 768, 1024, 1440 y 2560 px (Claude in Chrome o script headless);
  - captura con JS desactivado (`--blink-settings=scriptEnabled=false`) con todo el contenido visible;
  - grep que confirme que ningún `.astro` de `src/components/` contiene literales de datos profesionales (email, teléfono, nombres de empresas, keywords de skills).
- **Contraste AA:** calculado con un pequeño test de `bun test` sobre los pares de tokens usados en texto (fórmula WCAG). La comprobación con Axe se hace en la Fase 8.

### Fase 4 — Animaciones GSAP (`src/scripts/motion.ts`)

**Setup**

- `gsap.registerPlugin(ScrollTrigger)`.
- Toda la lógica dentro de `gsap.matchMedia()`, con contextos `desktop` (lg + alto ≥640) y `base`, ambos con `no-preference`.
- `ScrollTrigger.refresh()` tras `document.fonts.ready`.
- Selectores por `data-motion="..."`, nunca por clases de estilo.

**Coreografía**

| Escena       | Animación (ease `power3.out` o `expo.out`, 0.8–1.2 s, scrub 0.6–1)                                                                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero (carga) | La primera palabra entra desde `xPercent:-20` y la segunda desde `+20` (stagger por letra 0.04); el relleno sube de `inset(0 0 100% 0)` a `55%`; franja, tagline y CTAs con stagger 0.08; anillos con `rotation` lenta ligada al scroll (±25°)     |
| Sobre mí     | Pin corto (+=60 %); spans del párrafo de `color muted` a `ink` con scrub; palabra vertical con parallax `yPercent -15`; bandas en `xPercent` opuesto (±12)                                                                                         |
| Experiencia  | Pin `+=${n*80}%`; `snap` a 1/(n−1); timeline con un paso por trabajo: flip de dígitos del año (`yPercent` ±100 con máscara), crossfade con `clip-path` de nombre/posición/summary, nodo del riel a la fila activa, texto fantasma `xPercent` −30→0 |
| Trabajo      | Pin +=100 %; círculo con `scale` hasta `hypot(vw, vh) / diámetro`; letras W/RK hacia fuera (`xPercent` ±40) y "Selected" hacia arriba                                                                                                              |
| Destacado    | Pin; track `x: -(scrollWidth - innerWidth)` con `end: () => "+=" + distancia`, `invalidateOnRefresh`; medias con `containerAnimation` y velocidades 0.7× (admin), 1× (landing), 1.3× (mobile); keywords de fondo en sentido contrario; "01" fijo   |
| Stack        | Pin +=120 %; columnas alternas `yPercent` ±20; la palabra que cruza la línea central pasa de contorno a sólida mediante `onUpdate` que marca `data-active`                                                                                         |
| Cómo trabajo | Anillos `rotation` 0→40 (textPath −40) con scrub; nodos que se encienden en orden y títulos con `clip-path` de izquierda a derecha                                                                                                                 |
| Educación    | La línea `scaleX` 0→1 y el punto viaja hasta el final; badge con fade                                                                                                                                                                              |
| Contacto     | Título `scale` 1.25→1 con `transformOrigin` a la izquierda; el punto cae (`y:-40vh`, `power4.out`); datos y form con stagger 0.06; el fondo pasa de `bg` a `deep` con scrub                                                                        |
| HUD          | Un `ScrollTrigger` por escena actualiza el rail (`onToggle`); barra `scaleX` = progreso global                                                                                                                                                     |
| Cursor       | Solo con `(hover:hover) and (pointer:fine)`: anillo verde de 40 px con `gsap.quickTo`, que crece sobre `[data-cursor="cta"]`; el cursor nativo se mantiene                                                                                         |

**Reglas**

- Nunca `scroll hijacking` ni smooth-scroll de terceros.
- El pin nunca atrapa el foco: en `focusin` dentro de una escena pinned, `ScrollTrigger` hace scroll hasta la posición del elemento.
- Todos los estados iniciales se aplican con `gsap.set` dentro de `matchMedia`, de modo que se revierten solos.
- El mobile `base` solo usa reveals ligeros (`y:24`, `opacity`) con `ScrollTrigger.batch` y marquees CSS.

**Aceptación:**

- **Automática** (Chrome headless o Claude in Chrome):
  - sin errores en consola en `/es/` y `/en/`;
  - con `--force-prefers-reduced-motion` no se solicita ningún chunk de GSAP y todo el contenido es visible;
  - tras redimensionar de 1440 a 390 y volver, `ScrollTrigger.getAll()` no deja `pin-spacer` huérfanos y no hay scroll horizontal;
  - CLS de Lighthouse < 0.05.
- **PENDIENTE DE VERIFICACIÓN MANUAL** si no se puede medir desde el entorno: "Chrome DevTools > Performance, grabar scroll completo en desktop: ~60 fps y sin long tasks >50 ms".

### Fase 5 — Contacto con Brevo

1. Configurar `env.schema` (el adaptador ya existe desde la Fase 2). Crear `.env.example` con las 5 variables solo por nombre, sin valores. Crear `scripts/check-secrets.ts`, añadirlo a `verify` y extender `check-build.ts` con la función `api/contact`.
2. **`src/lib/contact.ts`** (`validateContact(input: unknown)`):
   - Narrowing explícito.
   - Trim y normalización.
   - `name` 2–100 sin `\r\n`; `email` ≤254 con regex estándar; `message` 10–2000.
   - Honeypot `company` vacío.
   - `elapsedMs ≥ 3000` si viene `startedAt`.
   - Resultado `{ ok: true, data } | { ok: false, errors: Record<field, code> }`.
3. **`src/lib/brevo.ts`** (`sendContactEmail`):
   - `POST https://api.brevo.com/v3/smtp/email`.
   - Headers `api-key`, `content-type` y `accept` JSON.
   - Body: `sender` desde env, `to` = `CONTACT_RECIPIENT_EMAIL ?? basics.email`, `replyTo` = visitante, `subject` "Portfolio · {name}", `textContent` (sin HTML para evitar inyección).
   - Timeout de 8 s con `AbortSignal.timeout`.
4. **`src/lib/contact-handler.ts`** (`handleContactRequest(request, deps)`): lógica HTTP pura con dependencias inyectables (`send`, `config`, `site`) para testearla sin red. `api/contact.ts` solo la conecta con `astro:env` y `sendContactEmail`. Tests con `bun test`:
   - 422 por campo;
   - el honeypot **no llama a `send`**;
   - `Origin` ajeno → 403;
   - configuración incompleta → 503;
   - `send` que lanza error o Brevo con status ≥400 → 502;
   - el payload a Brevo lleva `sender` (email y nombre desde config, con fallback a `x-displayName`), `to` (`CONTACT_RECIPIENT_EMAIL ?? basics.email`) y `replyTo` = email del visitante (con `fetch` mockeado);
   - ningún `console.*` incluye el mensaje ni la API key.
5. **`src/pages/api/contact.ts`** (`prerender = false`, solo `POST`):
   - Si hay `Origin` y su host ≠ `Astro.site` o el host de la request, responde 403.
   - Acepta `request.formData()`.
   - Si el cliente pide JSON (`accept: application/json`): 200 `{ok:true}`, 422 con errores, 503 `not_configured` si faltan variables, 502 si Brevo falla.
   - Sin JS: 303 a `/{locale}/contact/sent/` o `/{locale}/contact/error/`.
   - Si salta el honeypot, responde éxito falso silencioso (200 o 303 a `sent`) sin enviar.
   - Nunca loguea el contenido del mensaje.
6. **`scripts/e2e-contact.ts`** (`bun scripts/e2e-contact.ts --base http://localhost:4321`): lanza peticiones reales al servidor local y comprueba status y cuerpo JSON. Nunca imprime variables de entorno. No forma parte de `verify` porque envía correos reales.
7. **`ContactForm.astro` + `contact-form.ts`:**
   - `<form action="/api/contact/" method="post">` con `locale` oculto, honeypot visualmente oculto (`aria-hidden`, `tabindex=-1`, `autocomplete=off`) y `startedAt` que rellena JS.
   - Labels asociados, `autocomplete` (name, email), `required`, `maxlength`.
   - Errores por campo con `aria-describedby` y `aria-invalid`.
   - Región `role="status" aria-live="polite"`.
   - Botón deshabilitado con texto "Enviando…" durante el envío.
   - Mensajes i18n embebidos en `<script type="application/json">`.

**Aceptación:**

- **Unit tests** (`bun test`, bloqueantes): todos los casos del punto 4 en verde, incluida la forma exacta del payload (`sender`, `to`, `replyTo`).
- **E2E real** (`bun run dev > .tmp/logs/dev.log 2>&1` con el `.env` real + `scripts/e2e-contact.ts`, bloqueante):
  - envío válido → 200 `{ok:true}`, lo que implica que Brevo aceptó la petición (el handler solo devuelve 200 si Brevo responde 2xx);
  - campos vacíos o inválidos → 422 con códigos por campo;
  - honeypot relleno → respuesta de éxito y el handler no llama a Brevo (lo cubre el unit test; en E2E se comprueba el status);
  - `Origin: https://evil.example` → 403;
  - formulario sin JS: POST `multipart/form-data` sin `accept: application/json` → 303 a `/es/contact/sent/`.
- **Errores de Brevo** (bloqueante): segundo servidor lanzado con `BREVO_API_KEY=invalid-key-for-test` **solo en el entorno del proceso** (Vite da prioridad a `process.env` sobre `.env`; `.env` no se toca) → envío válido responde 502 `{ok:false}` y `.tmp/logs/dev.log` no contiene el mensaje enviado. Antes, comprobar que la variable del proceso realmente prevalece (la respuesta debe ser 502 y no 200). Si no prevalece, no se modifica `.env` ni se copian secretos: el manejo de errores queda cubierto por el unit test bloqueante y el E2E de error se registra como "no ejecutable en este entorno" con la causa.
- **Fugas** (bloqueante): `bun run build > .tmp/logs/build.log 2>&1 && bun run secrets:check` (sin `--allow-missing`) sale con 0.
- **PENDIENTE DE VERIFICACIÓN MANUAL** (el agente no tiene acceso a la bandeja): "Comprobar en la bandeja de `CONTACT_RECIPIENT_EMAIL` que llegó el correo de la prueba E2E, que el remitente es `CONTACT_SENDER_NAME <CONTACT_SENDER_EMAIL>` y que al pulsar Responder el destinatario es el email usado en la prueba".

### Fase 6 — CV PDF (`scripts/generate-cv.ts`)

1. `bun add -d pdfkit @types/pdfkit`.
2. **`src/lib/cv.ts`:**
   - `getCvHref(locale)` → `/cv/${slug(x-displayName)}-cv-${locale}.pdf`, por ejemplo `/cv/kevin-tarqui-cv-es.pdf`.
   - Funciones puras que construyen bloques del CV desde el resume (se pueden testear).
3. **Script:** por cada locale genera A4 con márgenes de 54 pt usando fuentes estándar `Times-Roman` / `Times-Bold` / `Times-Italic` (WinAnsi cubre á, ñ, —, ·, •).
   - **Formato Harvard, una columna:**
     - Nombre completo (`basics.name`) centrado a 20 pt en negrita.
     - Línea de contacto centrada: ciudad y país · teléfono · email · LinkedIn · GitHub (links como anotaciones).
     - Secciones con título en mayúsculas a 11 pt y regla de 0.5 pt: Perfil (`summary`), Experiencia, Proyectos, Educación, Habilidades (`Grupo: keywords`), Idiomas.
     - Experiencia: empresa en negrita a la izquierda y `location` a la derecha; `position` en itálica a la izquierda y `formatMonthRange` a la derecha; bullets `highlights`.
     - Proyectos: igual, con `url`, `type` y `keywords`.
     - Educación: añade `status`.
   - Los títulos de sección salen de `ui[locale].cv`.
   - Las extensiones `x-*` no se imprimen.
   - Metadatos: Title, Author, Subject (`label`), Keywords (skills), `lang`.
   - Salida en `public/cv/` (gitignored).
   - Falla con exit 1 si supera 2 páginas o si falta algún campo requerido.
4. Añadir `public/cv/*.pdf` a `.gitignore`. Enlazar los botones del hero con `getCvHref(locale)`.

**Aceptación:**

- **Automática:**
  - `bun run cv:generate` crea los dos PDF: inicio `%PDF`, ≤2 páginas (conteo de pdfkit) y metadatos presentes;
  - tests de `src/lib/cv.ts` verifican que los bloques contienen todos los trabajos, proyectos, educación, skills e idiomas del resume y ninguna extensión `x-*`;
  - el `href` del CV en `/es/` y `/en/` apunta al PDF de su idioma (`build:check`);
  - render del PDF con Chrome headless a PNG para revisión visual del agente.
- **PENDIENTE DE VERIFICACIÓN MANUAL** si no hay extractor de texto disponible (`pdftotext`): "Abrir cada PDF, seleccionar todo, copiar a un editor y confirmar el orden lógico y los acentos correctos".

### Fase 7 — SEO

1. **`src/lib/seo.ts`:**
   - `canonicalUrl(locale)`.
   - `alternates()`: `es`, `en` y `x-default` → `/es/`.
   - `personJsonLd(portfolio, locale)`: `@type Person` con `name`, `alternateName`, `jobTitle` (label), `address.addressLocality`, `sameAs` (profiles), `url`. Sin email ni teléfono para no alimentar spam.
2. **`Seo.astro`:**
   - `<title>` `${x-displayName} — ${x-headline}`, `description` = `x-tagline`.
   - `canonical`, `hreflang`, `og:type=profile`, `og:locale` `es_EC` / `en_US` más `og:locale:alternate`.
   - `og:image` absoluta de 1200×630 con `og:image:alt`, `twitter:card=summary_large_image`.
   - `theme-color #0B0812`, `color-scheme dark`, JSON-LD.
   - Las páginas de resultado del contacto y la 404 llevan `noindex`.
3. **`sitemap.xml.ts`:** `/es/` y `/en/` con `xhtml:link` alternates. **`robots.txt.ts`:** `Allow: /`, `Disallow: /api/` y `Sitemap:` absoluto.
4. **Assets de marca** (one-off documentado en `scripts/generate-brand-assets.md`): plantilla HTML con "KT" y punto verde sobre fondo con glow, **sin datos profesionales**, capturada con Chrome headless.
   - `public/og-image.png` (1200×630, <200 KB).
   - `apple-touch-icon.png` (180).
   - `favicon.svg` (monograma).
   - `favicon.ico` (32).

**Aceptación:**

- **Automática** (`bun test` de `seo.ts` + `build:check`, bloqueante):
  - canonical propio y hreflang recíprocos;
  - meta OG y Twitter completas con URLs absolutas basadas en `SITE_URL`;
  - JSON-LD parseable;
  - `sitemap.xml` y `robots.txt` correctos;
  - `og-image.png` de 1200×630.
- **PENDIENTE DE VERIFICACIÓN MANUAL:**
  - "Pegar `/es/` desplegada en https://validator.schema.org y confirmar Person sin errores";
  - "Tras el deploy, revisar la vista previa en https://www.opengraph.xyz para `/es/` y `/en/`".

### Fase 8 — Accesibilidad, rendimiento y responsive

**Accesibilidad**

- **Automática:**
  - recorrido por teclado con Claude in Chrome o script headless (skip link, orden de foco, menú, selector, CTA, formulario; el foco visible tiene outline);
  - axe-core ejecutado en `/es/` y `/en/` desktop y mobile, inyectando `axe.min.js` desde `node_modules` vía Claude in Chrome o `bunx @axe-core/cli` con el Chrome local, sin añadir dependencia al proyecto; 0 violaciones.
  - Si ninguna vía de axe es ejecutable: PENDIENTE DE VERIFICACIÓN MANUAL con "Axe DevTools en `/es/` y `/en/`, 0 violaciones".
- **PENDIENTE DE VERIFICACIÓN MANUAL:** "Con NVDA (Windows) o VoiceOver, recorrer `/es/` por encabezados (H) y comprobar el orden de lectura en Experiencia, Proyecto destacado y Stack y que no se lee texto decorativo duplicado".

**Rendimiento**

- JS inicial ≤ 70 KB gzip con motion y ≤ 5 KB sin motion.
- Solo se precarga una fuente.
- Imágenes con `<Picture>` avif/webp, `sizes` y `loading="lazy"` salvo la del círculo de "Trabajo".
- Sin `filter: blur` grande.
- Glows con `radial-gradient`.
- `will-change` solo durante las animaciones.
- `vercel.json` con cache `immutable` para `/_astro/*` y headers `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y `Permissions-Policy` (cámara, micrófono y geolocalización desactivados).

**Responsive:** revisar 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920 y 2560 px, en vertical y horizontal en mobile, y alturas de 600 px en desktop (pins desactivados por debajo de 640 px).

**Aceptación:**

- **Automática:** `bunx lighthouse` (con `CHROME_PATH` al Chrome local) sobre `bunx serve .vercel/output/static`, mobile y desktop, con informes JSON guardados en `.tmp/lighthouse/`. Objetivos: Performance ≥ 95 en mobile y ≥ 98 en desktop, Accessibility 100, Best Practices 100, SEO 100, CLS < 0.05 y LCP < 2.0 s en mobile simulado. Se registran las puntuaciones reales obtenidas.
- **Bloquea:** cualquier violación real de accesibilidad, SEO o best practices señalada por Lighthouse o axe, que se corrige. Si Performance queda por debajo del objetivo tras optimizar, se documentan la puntuación real y la causa (por ejemplo, variabilidad de la simulación local). No se afirma que se alcanzó.
- Tamaño de JS medido sobre los chunks de `.vercel/output/static/_astro` con gzip.
- Si Lighthouse no puede ejecutarse en el entorno: PENDIENTE DE VERIFICACIÓN MANUAL con "Chrome DevTools > Lighthouse, modo navegación, mobile y desktop, en la URL de Preview".

### Fase 9 — Preparación para Vercel y documentación

1. **Proyecto en Vercel:**
   - Framework Astro, install `bun install`, build `bun run build`, Node 22.x.
   - Variables en Production y Preview: `BREVO_API_KEY`, `CONTACT_SENDER_EMAIL`, `CONTACT_SENDER_NAME` (opcional), `CONTACT_RECIPIENT_EMAIL` (opcional), `SITE_URL` (opcional).
2. Verificar con `build:check` que `.vercel/output/config.json` contiene el redirect `/` → `/es/` y la función `api/contact`.
3. Reescribir `README.md` (sustituye el starter de Astro): descripción, stack, scripts, variables, fuente de datos, cómo añadir capturas y cómo regenerar el CV y los assets de marca.
4. Deploy de Preview: solo si hay CLI de Vercel autenticada y proyecto enlazado. No hacer push a `main` ni merge.

**Aceptación:**

- **Automática** (bloqueante): `bun run verify` en verde; `bun run secrets:check` sin `--allow-missing` en verde; `build:check` en verde; `.env.example` sin valores; `git ls-files` sin `.env` ni PDFs generados.
- **PENDIENTE DE VERIFICACIÓN MANUAL** (salvo que el agente tenga acceso autenticado a Vercel, en cuyo caso se ejecuta y se registra el resultado real):
  - "En Vercel: configurar Framework Astro, install `bun install`, build `bun run build`, Node 22.x y las variables de entorno";
  - "En la URL de Preview: `/` redirige a `/es/`, el formulario envía y llega el correo, los CV descargan en su idioma, sitemap y robots responden, vista previa OG correcta".

---

## Verificación (resumen de comandos)

```bash
bun run format:check
bun run resume:validate
bun test
bun run check
bun run cv:generate
mkdir -p .tmp/logs && bun run build > .tmp/logs/build.log 2>&1
bun run build:check                        # HTML, SEO, redirect, función, PDFs
bun run secrets:check                      # valor real de BREVO_API_KEY en artefactos y logs; nunca lo imprime; exit 1 si aparece
bunx serve .vercel/output/static          # QA con navegador + Lighthouse + axe
bun run dev > .tmp/logs/dev.log 2>&1       # en otra terminal, para el E2E
bun scripts/e2e-contact.ts --base http://localhost:4321   # 200 / 422 / 403 / 303 contra Brevo real
bun run verify                             # obligatorio antes de cada commit de fase
```

Capturas de comparación con el artifact: Chrome headless a 1440×900 y 390×844 de `/es/` y `/en/`.

## Riesgos y datos pendientes

| #   | Tema                                                                                    | Acción                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Traducciones EN de `x-tagline` y `x-summaryShort`, y nombres ES de `x-practices`        | **Resuelto:** textos confirmados en "Precisiones aprobadas"                                                                                                                                  |
| 2   | Capturas reales de EcuStock (landing 1280×800, panel 1280×800, catálogo mobile 450×800) | Hasta tenerlas se usa `MediaPlaceholder`. Revisar que no expongan datos de tenants ni URLs privadas                                                                                          |
| 3   | Cuenta Brevo: API key y remitente verificado                                            | **Disponible** en `.env` local: prueba E2E real obligatoria en la Fase 5, sin exponer valores                                                                                                |
| 4   | Rate limiting                                                                           | No hay almacenamiento compartido en el plan gratuito. Se mitiga con honeypot, tiempo mínimo, validación de `Origin` y límites de Brevo. Si llega spam: Cloudflare Turnstile (nueva decisión) |
| 5   | Versión de Bun en Vercel (local 1.4.2)                                                  | Si el build falla por versión, fijar la versión de Bun en la configuración del proyecto o usar la variable `BUN_VERSION`                                                                     |
| 6   | APIs de Astro 7 (`astro:env`, `redirects`, adapter)                                     | Contrastar la sintaxis con la documentación de Astro 7 antes de cada fase; no inventar opciones. El routing i18n ya está contrastado (ver decisión)                                          |
| 7   | `pdfkit` bajo Bun                                                                       | Si falla la carga de las métricas AFM, ejecutar el script con `node --experimental-strip-types` o `bunx tsx`, sin cambiar de librería                                                        |
| 8   | Títulos de longitud distinta por idioma (LET'S TALK)                                    | Resuelto con `--chars`; revisar visualmente EN en todos los breakpoints                                                                                                                      |
| 9   | CLS por sustitución de fuente en titulares gigantes                                     | Preload + fallback con `size-adjust`; medir CLS en la Fase 8                                                                                                                                 |
| 10  | Educación con `endDate` 2026-09 y estado "Título en trámite"                            | Se muestra tal cual; actualizar solo en resume.json cuando cambie                                                                                                                            |

## Estado de fases

| Fase | Estado    | Fecha      | Verificación automática (resultado real)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pendiente de verificación manual                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | Hecha     | 2026-09-15 | `IMPLEMENTATION_PLAN.md` commiteado (7514a68)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 1    | Hecha     | 2026-09-15 | `bun run verify` en verde: format:check OK; resume:validate 2/2; `bun test` 37 pass / 0 fail (dates, portfolio, i18n/config, i18n/ui); `astro check` 0 errores; `astro build` OK. Se añadió `types: ["bun"]` a tsconfig.json para que `astro check` reconozca `bun:test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2    | Hecha     | 2026-09-15 | `bun run verify` en verde. Adaptador `@astrojs/vercel` + fuentes autoalojadas instaladas; `astro.config.mjs` con `site`, `trailingSlash`, `redirects`; `astro build` genera `static/es/index.html` y `static/en/index.html` con `lang` correcto; `.vercel/output/config.json` con redirect `/` → `/es/` (301, verificado también con `curl` en `astro dev`: 301/200/200/404); sin referencias a Google Fonts (`build:check` nuevo, añadido a `verify`); selector de idioma enlaza al idioma contrario en ambos HTML generados                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Apertura/cierre del menú mobile con teclado y Esc: no se pudo probar en un navegador real desde este entorno (sin Claude in Chrome ni Puppeteer instalados); el comportamiento depende de la Popover API nativa del navegador (auto-cierre con Esc es parte del estándar), pero queda pendiente confirmar visualmente: "Abrir con Tab+Enter el botón de menú en mobile, confirmar que Esc lo cierra y el foco vuelve al botón" |
| 3    | Hecha     | 2026-09-15 | `bun run verify` en verde (53 tests, 0 fail). Las 9 escenas implementadas con composición mobile y desktop independientes (Hero, About, Experience, WorkIntro, FeaturedProject, Stack, Practices, Education, Contact + ContactForm, SignalDot, MediaPlaceholder), todo el texto desde `getPortfolio`/`ui` (grep sin coincidencias de datos profesionales hardcodeados). Revisión visual real vía PDF de impresión (`--print-to-pdf`, más fiable en este entorno que capturas por hash) sobre las 9 escenas en ES; se detectaron y corrigieron 2 bugs reales: rango de años invertido en Experiencia mobile (vertical-rl+rotate180 invertía el orden de los años) y contadores "N / N" con padding inconsistente. `astro check` 0 errores. Contraste AA verificado con test nuevo (`src/lib/contrast.ts`, 12/12 pares de tokens ≥ 4.5:1). Cada `<section>` de escena lleva `overflow-hidden` (más `overflow-x-hidden` en `body`) para que los elementos decorativos que sangran fuera del viewport no generen scroll horizontal | Comparación pixel-perfecta contra el artifact aprobado en `/en/` y en más anchos intermedios (768–1023px): revisada solo en ES a ~800px efectivo vía PDF y en desktop 1440px vía captura; revisar visualmente "Cómo trabajo" (anillos decorativos) y "Stack" en un navegador real                                                                                                                                              |
| 4    | Pendiente | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 5    | Pendiente | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6    | Pendiente | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7    | Pendiente | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 8    | Pendiente | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 9    | Pendiente | —          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                              |
