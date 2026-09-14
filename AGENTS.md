# Reglas del proyecto

## Qué es este proyecto

Portafolio personal de Kevin Tarqui. El objetivo es que se vea **moderno,
intuitivo y profesional**: UI limpia, responsive (mobile-first), animaciones
sutiles (scroll-reveal, fondo de partículas), y código mantenible que
refleje buenas prácticas reales — es la carta de presentación técnica del
autor, así que el propio código también comunica el nivel del desarrollador.

## Idioma

Siempre se responde en español, sin importar el idioma en el que esté
escrita la consulta.

## Stack

- **React 19** + **TypeScript** (`strict: true`) — sin `ReactDOM.render`
  legado, sin clases, solo function components + hooks.
- **Tailwind CSS v4** vía `@tailwindcss/vite` (sin `tailwind.config.js`,
  sin PostCSS/autoprefixer — Tailwind v4 los reemplaza).
- **Vite 7** + `@vitejs/plugin-react-swc` como bundler/dev server.
- **pnpm** como gestor de paquetes (`packageManager` fijado en
  `package.json`, ver `.nvmrc` para la versión de Node).
- **`@tsparticles/react` + `@tsparticles/slim`** para el fondo animado.
- **`react-intersection-observer`** para animaciones on-scroll.
- **`@emailjs/browser`** para el formulario de contacto (credenciales en
  variables de entorno, nunca hardcodeadas — ver sección de env vars).
- **`@fortawesome/fontawesome-free`** para iconografía (vía `@import` CSS).

## Estructura del proyecto

```
src/
  main.tsx              # entry point, monta <App /> en #root
  App.tsx               # composición de secciones de la página
  App.css               # imports globales (fontawesome, tailwind) + estilos base
  vite-env.d.ts          # tipos de Vite + ImportMetaEnv (variables de entorno)
  components/            # una sección de la página por componente
    NavBar.tsx, Header.tsx, Skills.tsx, Projects.tsx,
    Contact.tsx, Footer.tsx, ProfileImage.tsx
  assets/
    laybel/Laybel.tsx     # componente de título reutilizable
    background/           # fondo de partículas (ParticlesBackground.tsx + particles.ts)
    effect/*.css          # animaciones CSS puntuales por sección
    logos/, photos/, video/  # imágenes y video estáticos
```

Convención: un componente de sección = un archivo en `components/`. Un
subcomponente que solo tiene sentido dentro de otro (ej. `FooterLink` en
`Footer.tsx`, `SkillCard` en `Skills.tsx`, `ProjectCard` en `Projects.tsx`)
vive en el mismo archivo, no se separa a menos que se reutilice en más de un
lugar.

## Prácticas de código (obligatorias)

- **Prohibido `any`.** `strict: true` está activo en `tsconfig.app.json`.
  Si un tipo es genuinamente desconocido, usar `unknown` y angostarlo, no
  `any`. Todo componente con props declara su `interface` (ver `Footer.tsx`,
  `Projects.tsx`, `Skills.tsx` como referencia de patrón).
- **Sin imports/variables sin usar.** ESLint (`noUnusedLocals`/
  `noUnusedParameters` en TS + `eslint-plugin-react`) lo bloquea. No dejar
  imports de `React` sueltos — el JSX runtime automático no lo necesita.
- **Hooks solo en el nivel superior de un componente**, nunca dentro de
  `.map()`/callbacks/condicionales (ej. el patrón `SkillCard`/`ProjectCard`:
  si necesitas `useInView` por ítem de una lista, extrae un subcomponente).
- **Extensión de archivo según contenido:** `.tsx` si el archivo tiene JSX,
  `.ts` si es lógica/datos puros (ej. `particles.ts`).
- **Estilos con clases de Tailwind**, no inline `style={{}}` salvo casos que
  Tailwind no puede expresar (ej. `border-image` con gradiente en
  `NavBar.tsx`/`Footer.tsx`).
- **Sin secretos ni IDs de servicio hardcodeados en el código.** Van en
  variables de entorno (`VITE_*`), tipadas en `src/vite-env.d.ts` vía
  `ImportMetaEnv`, con `.env.example` documentando las claves y `.env` real
  ignorado por git.
- **Accesibilidad básica:** `alt` descriptivo en `<img>`, `htmlFor`/`id`
  correspondientes en labels de formulario, contraste de color razonable —
  ya se sigue en `Contact.tsx`/`Skills.tsx`, mantenerlo al agregar UI nueva.
- **Mobile-first:** usar los breakpoints de Tailwind (`sm:`, `md:`, `lg:`)
  partiendo del layout mobile, como ya hace `Header.tsx`/`NavBar.tsx`.

## Commits

Todo commit MUST seguir el formato validado por `commitlint.config.cjs`:
`{numero_rama}-{tipo}(detalle opcional): descripción`. `{tipo}` MUST ser uno
de los valores en inglés de `type-enum` de `@commitlint/config-conventional`
(`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`) — MUST NOT traducirse, porque commitlint rechaza el commit
si no coincide. La descripción (subject) y, cuando el commit incluye varios
cambios, cada punto adicional del body MUST escribirse en español y MUST NOT
colocarse ni mencionarse ningún modelo IA como co-author.

Ejemplo:

```
12-feat: implementación de disponibilidad automática de variantes
- método calculatePublicAvailability para el nuevo cálculo
- se modificó el mapper de variantes para exponer el nuevo estado
```

## Verificación antes de subir cambios

Los hooks de Husky (`.husky/`) ya automatizan esto, pero como referencia:

- `pre-commit`: corre `lint-staged` (ESLint + Prettier sobre los archivos en stage).
- `commit-msg`: valida el mensaje del commit con commitlint.
- `pre-push`: corre `pnpm run check` (typecheck + lint + format:check) y `pnpm run build`.

Scripts útiles: `pnpm dev`, `pnpm build`, `pnpm lint` / `pnpm lint:fix`,
`pnpm format` / `pnpm format:check`, `pnpm typecheck`, `pnpm check` (los
tres anteriores juntos), `pnpm fix` (lint:fix + format).
