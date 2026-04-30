# Phase A.3 — Citability Scoring

**Date:** 2026-04-29
**Target:** http://localhost:3050/ (Berbernica barbershop, sr-Cyrl + sr-Latn dual-script)
**Tool:** `~/.claude/skills/geo-seo/scripts/citability_scorer.py` (zubair-trabzada/geo-seo-claude)
**Reference:** `docs/seo-geo-skills-research.md` §5 step 3
**Pre-context:** Phase A.1 (`audit-2026-04-29-phase-a-1-technical.md`)

---

## Methodology — the 5-dimension rubric

The scorer (`citability_scorer.py`) and skill (`~/.claude/skills/geo-seo/geo-citability/SKILL.md`) score each content block 0-100 using a 5-dimension weighted rubric. **Each dimension's max is its weight, so the JSON sub-scores are already weighted contributions to a 100-pt total.**

| # | Dimension (JSON key) | Weight | What it measures |
|---|---|---|---|
| 1 | `answer_block_quality` | 30 | Definition patterns ("X is …"), answer-first openings in first 60 words, question-style headings, named-source citations ("according to …") |
| 2 | `self_containment` | 25 | Optimal length (134-167 words is GEO sweet spot), low pronoun density, presence of named entities/proper nouns — i.e. passage stands alone when extracted |
| 3 | `structural_readability` | 20 | Avg sentence length 10-20 words, ordered/numbered lists, transition cues ("first/second/finally"), paragraph breaks |
| 4 | `statistical_density` | 15 | Percentages, dollar amounts, year references (2023-2026), counts-with-units, named-source patterns (Gartner, Stanford, etc.) |
| 5 | `uniqueness_signals` | 10 | First-party data ("our research/we surveyed"), case-study markers ("for example", "in practice"), specific tool/product mentions |

**Grade bands:** A ≥80, B ≥65, C ≥50, D ≥35, F <35.

**Note on the Berbernica corpus:** the rubric was built for English long-form B2B content. It triggers on ASCII regex patterns ("X is …", "$1,200", "Stanford", "we surveyed N"). Serbian (sr-Cyrl + sr-Latn) text on a small-business homepage will systematically under-score on dimensions 1 (no English copulas), 4 (no statistics in marketing copy), and 5 (no first-party research). Treat absolute scores as a **floor**; the relative ranking and the structural findings are still valid signal.

---

## Per-page scores

| Route | Overall | AnswerQual /30 | SelfContain /25 | Structural /20 | StatDensity /15 | Uniqueness /10 | Blocks | Verdict |
|---|---|---|---|---|---|---|---|---|
| `/` | **26.2 / 100** | avg ≈ 2.5 | avg ≈ 19.5 | avg ≈ 3.75 | avg ≈ 0.5 | 0 | 4 | **F** (3 of 4 blocks) + **D** (1) — homepage cannot be cited as-is |
| `/zakazivanje` | **0.0 / 100** | n/a | n/a | n/a | n/a | n/a | **0** | **No analyzable content blocks** — page is pure UI chrome (calendar widget, form). Scorer extracted zero ≥20-word `<p>`/`<ul>`/`<ol>` blocks. |
| `/shop` | **24.0 / 100** | 8 | 14 | 2 | 0 | 0 | 1 | **F** — single 30-word block ("Stil i kod kuće") well below GEO sweet spot |

**Average across pages with content:** (26.2 + 24.0) / 2 = **25.1 / 100**.
**Average across all 3 pages (treating /zakazivanje as 0):** **16.7 / 100**.
**Total passages flagged below 60:** **5 of 5 measurable blocks** (4 on `/`, 1 on `/shop`). 100% rewrite priority.

---

## Findings

### Homepage (/) — 26.2/100, 4 blocks, all below 60

The homepage exposes 4 content blocks to the scorer, but the dual-script SSR pattern (sr-Cyrl text immediately followed by sr-Latn text inside the same DOM node) inflates word counts and merges headings — e.g. heading text is parsed as `"Тvoj izgled,naša pravila.Tvoj izgled,naša pravila."`. Every block scores **F or D**.

#### Block 1 — "Mesto gde se rezpretvara u priču / Mesto gde se rezpretvara u priču" (hero) — 21/100, 39 words

**Quoted opening (preview):**
> "Берберница Триша — традиционална мушка берберница у Батајници. Шишање, брада, добра прича. Без журбе, без комплекса. Само оно што треба. Berbernica Triša — tradicionalna muška berbernica u Batajnici. Šišanje, brada, dobra…"

**Scoring:** AnswerQual 2/30, SelfContain 17/25, Structural 2/20, StatDensity 0/15, Uniqueness 0/10.

**Why it's low:**
- 39 words total (78 if you count both scripts) — well below the 134-167 GEO sweet spot.
- Opens with a definition pattern ("Berbernica Triša — traditional men's barbershop in Batajnica") — **the only block with a real `NAME — definition` pattern**, but the regex misses it because "—" isn't English copula and Cyrillic words don't match `\b\w+\s+is\s+…`.
- Zero hours, zero address, zero phone, zero year-founded. AI cannot answer "where is it / when does it open / what does it cost" from this passage.

**Rewrite direction (Phase B.8):** expand to a single self-contained 134-167-word "About Berbernica Triša" answer block. Include: full address (Bataјnica neighborhood + street), opening hours weekday/weekend, founding year (2025), price floor (RSD), and one sentence positioning vs typical Belgrade barbershop.

---

#### Block 2 — "Tvoj izgled, naša pravila / Tvoj izgled, naša pravila" — 41/100, 155 words **(only D-grade block on the site)**

**Quoted opening (preview):**
> "Заборави на чекање у редовима и листање старих новина. Основани 2025. године, спојили смо петогодишњи 'гринд' у берберској столици са технологијом која поштује твоје време. Код нас нема филозофирања: фокус…"

**Scoring:** AnswerQual 5/30, SelfContain **25/25 (max)**, Structural 9/20, StatDensity 2/15, Uniqueness 0/10.

**Why it's the strongest:** word count 155 lands inside the 134-167 sweet spot **(exactly the optimum)**, has a year reference ("2025"), low pronoun density, and several proper-noun-like capitalizations.

**Why it still fails (41/D):** the AnswerQual score is only 5/30 because the passage doesn't open with a "What is …" sentence and has no question-style heading. No statistic beyond a single year. No expert attribution. No case study.

**Rewrite direction (Phase B.8):** keep the 155-word length but rewrite to open answer-first ("Berbernica Triša is a men's barbershop in Batajnica, founded 2025, that combines five years of barbering experience with online booking. A standard cut takes 30 minutes and costs from XXX RSD.") — preserves the artisan tone in supporting sentences while front-loading the AI-extractable facts.

---

#### Block 3 — "Šta radimo / Šta radimo" (services) — 16/100, 44 words **(LOWEST on site)**

**Quoted opening (preview):**
> "ПЛАЋА СЕ ГОТОВИНОМ ИЛИ КАРТИЦОМ · БЕЗ ДОПЛАТА · БЕЗ 'СЕРВИСНИХ НАКНАДА' PLAĆA SE GOTOVINOM ILI KARTICOM · BEZ DOPLATA · BEZ 'SERVISNIH NAKNADA' * Цене су оквирне · потврди…"

**Scoring:** AnswerQual **0/30**, SelfContain 14/25, Structural 2/20, StatDensity 0/15, Uniqueness 0/10.

**Why it's worst:** the section is **all-caps payment policy footnotes**, not service descriptions. The actual services (cut, beard, shave, prices) are rendered as cards/grid items that the scorer treats as separate <5-word fragments below the inclusion threshold — so they don't even reach the scorer. What got captured is bullet-point chrome.

**Rewrite direction (Phase B.8):** replace this block on the page with a true services description paragraph **and** a `<table>` of service-name / duration / price (the rubric explicitly rewards tables under structural readability). Move the "cash/card · no fees" disclaimer to a footer microcopy zone where it stops contaminating the citable content area.

---

#### Block 4 — "Šta kažu mušterije / Šta kažu mušterije" (testimonials) — 27/100, 100 words

**Quoted opening (preview):**
> "Најбоље шишање у Батајници. Триша увек стигне на време, никад не журим, и излазим срећан. Цена ок, атмосфера супер. Najbolje šišanje u Batajnici. Triša uvek stigne na vreme, nikad ne…"

**Scoring:** AnswerQual 3/30, SelfContain 22/25, Structural 2/20, StatDensity 0/15, Uniqueness 0/10.

**Why it's low:** testimonials are concatenated into one running blob. AI can't extract individual reviews because there's no `<blockquote>` boundary, no reviewer-name attribution, and no star/rating signal. Also no `Review`/`AggregateRating` JSON-LD anywhere on the page (per Phase A.1).

**Rewrite direction (Phase B.8 + B.5/B.6):** wrap each testimonial in `<blockquote>` with a `<cite>` for the reviewer name, and add `Review` JSON-LD per testimonial plus `AggregateRating` on the `LocalBusiness` schema (Phase B.5). This is the highest-leverage citability fix on the site because reviews are exactly what local-search AIs (Gemini, Perplexity) cite when answering "best barbershop in Batajnica."

---

### Booking (/zakazivanje) — 0.0/100, **zero analyzable blocks**

The page renders fully (Phase A.1 confirmed SSR) but consists entirely of:
- a date/time picker widget (likely `<button>`/`<div>` interactive elements),
- a service-selection grid,
- form inputs.

The scorer's filter requires `<p>`, `<ul>`, `<ol>`, `<table>`, or `<h*>` content with ≥20 words per block (`citability_scorer.py:279`). The booking page has **zero** such blocks. This is the expected pattern for transactional pages and is not a blocker — booking pages are not citation targets in the GEO sense, they are conversion targets.

**However**, AI citability for a booking page is **still relevant** indirectly: an AI answering "how do I book at Berbernica Triša?" wants 1-2 sentences describing the booking flow + cancellation policy. Currently the page exposes neither.

**Rewrite direction (Phase B.8):** add a single 80-150-word intro paragraph above the calendar — "Booking at Berbernica Triša: select a service (XX-XX RSD), pick a 30-min slot, confirm by SMS. Same-day cancellation up to 2 hours before. No deposit required." This single passage would lift the page from 0 to ~50/100.

**Also consider (Phase B.5):** add `Reservation` schema (schema.org/ReservationPackage) or at least a `Service` block listing each bookable service with `offers` price.

---

### Shop (/shop) — 24.0/100, 1 block

#### Single block — "Stil i kod kuće" — 24/100, 30 words

**Quoted opening (preview):**
> "Препарати за негу косе, коже и браде. Само лично преузимање у салону — без доставе. Preparati za negu kose, kože i brade. Samo lično preuzimanje u salonu — bez dostave."

**Scoring:** AnswerQual 8/30, SelfContain 14/25, Structural 2/20, StatDensity 0/15, Uniqueness 0/10.

**Why it's low:** 30 words total (15 per script). Defines what the shop is, but missing: brand names of products carried, price ranges, opening hours for in-store pickup, return/exchange policy, whether products are visible to non-customers. The product cards themselves are rendered as `<a>`/grid items that the scorer skips (under 5 words each fragment).

**Rewrite direction (Phase B.8):** replace the 30-word intro with a 120-160-word shop description: brands carried (e.g. "Reuzel, Layrite, Triumph & Disaster — all original imports"), typical price range (RSD XXX-YYY), pickup hours, plus a sentence on why in-store-only ("we want you to smell and feel the products before buying — not because we can't ship"). Then add a `<table>` of top 5 product categories × price range.

**Also (Phase B.5):** add `Product` JSON-LD per PDP (out of scope for this audit pass) and `OfferCatalog` on the shop index page.

---

## Cross-cutting findings

1. **Dual-script duplication confound — major.** The site renders `sr-Cyrl` and `sr-Latn` as siblings in the same DOM node, so the scorer sees `"Berbernica Triša — Берберница Триша — …"`-style merged text. Effects:
   - **Word counts are inflated ~2×.** The 155-word "Tvoj izgled" block is really ~78 words per script. After Phase B canonicalizes one script per page (with `hreflang` siblings), word counts will halve and **block 2 will likely drop below the 134-167 GEO sweet spot**, costing the site its only D-grade block.
   - **Pronoun density is artificially deflated** (denominator doubled), bumping `self_containment` upward.
   - **Definition patterns and proper nouns are double-counted**, slightly inflating those sub-scores.
   - **Net effect:** current scores are likely **5-10 points optimistic** on `/` and `/shop`. Post-canonicalization scores may be even lower than the 26.2 / 24.0 measured here. The structural findings (no JSON-LD, no statistics, no Q&A, no tables) are unchanged regardless of canonicalization.

2. **Shared metadata is invisible to the scorer but flagged by Phase A.1.** All three pages share the root layout's `<title>Берберница Триша · Батајница</title>` and meta description. The scorer ignores `<meta>` (only main content), but search engines and AI overview engines deduplicate on (title, description), so the homepage and booking page may collapse into one citation candidate in practice.

3. **Zero structured-data subscore on every page.** Phase A.1 confirmed no JSON-LD anywhere. The citability scorer does not measure JSON-LD directly (it scores prose), but JSON-LD is *the* mechanism by which AI overview engines extract entity-level facts (address, hours, prices). Adding it does not move *this* scorer's number — but it moves real-world citation rates substantially. **This is the biggest gap the citability scorer cannot see.**

4. **Booking page is unscoreable, by design.** Treat `/zakazivanje` as out-of-scope for prose citability and in-scope for `Reservation`-style schema + a single 80-150-word intro paragraph. Don't try to push it above 50/100 by stuffing prose; that hurts conversion.

5. **The rubric is English-biased.** The Serbian text in the homepage block 1 ("Berbernica Triša — tradicionalna muška berbernica u Batajnici") is structurally a perfect definition opener and should rate high on `answer_block_quality`. The regex `\b\w+\s+is\s+(?:a|an|the)\s` doesn't match Serbian. Real-world AI overview engines (Gemini, Perplexity) handle Serbian fine — so the *measured* AnswerQual scores are pessimistic. The Phase B.8 rewrite should still be done because the **structural** improvements (front-loaded facts, addresses, hours, prices) help in any language.

---

## Phase B handoff — which step fixes what

Grouping every flagged passage by the Phase B step (workflow §5 steps 5-9) that owns the fix:

### Phase B.5 (LocalBusiness JSON-LD) — biggest leverage for AI citation rates in practice
Even though it doesn't move *this scorer's* number, this is **the single highest-impact fix for actual AI citation** because Gemini/Perplexity local-AI overviews extract structured business facts directly from JSON-LD and ignore prose for those facts.
- Add `LocalBusiness` (or `HairSalon`/`HealthAndBeautyBusiness`) schema with: `name`, `address`, `geo` lat/lng, `telephone`, `openingHoursSpecification`, `priceRange`, `image`, `url`. **One emit on root layout, applies to all three pages.**
- Add `AggregateRating` populated from the testimonials block on `/`.

### Phase B.6 (FAQPage JSON-LD on /) — fixes homepage Q&A pattern subscore
Currently zero question-headed blocks on `/`. Add a small FAQ section with 4-6 Q&A pairs ("Where is Berbernica Triša?", "How long does a haircut take?", "Do I need to book ahead?", "What payment methods do you accept?"). Wrap in `FAQPage` JSON-LD.
- Lifts homepage `answer_block_quality` from avg 2.5 → ~12+ (question headings + answer-first prose).
- Adds 4-6 new high-citability blocks at ~60-80 words each.

### Phase B.7 (per-route metadata) — addresses shared-title/description bug from Phase A.1
- `/` → "Berbernica Triša · Muška berbernica Batajnica · Šišanje, brada od XXX RSD"
- `/zakazivanje` → "Online zakazivanje · Berbernica Triša · Batajnica"
- `/shop` → "Šop · Berbernica Triša · Reuzel, Layrite, brijaći pribor"
- Doesn't move citability score directly, but stops the three pages from collapsing into one citation candidate at the SERP/AI-overview layer.

### Phase B.8 (geo-content-optimizer rewrite) — direct lever for every block <60
**Five passages flagged for rewrite, in priority order:**

| Priority | Page | Block | Current | Target | Rewrite focus |
|---|---|---|---|---|---|
| **P1** | `/` | "Mesto gde se rez-pretvara u priču" (hero) | 21/100 | 65+ | Expand to 134-167-word "About Berbernica Triša" with address, hours, founding year, price floor |
| **P2** | `/` | "Šta radimo" (services) | 16/100 | 60+ | Replace payment-disclaimer copy with services description **paragraph + price `<table>`** |
| **P3** | `/` | "Šta kažu mušterije" (testimonials) | 27/100 | 60+ | Per-quote `<blockquote>`+`<cite>`, integrate with Phase B.5 `Review` schema |
| **P4** | `/shop` | "Stil i kod kuće" intro | 24/100 | 60+ | 120-160-word shop description, brands, price range, pickup hours, optional product-category table |
| **P5** | `/zakazivanje` | (no block — add one) | 0/100 | 50+ | New 80-150-word booking-flow intro paragraph above the calendar widget |

### Phase B.9 (validation rerun) — re-score after Phase B.5-B.8 to verify
Target: average overall score across 3 pages from current **16.7 → 60+**, with no block below 50, and at least 2 blocks landing in the 134-167-word GEO sweet spot post-canonicalization.

---

## Raw JSON outputs

<details>
<summary>Click to expand raw JSON outputs</summary>

### `/tmp/citability_home.json`

```json
{
  "url": "http://localhost:3050/",
  "total_blocks_analyzed": 4,
  "average_citability_score": 26.2,
  "optimal_length_passages": 1,
  "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 1, "F": 3},
  "all_blocks": [
    {
      "heading": "Mesto gde se rezpretvara u priču / Mesto gde se rezpretvara u priču",
      "word_count": 39,
      "total_score": 21,
      "grade": "F",
      "label": "Poor Citability",
      "breakdown": {"answer_block_quality": 2, "self_containment": 17, "structural_readability": 2, "statistical_density": 0, "uniqueness_signals": 0},
      "preview": "Berbernica Triša — tradicionalna muška berbernica u Batajnici. Šišanje, brada, dobra priča. Bez žurbe, bez kompleksa. Samo ono što treba. (+ sr-Cyrl duplicate)"
    },
    {
      "heading": "Tvoj izgled, naša pravila / Tvoj izgled, naša pravila",
      "word_count": 155,
      "total_score": 41,
      "grade": "D",
      "label": "Low Citability",
      "breakdown": {"answer_block_quality": 5, "self_containment": 25, "structural_readability": 9, "statistical_density": 2, "uniqueness_signals": 0},
      "preview": "Zaboravi na čekanje u redovima i listanje starih novina. Osnovani 2025. godine, spojili smo petogodišnji 'grind' u berberskoj stolici sa tehnologijom… (+ sr-Cyrl duplicate)"
    },
    {
      "heading": "Šta radimo / Šta radimo",
      "word_count": 44,
      "total_score": 16,
      "grade": "F",
      "label": "Poor Citability",
      "breakdown": {"answer_block_quality": 0, "self_containment": 14, "structural_readability": 2, "statistical_density": 0, "uniqueness_signals": 0},
      "preview": "PLAĆA SE GOTOVINOM ILI KARTICOM · BEZ DOPLATA · BEZ 'SERVISNIH NAKNADA' * Cene su okvirne · potvrdi… (+ sr-Cyrl duplicate)"
    },
    {
      "heading": "Šta kažu mušterije / Šta kažu mušterije",
      "word_count": 100,
      "total_score": 27,
      "grade": "F",
      "label": "Poor Citability",
      "breakdown": {"answer_block_quality": 3, "self_containment": 22, "structural_readability": 2, "statistical_density": 0, "uniqueness_signals": 0},
      "preview": "Najbolje šišanje u Batajnici. Triša uvek stigne na vreme, nikad ne žurim, i izlazim srećan. Cena ok, atmosfera super. (+ sr-Cyrl duplicate)"
    }
  ]
}
```

### `/tmp/citability_book.json`

```json
{
  "url": "http://localhost:3050/zakazivanje",
  "total_blocks_analyzed": 0,
  "average_citability_score": 0,
  "optimal_length_passages": 0,
  "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
  "top_5_citable": [],
  "bottom_5_citable": [],
  "all_blocks": []
}
```

(Page renders SSR, but contains zero `<p>`/`<ul>`/`<ol>`/`<table>` blocks of ≥20 words. Pure UI: calendar widget + service grid + form inputs.)

### `/tmp/citability_shop.json`

```json
{
  "url": "http://localhost:3050/shop",
  "total_blocks_analyzed": 1,
  "average_citability_score": 24.0,
  "optimal_length_passages": 0,
  "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 1},
  "all_blocks": [
    {
      "heading": "Stil i kod kuće",
      "word_count": 30,
      "total_score": 24,
      "grade": "F",
      "label": "Poor Citability",
      "breakdown": {"answer_block_quality": 8, "self_containment": 14, "structural_readability": 2, "statistical_density": 0, "uniqueness_signals": 0},
      "preview": "Preparati za negu kose, kože i brade. Samo lično preuzimanje u salonu — bez dostave. (+ sr-Cyrl duplicate)"
    }
  ]
}
```

</details>

---

**Status:** Phase A.3 complete. Ready for Phase A.4 / Phase B.
