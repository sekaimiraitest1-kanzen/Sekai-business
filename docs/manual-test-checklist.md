---
name: Trisha — Manual test checklist (Sprint 5)
description: Tests Stefan runs on real devices/browsers before launch. Code-side a11y is shipped; this checklist covers what only humans can verify.
type: test-checklist
date: 2026-04-30
target-time: ~2 hours total
---

# Manual test checklist

Code-level a11y improvements landed in Sprint 5 (skip-to-content link,
global focus-visible ring, aria-labels, semantic landmarks). What's
left needs real eyes / real devices / real assistive tech.

Run this before launch — ideally with the production preview URL
(`https://trisha.vercel.app` or whatever Vercel assigns) once Vercel
build clears.

---

## 1. Keyboard navigation (~15 min, desktop browser)

Open the site, press Tab from the URL bar, and walk through every
interactive element. Goal: never hit a "trap" (focus stuck), every
focusable element has a visible ring, logical order, no skipped
sections.

### Test routes

- [ ] `/` — Tab through skip-link → nav links → hero CTAs → service cards → gallery → testimonials → footer social icons → legal links
- [ ] `/zakazivanje` — Tab through nav → service picker → date/time picker → form inputs → submit
- [ ] `/shop` — Tab through nav → category filters → product cards → cart trigger
- [ ] `/shop/pomada-batajnica` — Tab through nav → quantity → add-to-cart → related items
- [ ] `/admin/login` — Tab through PIN keypad → submit
- [ ] `/admin/podesavanja` — Tab through tabs → fields in active tab

### Specific things to verify

- [ ] **Skip-to-content link** — appears as visible button at top-left when you press Tab from URL bar. Click it → focus jumps below the nav.
- [ ] **Focus ring** — every focused element shows a visible 2px mustard outline. Some buttons/links may have custom focus (footer social icons), but NO element is invisible-when-focused.
- [ ] **Modal traps** — open admin mušterije edit sheet OR walk-in booking sheet → Escape should close OR Tab should not escape behind the modal.
- [ ] **Lang toggle** — Tab to ЋИР/LAT buttons, Enter to switch. Site re-renders, focus remains.

### Known limitations (won't fix V1)

- Modal focus trap not implemented — Escape key closes most sheets but Tab can escape behind. V1.1 task.
- Calendar widget in `/zakazivanje` — date cells are `<button>` but month-arrow nav doesn't loop announce. V1.1.

---

## 2. Screen reader smoke (~30 min)

### NVDA on Windows (free)

1. Install NVDA from nvaccess.org (free)
2. Visit `/` with NVDA running
3. Verify announcements:
   - [ ] "Berbernica Triša — početna" on logo (aria-label)
   - [ ] "Glavna navigacija" on nav (aria-label)
   - [ ] H1 reads as the hero title
   - [ ] H2s announce as section headings (Šta radimo, Galerija, etc.)
   - [ ] Working hours table is read row-by-row
   - [ ] Footer social icons announce as "Instagram, link" / "Facebook, link" / etc.
4. Visit `/zakazivanje`:
   - [ ] H1 ("Zakazivanje termina — Berbernica Triša, Batajnica") is read first (sr-only)
   - [ ] Step labels announce ("Korak 1 od 5: Usluga")
   - [ ] Service cards have descriptive labels

### VoiceOver on iOS Safari

1. Settings → Accessibility → VoiceOver → On
2. Visit `https://<domain>/` on iPhone
3. Three-finger swipe up to navigate by element
4. Same checks as NVDA above
5. **Bonus**: try the booking flow end-to-end with VoiceOver only — log any rough spots

### Known limitations

- Cyrillic announcements depend on the user's TTS voice supporting sr-Cyrl. Most modern systems do; older Android may struggle. Acceptable per V1 audience.

---

## 3. Browser matrix (~30 min)

For each browser/OS combo, run the **3-flow smoke**:

**Flow A**: Home → click "Zakaži termin" → fill booking form → submit → confirm email arrives
**Flow B**: Home → Shop → add 2 products to cart → checkout → confirm order arrives
**Flow C**: Home → toggle ЋИР/LAT 3 times → verify no flash, all text changes

| Browser | OS | A | B | C | Notes |
|---|---|---|---|---|---|
| Chrome 120+ | Win 11 / macOS 14 | [ ] | [ ] | [ ] | |
| Firefox 120+ | Win 11 / macOS 14 | [ ] | [ ] | [ ] | |
| Safari 17+ | macOS 14 | [ ] | [ ] | [ ] | |
| Edge 120+ | Win 11 | [ ] | [ ] | [ ] | |
| Safari iOS | iPhone 12+ | [ ] | [ ] | [ ] | |
| Chrome | Android 10+ | [ ] | [ ] | [ ] | |

### Specific things to check across browsers

- [ ] Cyrillic + Latin text both render correctly (no font fallback to system serif on iOS — should always be Playfair / Cormorant)
- [ ] Hero auto-open status badge updates (open/closed based on Belgrade time)
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] PWA install prompt fires after a few seconds on Chrome/Edge
- [ ] Phone link `tel:+381...` opens dialer on mobile

---

## 4. PWA install (~10 min)

### iOS

- [ ] Visit site in Safari → Share button → "Add to Home Screen"
- [ ] App icon shows correctly (Triša logo, not generic safari icon)
- [ ] Tap icon → opens fullscreen, no Safari chrome
- [ ] App name reads "Триша" (sr-Cyrl) or "Trisha" (per Stefan preference — currently sr-Cyrl in manifest)
- [ ] Splash screen shows logo briefly (uses icons/icon-512.png)
- [ ] Status bar matches brand (black-translucent)

### Android Chrome

- [ ] Visit site → 3-dot menu → "Install app" or "Add to Home screen"
- [ ] App icon shows correctly
- [ ] Tap icon → opens in standalone PWA shell (no URL bar)
- [ ] Notification permission NOT requested (we deliberately don't use push for V1)

---

## 5. Service worker behavior (~15 min)

### Stale content test

1. Visit `/` and wait for SW to register (~2 sec)
2. In another tab, log into admin → /admin/sajt → change hero subtitle text → save
3. Go back to first tab, hard-reload (Ctrl+Shift+R)
4. **Expected**: hero shows new text within 1-2 seconds (network-first strategy)
5. **If fails** (still shows old text after 5 sec): SW is over-caching HTML; needs SW patch, V1.1

### Offline test

1. DevTools → Network → Offline
2. Reload `/` → should show cached version with "Offline" hint? OR `/offline` page
3. Reload `/admin` → should show error (admin can't work offline)

---

## 6. Forms data validation (~15 min)

### Booking flow `/zakazivanje`

- [ ] Submit empty form → shows error
- [ ] Submit with invalid phone (e.g., "abc") → rejects
- [ ] Submit with email containing space → rejects (or accepts? mark as TODO)
- [ ] Try to book a slot already taken (use 2 browsers) → second one shows "slot taken" error
- [ ] Try to book on Sunday (closed) → date picker should not show Sunday

### Order flow `/shop`

- [ ] Empty cart → checkout button is disabled or shows "no items"
- [ ] Submit empty form → shows error
- [ ] Submit successfully → order confirmation shows order ID + total

### Admin

- [ ] PIN with 3 digits → rejected
- [ ] PIN with letters → rejected
- [ ] 5 wrong PINs → 10-min lockout

---

## 7. Mobile UX gut-check (~15 min, on a real phone)

- [ ] Tap targets are easily hittable (no fat-finger issues)
- [ ] Text is readable without zoom (16px+ for body)
- [ ] No horizontal scroll on any page
- [ ] Hero image doesn't push CTA below fold on iPhone SE (smallest target)
- [ ] Cookie banner doesn't cover important CTAs on first visit
- [ ] Lang toggle is reachable with thumb on tall phones
- [ ] Booking calendar is usable one-handed

---

## What to do with findings

For each issue found, decide:

- **Show-stopper** (broken flow, security risk, accessibility blocker): fix before launch
- **Polish** (minor visual, edge case, slow but works): track for V1.1 in `docs/release-master-plan-2026-04-30.md` post-launch section
- **Won't fix** (browser-specific quirk acceptable, cross-platform inconsistency we accept): note here so future sessions don't re-discover

Log issues in:
```
docs/qa-findings-2026-MM-DD.md
```
with structure: route → symptom → severity → fix or won't-fix.
