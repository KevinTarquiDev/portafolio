# Assets de marca (proceso manual, no automatizado)

Los archivos en `public/` — `favicon.svg`, `favicon.ico`,
`apple-touch-icon.png` y `og-image.png` — muestran únicamente el
monograma "K" + punto verde (o "KT" + punto en el caso de
`og-image.png`) sobre el fondo oscuro con glow morado del sitio.
Ninguno contiene datos profesionales: son puramente de marca.

Este es un proceso **manual, uno solo**, no un script de build. Si
hay que regenerarlos (cambio de paleta, nuevo tamaño, etc.):

1. Crear una plantilla HTML mínima con el fondo (`#0B0812` + glow
   radial morado `rgba(122,63,224,.45-.55)`) y el monograma en
   `"Arial Narrow", Arial, sans-serif` peso 800 (el mismo fallback que
   usa `--font-sans` en `src/styles/global.css`), color `#F2EEF7`, con
   el punto verde `#5FD18A`.
2. **Usar valores de píxel fijos que coincidan exactamente con el
   tamaño de captura**, nunca `vw`/`vh`: en este entorno, `vw`/`vh` se
   resolvieron contra un viewport interno de Chrome distinto al
   `--window-size` solicitado en capturas headless pequeñas (180×180,
   32×32), dejando el monograma centrado fuera del recorte. Con
   `width/height: <tamaño>px` exactos no hay ambigüedad.
3. Capturar con Chrome headless, por ejemplo:

   ```bash
   chrome --headless=new --disable-gpu --hide-scrollbars \
     --force-device-scale-factor=1 --virtual-time-budget=3000 \
     --window-size=<ancho>,<alto> \
     --screenshot=<salida>.png "file:///<ruta-absoluta>.html"
   ```

   Tamaños usados: `og-image.png` 1200×630, `apple-touch-icon.png`
   180×180, el PNG de 32×32 que se guarda como `favicon.ico`, y un
   PNG de 512×512 de referencia para futuros tamaños de ícono de app.

4. `favicon.svg` se escribió a mano como SVG vectorial equivalente
   (mismo monograma, fondo con esquinas redondeadas) para que escale
   sin pixelarse en cualquier tamaño.
5. Revisar cada imagen con el visor de imágenes antes de copiarla a
   `public/`: fondo correcto, monograma centrado y nítido, sin
   artefactos de recorte.

No se commitea ninguna plantilla HTML intermedia ni las capturas
originales: solo los 4 archivos finales en `public/`.
