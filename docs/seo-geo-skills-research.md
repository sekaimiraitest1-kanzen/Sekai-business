# SEO / GEO / AI-SEO Claude Code Skills — Research Report

**Date:** 2026-04-29
**Researcher:** Deep Research Agent (Opus 4.7, 1M ctx)
**Target project:** Trisha (Berbernica) — barbershop PWA, Next.js 14, Supabase, sr-Cyrl + sr-Latn
**Goal:** pick best skill set for production SEO including local/GEO + AI-SEO

---

## TL;DR Recommendation

**Install BOTH (combination):**

1. **`zubair-trabzada/geo-seo-claude`** — primary AI-SEO + GEO + local-business engine. Has runnable Python (citability scorer, brand scanner, llms.txt generator), 5 subagents, 15 skills, ready-to-edit LocalBusiness JSON-LD with `aggregateRating` + `openingHoursSpecification` + `areaServed` (perfect fit for a barbershop). MIT licensed. 6.9k stars.
2. **`aaron-he-zhu/seo-geo-claude-skills`** — secondary: classic SEO depth (Core Web Vitals, hreflang, technical-seo-checker, llm-crawler-handling matrix is the best reference for robots.txt AI bot policy that exists today). Apache-2.0. 1.4k stars. Use it for the technical SEO audit pass, then hand off to geo-seo-claude for AI/GEO polish.

**Skip `resciencelab/opc-skills`** for SEO purposes. Its `seo-geo` is a single SKILL.md tied to paid DataForSEO API. Decent reference material but redundant with the two picks. The rest of the repo (banner-creator, logo-creator, twitter, reddit, producthunt, nanobanana) is solopreneur growth tooling, not SEO. If you ever want logo/banner help for the barbershop, `opc-skills` has those — but install only those specific skills, not the SEO one.

**Do NOT use the install scripts.** Both candidate repos ship `install.sh` with curl-pipe banners and venv-creation logic. We'll clone + cherry-pick instead (commands below).

---

## 1. Side-by-side Comparison

### Repo metadata

| Field | geo-seo-claude (zubair) | seo-geo-claude-skills (aaron) | opc-skills (resciencelab) |
|---|---|---|---|
| **Stars** | **6,903** | 1,412 | 824 |
| **License** | **MIT** (clean, no viral clauses) | Apache-2.0 (clean, attribution only) | Apache-2.0 (clean) |
| **Last push** | 2026-04-29 (today) | 2026-04-28 | 2026-04-29 |
| **First commit** | 2026-02-18 | 2025-12-18 | 2026-01-17 |
| **Repo size** | 162 KB | 1.17 MB | 14 MB (assets/website) |
| **Default branch** | main | main | main |
| **Archived** | No | No | No |

All three are actively maintained. Aaron's repo is the most mature project (4 mo old, v9.9.5, formal CONTRIBUTING/SECURITY/CITATION docs). Zubair's is younger but has the most stars by a wide margin and a clear product focus.

### What's actually shipped (artifact inventory)

| Artifact type | zubair | aaron | opc |
|---|---|---|---|
| Markdown skills (SKILL.md) | **15** | **20** | 1 (seo-geo) + 8 unrelated |
| Subagents (`agents/`) | **5** | 0 | 0 |
| Slash commands (`commands/`) | 0 | **17** | 0 |
| Runnable Python scripts | **6** (audit, scorer, brand, fetch, pdf, llms.txt) | 0 | 9 (DataForSEO wrappers — paid API) |
| JSON-LD schema templates (ready files) | **6** (article, local-business, org, product, saas, website) | embedded in markdown only | embedded in markdown only |
| MCP server config (`.mcp.json`) | No | **Yes** (14 MCP servers wired: ahrefs, semrush, sistrix, similarweb, cloudflare, vercel, hubspot, amplitude, notion, webflow, sanity, contentful, slack — see security note) | No |
| Hooks (`hooks/hooks.json`) | No | **Yes** (5 SessionStart hooks, 2 PostToolUse hooks, 1 Stop hook — see security note) | No (a different `.factory/hooks.json` only loads memory) |
| Install script | install.sh + install-win.sh + uninstall.sh | None at top level (uses plugin marketplace) | None |

### Coverage scoring (1 = absent / 5 = excellent)

| Area | zubair | aaron | opc |
|---|:-:|:-:|:-:|
| **Classic SEO** — meta, sitemap, robots, canonical | 4 | **5** | 3 |
| **Schema.org breadth** | **5** (6 ready JSON files inc. LocalBusiness) | **5** (full templates incl. LocalBusiness, hreflang, FAQPage) | 3 |
| **Core Web Vitals / technical SEO** | 3 | **5** (dedicated technical-seo-checker w/ ecommerce + pre-migration playbooks) | 3 |
| **hreflang / multi-language** (relevant for sr-Cyrl + sr-Latn) | 3 | **5** (explicit hreflang section + i18n category in audit template) | 2 |
| **Local SEO** — NAP, GBP, areaServed, opening hours | **5** (LocalBusiness JSON has openingHoursSpecification + areaServed + aggregateRating + sameAs to Yelp/BBB/FB/LinkedIn out of the box) | 4 (templated but generic) | 2 |
| **Reviews / aggregateRating** | **5** (explicit review fragment) | 4 | 2 |
| **AI-SEO general (LLM citability, GEO score)** | **5** (citability_scorer.py rates 0-100 across 5 dimensions; ai-citability skill) | 4 (geo-content-optimizer + ai-overview-recovery playbook) | 3 (Princeton GEO methods reference is good) |
| **llms.txt** (AI crawler hints) | **5** (geo-llmstxt SKILL + llmstxt_generator.py crawl-and-build) | 3 (mentioned, no generator) | 2 (mentioned in checklist) |
| **AI bot crawler accommodation** (GPTBot, PerplexityBot, ClaudeBot, OAI-SearchBot, Google-Extended) | 4 (geo-crawlers skill) | **5** (`llm-crawler-handling.md` — *the* best reference of the three: full bot matrix, default-open/default-closed/split policy modes, Cloudflare edge gotcha, EU AI Act notes) | 3 |
| **Platform-specific AI optimization** (AIO vs ChatGPT vs Perplexity vs Gemini) | **5** (geo-platform-optimizer with per-platform rubrics + scoring) | 4 (geo-content-optimizer w/ AI-overview-recovery) | 3 |
| **Content quality / E-E-A-T** | 3 | **5** (CORE-EEAT 80-item benchmark + CITE 40-item domain rating — published as separate repos and referenced) | 3 |
| **Brand entity / Wikipedia / Wikidata** | **5** (brand_scanner.py + entity-recognition built into platform-optimizer) | 4 (entity-optimizer cross-cutting skill) | 2 |
| **PDF reports for clients** | **5** (generate_pdf_report.py — actually produces deliverable for end clients) | 0 | 0 |
| **Rank tracking / monitoring** | 0 | **5** (rank-tracker, performance-reporter, alert-manager, backlink-analyzer) | 1 |
| **Keyword research** | 2 | **5** (keyword-research SKILL with intent taxonomy, prioritization framework, topic clusters) | 3 (DataForSEO wrappers — paid only) |
| **Production-ready code output** | **5** (skills produce real fix patches + JSON-LD; scorers run locally w/ no paid API) | 4 (skills produce structured plans + JSON-LD; reads more like consultant deliverables) | 2 (skills mostly invoke paid APIs; without DataForSEO creds you get advice only) |
| **Prompt clarity (do skills produce running code or just advice?)** | **5** | 4 | 3 |

### Security / safety

| Concern | zubair | aaron | opc |
|---|:-:|:-:|:-:|
| `curl \| bash` install pattern | install.sh **detects** curl-pipe; supports it but does not require it. Repo README's "one-liner" is a curl pipe **— do not use it.** Clone instead. | None at repo root. The README's `/plugin marketplace add aaron-he-zhu/seo-geo-claude-skills` uses Claude Code's built-in marketplace mechanism (still loads `.mcp.json` + hooks though — see below). | None — pure git clone. |
| Telemetry / phone home | None found in scripts (citability_scorer.py, brand_scanner.py, fetch_page.py — only WebFetch + local file I/O) | None in skill markdown. **BUT** `.mcp.json` auto-registers 14 third-party HTTP MCP servers if Claude Code loads it as a project plugin. Each is a separate trust decision. | None |
| Bundled MCP servers | 0 | **14** (ahrefs, semrush, se-ranking, sistrix, similarweb, cloudflare, vercel, hubspot, amplitude, notion, webflow, sanity, contentful, slack) | 0 |
| Bundled hooks (SessionStart / UserPromptSubmit / PostToolUse / Stop) | 0 | **8 hooks** that read/write `memory/` files, may show prompts on every prompt-submit, and intercept Write/Edit ops. Mostly benign (prompt-only, no code exec) but **noisy** and assume a `memory/` directory layout that you may not want. | 1 (load-memory.py for `archive` skill — innocuous, can be skipped by not installing that skill) |
| Python deps requirement | requirements.txt: beautifulsoup4, requests, lxml, playwright, Pillow, urllib3, validators, reportlab, flask, rich. **All mainstream, all pinned with upper bounds.** | None (zero-dep markdown). | requests + base64 only (DataForSEO uses urllib stdlib, no extra deps). |
| Auto-execute scripts | install.sh / install-win.sh — **do not run; cherry-pick instead**. | None | None |
| AGPL/GPL viral risk to client code | None (MIT) | None (Apache-2.0) | None (Apache-2.0) |
| Credentials handling | brand_scanner reads no creds, scorer reads no creds. Only PDF/webapp side. **Clean.** | DataForSEO not bundled (you'd configure it via MCP if at all). Clean as long as MCPs not auto-loaded. | **Hard-codes** `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` env-var pattern. Skill is *unusable* without paid DataForSEO subscription. |
| Red flags | Marketing-y README mentions "skool community" upsell. Not a code issue but the author monetizes the skill as a sellable service. | Heavy memory-management hooks that scaffold `memory/` directories and remind you about open loops. Very opinionated, may collide with your existing project structure. | "OPC = solopreneurs" repo — most skills are off-topic for SEO. The seo-geo one is shallow vs the dedicated repos. |

### Quality of skill prompts (qualitative)

- **zubair / geo-seo-claude:** prompts are operational and actionable. Each skill has a clear Phase/Step structure, `allowed-tools` whitelist, scoring rubrics with point assignments, and explicit "use fetch_page.py because WebFetch strips JSON-LD" technical notes. The geo-platform-optimizer skill is particularly good — per-platform (AIO, ChatGPT, Perplexity, Gemini, Bing Copilot) optimization checklists with citation-source breakdowns (e.g. "Wikipedia 47.9% on ChatGPT, Reddit 46.7% on Perplexity"). Skills produce concrete artifacts (JSON-LD blocks, scored reports, PDFs).

- **aaron / seo-geo-claude-skills:** prompts are dense, structured around a "Skill Contract" / "Handoff Summary" / "Next Best Skill" workflow. Each skill cross-references other skills and writes to `memory/hot-cache.md`, `memory/decisions.md`, etc. Good for sustained agent-driven SEO work; **overkill for a one-shot audit of a barbershop site**. The `llm-crawler-handling.md` reference is the best single document on AI crawler policy I've seen anywhere — copy that into your repo even if you don't install the rest.

- **opc / opc-skills:** the seo-geo SKILL.md is solid as a quick reference (Princeton 9 GEO methods table is well-formatted and cited). But it leans heavily on bash commands like `curl ... | grep` for inspection rather than first-class WebFetch / structured output. Without DataForSEO creds, half the skill is dead weight.

---

## 2. Recommendation with one-line rationale

| Pick | Why |
|---|---|
| **PRIMARY: `zubair-trabzada/geo-seo-claude`** | Best LocalBusiness JSON-LD (already has openingHoursSpecification, areaServed, aggregateRating — exactly what a barbershop needs), runnable citability scorer, llms.txt generator, MIT, no MCP/hook bloat. |
| **SECONDARY: `aaron-he-zhu/seo-geo-claude-skills`** (selective install — see §4) | Best classic-SEO depth: technical-seo-checker, hreflang reference, llm-crawler-handling matrix, keyword-research, on-page-seo-auditor. Use these 5–6 skills only; skip the memory-management/auditor-runbook layer. |
| **SKIP: `resciencelab/opc-skills`** | Redundant for SEO and the seo-geo skill is paywalled behind DataForSEO. The non-SEO skills (logo-creator, banner-creator) are decent but unrelated to your task. |

---

## 3. Concrete install commands (no auto-install scripts)

```bash
# ============================================================
# Step 1 — clone both repos to a workspace (NOT directly into ~/.claude/skills)
# ============================================================
mkdir -p ~/.claude/seo-skills-workspace
cd ~/.claude/seo-skills-workspace

git clone https://github.com/zubair-trabzada/geo-seo-claude.git
git clone https://github.com/aaron-he-zhu/seo-geo-claude-skills.git

# ============================================================
# Step 2 — install zubair (PRIMARY) skills + agents
# Cherry-pick from skills/ and agents/ — DO NOT run install.sh
# ============================================================
mkdir -p ~/.claude/skills/geo-seo
cp -r ~/.claude/seo-skills-workspace/geo-seo-claude/skills/* ~/.claude/skills/geo-seo/
cp -r ~/.claude/seo-skills-workspace/geo-seo-claude/agents/* ~/.claude/agents/
cp -r ~/.claude/seo-skills-workspace/geo-seo-claude/schema ~/.claude/skills/geo-seo/
cp -r ~/.claude/seo-skills-workspace/geo-seo-claude/scripts ~/.claude/skills/geo-seo/

# Set up the Python venv for the runnable scripts (citability, llms.txt, brand_scanner, fetch_page)
python3 -m venv ~/.claude/skills/geo-seo/.venv
~/.claude/skills/geo-seo/.venv/bin/pip install -r ~/.claude/seo-skills-workspace/geo-seo-claude/requirements.txt

# Patch the SKILL.md venv path references (the install.sh does this via sed; we replicate manually)
# All skills reference ~/.claude/skills/geo/.venv/bin/python3 — but we installed to geo-seo/, so:
find ~/.claude/skills/geo-seo -name 'SKILL.md' -exec \
  sed -i 's|~/.claude/skills/geo/.venv|~/.claude/skills/geo-seo/.venv|g' {} \;
find ~/.claude/agents -name 'geo-*.md' -exec \
  sed -i 's|~/.claude/skills/geo/.venv|~/.claude/skills/geo-seo/.venv|g' {} \;

# ============================================================
# Step 3 — install aaron (SECONDARY) — skills ONLY, no MCP, no hooks
# ============================================================
mkdir -p ~/.claude/skills/aaron-seo
# Pick exactly the 6 skills we want (see §4 for what to skip)
cp -r ~/.claude/seo-skills-workspace/seo-geo-claude-skills/optimize/technical-seo-checker         ~/.claude/skills/aaron-seo/
cp -r ~/.claude/seo-skills-workspace/seo-geo-claude-skills/optimize/on-page-seo-auditor           ~/.claude/skills/aaron-seo/
cp -r ~/.claude/seo-skills-workspace/seo-geo-claude-skills/research/keyword-research              ~/.claude/skills/aaron-seo/
cp -r ~/.claude/seo-skills-workspace/seo-geo-claude-skills/build/schema-markup-generator          ~/.claude/skills/aaron-seo/
cp -r ~/.claude/seo-skills-workspace/seo-geo-claude-skills/build/meta-tags-optimizer              ~/.claude/skills/aaron-seo/
cp -r ~/.claude/seo-skills-workspace/seo-geo-claude-skills/build/geo-content-optimizer            ~/.claude/skills/aaron-seo/

# Save the LLM crawler reference next to robots.txt for permanent reference (it's that good)
mkdir -p ~/Projects/Luka_Projects/LukaPr_Trisha/Berbernica/docs/seo
cp ~/.claude/seo-skills-workspace/seo-geo-claude-skills/optimize/technical-seo-checker/references/llm-crawler-handling.md \
   ~/Projects/Luka_Projects/LukaPr_Trisha/Berbernica/docs/seo/llm-crawler-handling-reference.md

# ============================================================
# Step 4 — verify (skills should appear next session start)
# ============================================================
ls ~/.claude/skills/geo-seo/   # expect: geo-audit/, geo-llmstxt/, geo-platform-optimizer/, ...
ls ~/.claude/skills/aaron-seo/ # expect: technical-seo-checker/, on-page-seo-auditor/, ...
ls ~/.claude/agents/ | grep geo # expect: geo-ai-visibility.md, geo-content.md, geo-platform-analysis.md, geo-schema.md, geo-technical.md
```

**Important:** Do NOT copy `aaron`'s `.mcp.json`, `.factory/`, `hooks/`, `commands/`, `memory/`, `references/`, or any of the `cross-cutting/` skills (auditor-runbook, content-quality-auditor, domain-authority-auditor, entity-optimizer, memory-management). Those bring in the heavyweight memory system, eval framework, and MCP servers we don't need for one barbershop. We grabbed only 6 standalone skills.

---

## 4. What NOT to install from the picked repos

### From `zubair-trabzada/geo-seo-claude` — skip

- **`install.sh`, `install-win.sh`, `uninstall.sh`** — opaque venv juggling + sed patching of skill files. We did the manual equivalent above so we know exactly what's on disk.
- **`scripts/webapp/`** (Flask app) — local CRM dashboard for SEO consultants. Irrelevant for a barbershop site, adds Flask attack surface.
- **`scripts/crm_dashboard.py`** — same, "sell GEO audits" tool, not for our site.
- **`scripts/generate_pdf_report.py`** — only useful if you want client-deliverable PDFs. Optional. Keep if disk is cheap.
- **`pr-draft-content-signals.md`, `examples/electron-srl.com-*`** — author's personal client examples. Cosmetic.

### From `aaron-he-zhu/seo-geo-claude-skills` — skip

- **`.mcp.json`** — registers 14 third-party HTTP MCP servers. Each one is a remote service that gets your tool calls. Decide per-MCP if you actually need it (we don't, for a barbershop).
- **`hooks/hooks.json`** — 8 hooks that fire on session start, prompt submit, after every Write/Edit, etc. They reference a `memory/` layout that the repo expects. Will produce noisy output in normal Claude Code sessions if loaded as a plugin. Skip.
- **`commands/` (17 slash commands)** — they all assume the memory/auditor system above. Without those, commands like `/seo:run-evals`, `/seo:contract-lint`, `/seo:wiki-lint`, `/seo:evolve-skill`, `/seo:sync-versions` are no-ops for our use case. Skip.
- **`cross-cutting/content-quality-auditor`, `cross-cutting/domain-authority-auditor`, `cross-cutting/entity-optimizer`, `cross-cutting/memory-management`** — these are the auditor framework. CORE-EEAT (80 items) and CITE (40 items) are smart but designed for sustained content-team workflows on owned media properties. Overkill for a 5-page barbershop PWA.
- **`monitor/rank-tracker`, `monitor/backlink-analyzer`, `monitor/performance-reporter`, `monitor/alert-manager`** — useful when you have rank-tracking budget and an SEO retainer. Not now. Skip until post-launch.
- **`research/competitor-analysis`, `research/serp-analysis`, `research/content-gap-analysis`** — useful for content marketing, not for the launch audit. Skip.
- **`optimize/internal-linking-optimizer`, `optimize/content-refresher`** — optimize-existing-blog-content skills. Skip until the site has more than 5 pages.
- **`build/seo-content-writer`** — for writing new long-form articles. Not the current need.

### From `resciencelab/opc-skills` — entire repo skipped for SEO

- The **`seo-geo`** skill is shallow and DataForSEO-paywalled.
- The other skills (`banner-creator`, `logo-creator`, `nanobanana`, `domain-hunter`, `archive`, `producthunt`, `reddit`, `requesthunt`, `twitter`) are fine standalone tools but unrelated to SEO.

---

## 5. Workflow — how to actually use these on Trisha after install

Run in this order. Each step is one Claude Code session prompt.

### Phase A — baseline audit (read-only, no changes)

1. **Crawler / robots / sitemap baseline**
   *Prompt:* `"Run the technical-seo-checker skill on https://<trisha-staging-url>. Report specifically on robots.txt directives, sitemap presence, hreflang for sr-Cyrl + sr-Latn, and Core Web Vitals. Use the llm-crawler-handling reference at docs/seo/llm-crawler-handling-reference.md for the AI bot policy section."*
   Skill invoked: `aaron-seo/technical-seo-checker`. Output: scored markdown report with prioritized fixes.

2. **GEO platform audit (per AI engine)**
   *Prompt:* `"Run the geo-platform-optimizer skill on https://<trisha-staging-url>. Score Google AIO, ChatGPT, Perplexity, Gemini, and Bing Copilot separately. Focus on the local-business angle — we're a Belgrade barbershop."*
   Skill invoked: `geo-seo/geo-platform-optimizer`. Output: per-platform scorecard 0-100.

3. **Citability score for the homepage hero + service pages**
   *Prompt:* `"Run scripts/citability_scorer.py against the rendered HTML of /, /usluge, /o-nama. Identify content blocks scoring below 60/100 for AI citation."*
   Script invoked: `~/.claude/skills/geo-seo/scripts/citability_scorer.py`. Output: 0-100 scores per passage with concrete edit suggestions.

4. **llms.txt analysis**
   *Prompt:* `"Run the geo-llmstxt skill — first check if /llms.txt exists, if not generate one by crawling the staging URL. Use the standard format from skills/geo-llmstxt/SKILL.md."*
   Skill invoked: `geo-seo/geo-llmstxt` + `scripts/llmstxt_generator.py`. Output: `public/llms.txt` ready to commit.

### Phase B — fixes (write changes)

5. **Generate LocalBusiness JSON-LD for the barbershop**
   *Prompt:* `"Use schema/local-business.json as the template. Fill it with Trisha barbershop data: name, NAP (Belgrade address + phone), opening hours from app/lib/businessHours.ts, services from the price list, sameAs to Instagram/Facebook/Google Maps. Inject it into app/layout.tsx as a JSON-LD script tag inside <head> for the homepage and into the service-detail pages."*
   Template: `~/.claude/skills/geo-seo/schema/local-business.json`. Output: actual code edits in Next.js layout.

6. **Generate FAQPage schema for service pages**
   *Prompt:* `"Use the schema-markup-generator skill to produce FAQPage JSON-LD for /usluge — use the FAQ entries from our copy. Inline as <script type='application/ld+json'> in the page server component."*
   Skill: `aaron-seo/schema-markup-generator`. Output: JSON-LD code block + integration patch.

7. **Meta tags + OpenGraph audit and fix**
   *Prompt:* `"Run meta-tags-optimizer on each route in app/. Verify titles 50-60 chars, descriptions 150-160 chars, og:image 1200x630, Cyrillic + Latin variants where applicable. Patch the metadata exports in each page.tsx."*
   Skill: `aaron-seo/meta-tags-optimizer`. Output: per-route diff.

8. **GEO content rewrite for low-citability passages**
   *Prompt:* `"Take the passages flagged by citability_scorer below 60/100 and run them through geo-content-optimizer. Apply the 9 Princeton GEO methods (cite sources, statistics addition, quotation addition, authoritative tone) but keep the brand voice — barbershop, friendly, local."*
   Skill: `aaron-seo/geo-content-optimizer`. Output: rewritten copy + before/after diff.

9. **AI bot policy in robots.txt**
   *Prompt:* `"Update public/robots.txt using docs/seo/llm-crawler-handling-reference.md, default-open mode (we want AI citation visibility). Allow OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, ClaudeBot, GPTBot, Googlebot, Bingbot. Block CCBot and Google-Extended (we don't want our copy in training datasets)."*
   Reference doc only. Output: updated `public/robots.txt`.

### Phase C — verify (no changes)

10. **Re-run technical-seo-checker** to confirm fixes landed.
11. **Re-run geo-platform-optimizer** to confirm GEO score moved.
12. **Re-run citability_scorer** to confirm rewrites raised scores >60/100.

### Slash-command equivalents (after install)

If you want one-liner triggers, the agents in `~/.claude/agents/` give you these (no slash command, just describe what you want):

- "use the geo-ai-visibility agent on …" → orchestrates citability + platform + content checks
- "use the geo-schema agent on …" → schema audit + generation
- "use the geo-technical agent on …" → technical SEO + Core Web Vitals
- "use the geo-content agent on …" → content rewrite for AI citation
- "use the geo-platform-analysis agent on …" → per-AI-engine optimization

The skills in `~/.claude/skills/geo-seo/` and `~/.claude/skills/aaron-seo/` activate automatically by name match in the SKILL.md `description` field — say e.g. *"audit my llms.txt"* and `geo-llmstxt` will auto-trigger.

---

## 6. Sources & credibility

| URL | Credibility | Note |
|---|---|---|
| https://github.com/zubair-trabzada/geo-seo-claude | High | 6.9k stars, MIT, active. Author monetizes consulting via Skool — note marketing tone but code is clean. |
| https://github.com/aaron-he-zhu/seo-geo-claude-skills | High | 1.4k stars, Apache-2.0, v9.9.5, formal release docs. Most rigorous of the three; over-engineered for our use case. |
| https://github.com/resciencelab/opc-skills | Medium | 824 stars, Apache-2.0. Well-documented, but seo-geo skill is shallow + paid-API-bound. |
| GEO research methodology referenced (Princeton / Georgia Tech / IIT Delhi 2024 paper) | Medium-High | Cited in two of the three repos with consistent claims (+30-115% AI visibility lift). Original paper: arXiv "GEO: Generative Engine Optimization" 2023-11. |
| llms.txt spec (Jeremy Howard, Sept 2024) | High | Emerging convention, reasonable to adopt as early-mover. Format spec from llmstxt.org. |

---

## 7. Open questions / suggested follow-up

- **GBP claim status?** None of these skills can claim/verify your Google Business Profile programmatically. After deploy, manually claim GBP at google.com/business — that's still the #1 local-SEO action and no Claude skill can replace it.
- **Cyrillic + Latin URL strategy.** Decide whether sr-Cyrl is a hreflang-tagged subpath (`/sr-Cyrl/...`) or query param. The hreflang section in aaron's technical-seo-checker assumes subpath/subdomain. If you go query-param, hreflang won't work as cleanly — flag this before generating sitemaps.
- **PWA + SEO interaction.** Service worker can serve stale meta tags / JSON-LD if not invalidated. Verify the SW (still pending per your MEMORY.md "Trisha pending tasks") doesn't cache the `<head>` of HTML responses for >5 minutes. None of the three skills test this; it's a Berbernica-specific concern.
- **Re-run cadence.** After launch, re-run Phase A audits monthly. AI search engines change citation behavior fast — what worked in Apr 2026 will not work in Oct 2026.
- **Optional: install opc-skills' `logo-creator` + `banner-creator`** if you ever need new social-card assets. Cherry-pick those folders separately from `~/.claude/seo-skills-workspace/opc-skills/skills/{logo-creator,banner-creator}` — they're standalone and have no SEO dependencies.

---

## 8. Files referenced (absolute paths)

- Report saved at: `/home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/QA Testing/admin-audit-2026-04-29/seo-geo-skills-research.md`
- Workspace clone target: `/home/kaizenlinux/.claude/seo-skills-workspace/` (after running install commands)
- Final skill install paths: `/home/kaizenlinux/.claude/skills/geo-seo/`, `/home/kaizenlinux/.claude/skills/aaron-seo/`, `/home/kaizenlinux/.claude/agents/geo-*.md`
- LLM crawler reference (post-install): `/home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/Berbernica/docs/seo/llm-crawler-handling-reference.md`

---

**Total budget:** ~470 lines, well under 600.
