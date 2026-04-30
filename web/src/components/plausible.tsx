import Script from "next/script";

/**
 * Plausible Analytics — privacy-first, no-cookie, GDPR-friendly. Loads only
 * when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set, so dev / preview / unconfigured
 * environments don't ship the script. Drop-in: Stefan adds the domain to
 * Plausible after launch, sets the env var, redeploys.
 *
 * The `script.outbound-links` extension auto-tags clicks on external links
 * (good for tracking which footer social platforms get clicked). The
 * `script.tagged-events` extension lets us attach `data-analytics-event`
 * attributes to elements for declarative event tracking without per-handler
 * code.
 *
 * Custom events go through `window.plausible(eventName, {...})` — see
 * `lib/plausible.ts` for the typed wrapper.
 */
export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.outbound-links.tagged-events.js"
      strategy="afterInteractive"
    />
  );
}
