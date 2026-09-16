# Assets de marca (proceso manual, no automatizado)

Los archivos en `public/` — `favicon.svg`, `favicon.ico`,
`apple-touch-icon.png` y `og-image.png` — muestran únicamente
monograma/logo de marca sobre fondo oscuro. Ninguno contiene datos
profesionales: son puramente de marca.

## Favicons (favicon.svg, favicon.ico, apple-touch-icon.png)

Desde septiembre 2026 estos tres parten del logo oficial "K" (círculo
morado con punto verde) entregado como PNG cuadrado. Proceso:

1. Redimensionar el PNG fuente con Pillow (Python) a los tamaños
   necesarios: 180×180 para `apple-touch-icon.png`, y un `.ico`
   multi-tamaño (16, 32, 48 px) para `favicon.ico`.
2. `favicon.svg` no es vectorial real (el logo fuente es raster): es
   un `<svg>` que envuelve el PNG redimensionado a 256×256 como
   `data:image/png;base64,...` en un `<image>`. Escala razonablemente
   bien para los tamaños en que se usa un favicon (16–64 px); no sirve
   como ilustración vectorial de gran formato.
3. El PNG fuente original no se commitea a `public/` (no es un
   artefacto final, ver regla al final de este archivo).

Si se reemplaza el logo en el futuro, repetir este proceso con el
nuevo PNG fuente cuadrado.

## og-image.png

Este archivo sigue el proceso manual anterior (monograma "KT" + punto
generado con Chrome headless). Si hay que regenerarlo (cambio de
paleta, nuevo tamaño, etc.):

1. Crear una plantilla HTML mínima con el fondo (`#0B0812` + glow
   radial morado `rgba(122,63,224,.45-.55)`) y el monograma en
   `"Arial Narrow", Arial, sans-serif` peso 800 (el mismo fallback que
   usa `--font-sans` en `src/styles/global.css`), color `#F2EEF7`, con
   el punto verde `#5FD18A`.
2. **Usar valores de píxel fijos que coincidan exactamente con el
   tamaño de captura**, nunca `vw`/`vh`: en este entorno, `vw`/`vh` se
   resolvieron contra un viewport interno de Chrome distinto al
   `--window-size` solicitado en capturas headless pequeñas, dejando
   el monograma centrado fuera del recorte. Con `width/height:
<tamaño>px` exactos no hay ambigüedad.
3. Capturar con Chrome headless, por ejemplo:

   ```bash
   chrome --headless=new --disable-gpu --hide-scrollbars \
     --force-device-scale-factor=1 --virtual-time-budget=3000 \
     --window-size=1200,630 \
     --screenshot=og-image.png "file:///<ruta-absoluta>.html"
   ```

4. Revisar la imagen con el visor de imágenes antes de copiarla a
   `public/`: fondo correcto, monograma centrado y nítido, sin
   artefactos de recorte.

No se commitea ninguna plantilla HTML intermedia ni las capturas
originales: solo el archivo final `og-image.png` en `public/`.
