/**
 * Mejora progresiva del selector de idioma: si la página tiene un hash
 * de escena activo (por ejemplo "#contact"), lo conserva al cambiar de
 * idioma en lugar de volver siempre al inicio del otro idioma.
 */
function preserveHashOnLanguageLinks(): void {
  const hash = window.location.hash;
  if (!hash) {
    return;
  }

  const links = document.querySelectorAll<HTMLAnchorElement>(
    "[data-language-link]",
  );

  for (const link of links) {
    const url = new URL(link.href);
    url.hash = hash;
    link.href = url.toString();
  }
}

preserveHashOnLanguageLinks();
