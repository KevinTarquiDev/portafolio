# Reglas del proyecto

## Qué es este proyecto

Portafolio personal de Kevin Tarqui desarrollado desde cero para reemplazar completamente el portafolio anterior.

El objetivo es construir una experiencia moderna, profesional, rápida y mantenible que funcione como carta de presentación técnica del autor.

El diseño parte de los mockups definidos previamente en Google Stitch y debe mantener una identidad visual oscura, técnica y elegante, con morado como color principal y verde como acento secundario.

Principios generales:

- diseño limpio y profesional;
- responsive y mobile-first;
- excelente rendimiento;
- accesibilidad;
- SEO;
- animaciones sutiles y justificadas;
- código mantenible y fácil de extender;
- evitar complejidad innecesaria;
- el propio código forma parte de la presentación profesional del autor.

No utilizar fondos de video, WebGL pesado, efectos excesivos, estética gamer, Matrix, neón exagerado ni elementos que perjudiquen rendimiento o legibilidad.

---

## Idioma

Siempre responder al usuario en español, independientemente del idioma de la consulta.

El portafolio tendrá soporte para:

- español como idioma principal;
- inglés como idioma secundario.

Las rutas previstas son:

- `/es`
- `/en`

El contenido profesional no debe duplicarse manualmente en componentes.

---

## Stack

### Framework

- **Astro 7**
- generación estática por defecto;
- componentes `.astro` como opción principal;
- no utilizar React, Vue, Svelte u otro framework cliente salvo que exista una necesidad técnica concreta que Astro por sí solo no resuelva;
- evitar hidratación innecesaria;
- priorizar HTML generado estáticamente.

### Lenguaje

- **TypeScript 6.0.3**
- configuración estricta;
- prohibido utilizar `any`;
- utilizar `unknown` y narrowing cuando el tipo sea realmente desconocido.

TypeScript 7 no se utiliza actualmente porque `astro check` todavía depende de APIs programáticas disponibles en TypeScript 6.

### Estilos

- **Tailwind CSS 4**
- integración mediante `@tailwindcss/vite`;
- no crear `tailwind.config.js` salvo que exista una necesidad real;
- priorizar clases Tailwind;
- CSS personalizado únicamente cuando Tailwind no sea suficiente o cuando una abstracción global sea más clara.

### Animaciones

- **GSAP 3**
- utilizar GSAP y ScrollTrigger para animaciones complejas o relacionadas con scroll;
- las animaciones deben ser sutiles, fluidas y profesionales;
- respetar `prefers-reduced-motion`;
- evitar animaciones que bloqueen navegación, lectura o interacción;
- no introducir librerías adicionales de animación sin justificación.

### Datos profesionales

Se utilizará **JSON Resume** como fuente única de verdad para los datos profesionales.

Archivo previsto:

`data/resume.json`

La información profesional que exista en `resume.json` MUST NOT duplicarse manualmente dentro de componentes Astro.

Ejemplos:

- información personal;
- experiencia profesional;
- educación;
- proyectos;
- tecnologías;
- enlaces profesionales;
- datos de contacto;
- idiomas.

Los componentes deben transformar y presentar estos datos, no volver a declararlos.

### CV

El CV será generado automáticamente a partir de la misma fuente de datos de JSON Resume.

Objetivo:

`resume.json -> renderer/theme -> CV PDF`

El diseño del CV seguirá un estilo Harvard limpio, profesional y compatible con ATS.

El PDF generado es un artefacto derivado. Nunca debe convertirse en una segunda fuente de información profesional.

### Formulario de contacto

La integración prevista será **Brevo** mediante backend/serverless.

Reglas:

- ninguna API key privada puede exponerse en el navegador;
- secretos únicamente mediante variables de entorno;
- nunca utilizar secretos con prefijos públicos;
- validar datos también del lado servidor;
- incluir protección básica contra spam antes de producción.

---

## Gestor de paquetes

Se utiliza exclusivamente **Bun**.

Versión actual:

`bun 1.4.2`

MUST utilizarse:

```bash
bun install
bun add
bun remove
bun run
bunx
```

MUST NOT utilizarse:

```bash
npm install
npm run
pnpm
yarn
```

El proyecto debe mantener únicamente el lockfile de Bun.

No generar ni commitear:

- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`

---

## Estructura del proyecto

La estructura evolucionará según las necesidades reales, pero debe seguir esta organización general:

```text
portafolio-pro/
├── public/
│   ├── cv/
│   └── projects/
│
├── data/
│   └── resume.json
│
├── scripts/
│
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── es/
│   │   └── en/
│   ├── styles/
│   ├── lib/
│   └── types/
│
├── astro.config.mjs
├── tsconfig.json
├── .prettierrc.mjs
├── package.json
└── bun.lock
```

No crear carpetas o capas arquitectónicas anticipadamente si todavía no tienen una responsabilidad real.

---

## Componentes Astro

Usar componentes `.astro` como opción por defecto.

Un componente debe extraerse cuando:

- se reutiliza;
- representa una sección claramente diferenciada;
- encapsula lógica o presentación suficientemente compleja;
- mejora de forma real la legibilidad.

No separar componentes diminutos únicamente para aumentar la cantidad de archivos.

Ejemplo esperado:

```text
src/components/
├── Navbar.astro
├── Hero.astro
├── About.astro
├── Experience.astro
├── Projects.astro
├── Technologies.astro
├── EngineeringPractices.astro
├── Education.astro
├── Contact.astro
└── Footer.astro
```

Los nombres definitivos pueden cambiar según la implementación.

---

## JavaScript en cliente

Astro genera HTML estático por defecto.

No enviar JavaScript al navegador cuando no sea necesario.

Antes de introducir lógica cliente preguntarse:

1. ¿Puede resolverse durante build?
2. ¿Puede resolverse con HTML/CSS?
3. ¿Realmente necesita estado en cliente?
4. ¿GSAP necesita ejecutar esta parte en navegador?

No convertir el sitio completo en una SPA.

No añadir React solo por comodidad o costumbre.

Si en el futuro se utiliza una isla de UI:

- debe existir una justificación concreta;
- debe hidratarse únicamente cuando sea necesario;
- no debe provocar que el resto del sitio dependa del framework añadido.

---

## Prácticas de código obligatorias

### TypeScript

Prohibido:

```ts
any;
```

Preferir:

```ts
unknown;
```

y realizar narrowing explícito.

Definir tipos para:

- props;
- datos transformados;
- funciones;
- estructuras internas cuando TypeScript no pueda inferirlas adecuadamente.

Evitar type assertions innecesarias.

### Código muerto

MUST NOT quedar:

- imports sin usar;
- variables sin usar;
- funciones abandonadas;
- componentes obsoletos;
- código comentado que ya no se utiliza;
- logs temporales de depuración.

### Astro

Utilizar frontmatter para lógica de build:

```astro
---
const data = ...
---
```

Mantener la lógica compleja fuera del markup cuando perjudique la lectura.

La lógica reutilizable debe vivir en `src/lib/`.

### Estilos

Priorizar Tailwind.

Evitar:

- estilos inline innecesarios;
- clases arbitrarias repetidas continuamente;
- duplicación extensa de estilos;
- valores mágicos sin justificación.

Cuando un patrón visual se repita, extraer una abstracción razonable.

### Accesibilidad

MUST mantenerse como mínimo:

- HTML semántico;
- jerarquía correcta de encabezados;
- `alt` útil en imágenes con contenido;
- labels asociados correctamente con inputs;
- navegación mediante teclado;
- estados de `focus` visibles;
- contraste suficiente;
- botones y enlaces semánticamente correctos;
- soporte para `prefers-reduced-motion`.

No utilizar un `<div>` como botón.

### Responsive

El diseño debe ser mobile-first.

Trabajar desde la versión pequeña hacia:

- `sm`
- `md`
- `lg`
- `xl`

Los mockups principales de referencia corresponden a:

- Mobile: 390 px
- Desktop: 1440 px

El diseño también debe comportarse correctamente entre ambos tamaños.

---

## Fuente única de verdad

La regla más importante relacionada con contenido profesional es:

> Un dato profesional debe mantenerse manualmente en un solo lugar.

Si una experiencia está en:

`data/resume.json`

no debe volver a escribirse en:

- `Experience.astro`;
- CV;
- metadata duplicada;
- archivos específicos para español e inglés;
- otros componentes.

Las diferentes representaciones deben derivarse automáticamente de la fuente canónica.

Esto aplica especialmente a:

- experiencia;
- educación;
- proyectos;
- tecnologías;
- URLs;
- fechas;
- contacto.

Los textos puramente relacionados con interfaz, navegación o diseño sí pueden estar fuera de JSON Resume.

---

## Contenido del portafolio

No inventar información profesional.

No inventar:

- empresas;
- proyectos;
- tecnologías;
- métricas;
- resultados;
- certificaciones;
- clientes;
- años de experiencia.

Si falta información, solicitarla antes de incorporarla como dato real.

### Proyectos

Actualmente el proyecto principal es EcuStock, que debe aparecer como proyecto destacado.

El propio portafolio no debe incluirse como entrada dentro de su propia sección de proyectos.

El nombre correcto del producto es:

`EcuStock`

`webstockify.com` es el dominio de su landing comercial pública.

No afirmar que dicho dominio proporciona acceso público al panel administrativo, tenant, dashboard privado o demo interna.

El CTA público correspondiente debe expresarse como algo equivalente a:

`Visitar sitio`

y no como:

- Live Demo;
- Probar aplicación;
- Abrir dashboard.

No exponer:

- credenciales;
- URLs privadas;
- endpoints internos;
- información de tenants;
- secretos;
- infraestructura privada.

---

## Diseño

La implementación debe seguir el diseño aprobado en Stitch como referencia visual principal.

Identidad general:

- dark;
- morado oscuro como identidad principal;
- verde elegante como acento secundario;
- tipografía limpia;
- composición moderna;
- estética técnica pero profesional.

El verde `#57B56F` puede utilizarse como referencia visual, no necesariamente como valor inmutable.

Evitar:

- exceso de glow;
- neon gaming;
- gradientes agresivos;
- fondos de video;
- ruido visual;
- partículas pesadas;
- efectos WebGL innecesarios;
- animaciones permanentes que distraigan.

No utilizar fotografía personal en el diseño.

---

## GSAP

GSAP se utiliza para mejorar la experiencia, no para dominarla.

Usos adecuados:

- entrada inicial del Hero;
- reveals;
- stagger;
- timeline de experiencia;
- ScrollTrigger;
- parallax muy sutil;
- movimiento de líneas o nodos decorativos;
- transiciones de secciones.

Evitar:

- animar cada elemento;
- scroll hijacking;
- tiempos excesivos;
- animaciones que dificulten lectura;
- dependencia de animaciones para entender contenido.

Las animaciones deben degradarse correctamente si JavaScript falla.

---

## Prettier

Prettier es el formatter oficial del proyecto.

Configuración:

`.prettierrc.mjs`

No aplicar estilos manuales inconsistentes para competir con el formatter.

Comandos:

```bash
bun run format
bun run format:check
```

---

## Scripts

Scripts base:

```bash
bun run dev
bun run build
bun run preview
bun run check
bun run format
bun run format:check
bun run fix
bun run verify
```

### `fix`

Corrige formato y ejecuta validaciones básicas.

### `verify`

Debe utilizarse antes de considerar terminado un cambio:

```bash
bun run verify
```

Actualmente verifica:

1. Prettier;
2. Astro Check;
3. build de producción.

---

## Verificación obligatoria

Antes de considerar finalizada una tarea que modifique código:

```bash
bun run verify
```

El cambio no se considera terminado si existe:

- error de Astro;
- error de TypeScript;
- error de formato;
- error de build.

No solucionar errores ocultándolos, ignorándolos o desactivando validaciones sin justificación.

---

## Commits

Los commits deben ser pequeños, coherentes y representar una unidad lógica de trabajo.

Formato:

```text
{numero-rama}-{tipo}: descripción
```

Tipos permitidos:

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `build`
- `ci`
- `chore`
- `revert`

Ejemplo:

```text
12-feat: implementación de sección de experiencia profesional
```

Cuando sea necesario body:

```text
12-feat: implementación de sección de experiencia profesional

- integración de datos desde JSON Resume
- adaptación responsive del timeline
- animaciones de entrada mediante GSAP
```

El tipo del commit se escribe en inglés.

La descripción y el body se escriben en español.

No mencionar herramientas, agentes ni modelos de IA como autores o coautores del commit.

---

## Uso de agentes de desarrollo

Claude Code, Codex u otros agentes deben respetar estas mismas reglas.

Antes de modificar código deben:

1. revisar la estructura existente;
2. revisar `package.json`;
3. reutilizar patrones existentes;
4. evitar instalar dependencias sin necesidad;
5. evitar reestructuraciones no solicitadas.

Un agente MUST NOT:

- cambiar el stack por iniciativa propia;
- instalar React porque le resulte más familiar;
- reemplazar Bun por npm/pnpm/yarn;
- duplicar contenido de `resume.json`;
- agregar dependencias sin una justificación técnica;
- modificar diseño global fuera del alcance de la tarea;
- introducir secretos;
- inventar contenido profesional.

Después de implementar debe ejecutar:

```bash
bun run verify
```

y corregir los problemas relacionados con sus cambios antes de dar la tarea por terminada.

---

## Principio general

Preferir siempre:

> la solución más simple que mantenga calidad, rendimiento, accesibilidad y mantenibilidad.

No añadir abstracciones, dependencias, frameworks o patrones únicamente porque sean posibles.
