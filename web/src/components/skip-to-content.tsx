/**
 * Visually-hidden skip link — appears on first Tab focus, lets keyboard +
 * screen-reader users jump past the nav directly into the main content
 * region. WCAG 2.4.1 (Bypass Blocks). Hidden until focused.
 *
 * Targets `#main-content` — pages that render their own main element should
 * give it `id="main-content"` (homepage, shop, booking, legal pages already
 * have a `<main>` semantically; we add the id where missing in a follow-up
 * pass).
 */
export function SkipToContent() {
  return (
    <a href="#main-content" className="skip-to-content">
      <span data-sr>Прескочи на садржај</span>
      <span data-lat>Preskoči na sadržaj</span>
    </a>
  );
}
