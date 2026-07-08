// Single source of truth for the hardcoded text shown on the public site
// before an admin ever saves a site_content row for that key. The homepage
// falls back to these when the DB row is missing/empty; the admin /admin/sajt
// form pre-fills its inputs with the same text so it never looks blank when
// the site is actually showing something.
export const CONTENT_DEFAULTS: Record<string, { sr: string; lat: string }> = {
  hero_eyebrow: {
    sr: "MEN'S BARBERSHOP · BATAJNICA, BELGRADE",
    lat: "MUŠKA BERBERNICA · BATAJNICA, BEOGRAD",
  },
  hero_title: {
    sr: "Where a haircut|turns into a story",
    lat: "Mesto gde se rez|pretvara u priču",
  },
  hero_subtitle: {
    sr: "Barbershop Vuk — a men's barbershop in Batajnica. Haircuts, beard, good stories. No rush, no fuss. Just what you need.",
    lat: "Barbershop Vuk — muška berbernica u Batajnici. Šišanje, brada, dobra priča. Bez žurbe, bez kompleksa. Samo ono što treba.",
  },
  about_story: {
    sr: "Forget waiting in line and flipping through old magazines. Opened in 2024, we combined honest craft in the barber chair with technology that respects your time. No philosophizing here: the focus is on a sharp fade, precise beard work, and healthy-looking hair.",
    lat: "Tvoje vreme je previše vredno da bi ga trošio na čekanje u salonu. Od 2024. godine spajamo vrhunsku tradiciju stare škole i pametna digitalna rešenja za zakazivanje. Bez suvišnog filozofiranja i komplikovanja – garantujemo ti hirurški precizne konture, brutalan fade i savršeno zdravu kosu.",
  },
};
