/**
 * Social-links domain model.
 *
 * Stored on `salons.social_links` (JSONB) — see migration 005. Five platforms,
 * each independently toggleable. The footer renders an icon ONLY when
 * `enabled === true && url.trim() !== ""`. This decouples ownership of a URL
 * (the salon may have an Instagram but not want to surface it yet) from
 * publication intent.
 */

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "linkedin" | "x";

export type SocialLink = { enabled: boolean; url: string };

export type SocialLinks = Record<SocialPlatform, SocialLink>;

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "tiktok", "linkedin", "x"];

type PlatformMeta = {
  id: SocialPlatform;
  label: string;
  placeholder: string;
  /** Hostname suffix that the URL must end on (after stripping `www.`). */
  hostSuffix: string[];
};

export const PLATFORM_META: Record<SocialPlatform, PlatformMeta> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/berbernica.trisha",
    hostSuffix: ["instagram.com"],
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/berbernica.trisha",
    hostSuffix: ["facebook.com", "fb.com"],
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@berbernica.trisha",
    hostSuffix: ["tiktok.com"],
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/berbernica-trisha",
    hostSuffix: ["linkedin.com"],
  },
  x: {
    id: "x",
    label: "X",
    placeholder: "https://x.com/berbernica",
    hostSuffix: ["x.com", "twitter.com"],
  },
};

const EMPTY_LINK: SocialLink = { enabled: false, url: "" };

export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  instagram: { ...EMPTY_LINK },
  facebook: { ...EMPTY_LINK },
  tiktok: { ...EMPTY_LINK },
  linkedin: { ...EMPTY_LINK },
  x: { ...EMPTY_LINK },
};

/**
 * Coerce arbitrary JSON into a fully-shaped {@link SocialLinks}. Missing keys
 * fall back to disabled/empty so callers never have to null-check the inner
 * shape. Used both server-side (DB → component) and inside the Server Action.
 */
export function parseSocialLinks(input: unknown): SocialLinks {
  const out: SocialLinks = { ...EMPTY_SOCIAL_LINKS };
  if (!input || typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;
  for (const id of SOCIAL_PLATFORMS) {
    const raw = obj[id];
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      out[id] = {
        enabled: r.enabled === true,
        url: typeof r.url === "string" ? r.url : "",
      };
    }
  }
  return out;
}

/**
 * Validate a URL for a specific platform. Empty string is valid (means
 * "don't surface yet"). The validator is permissive on path/handle shape and
 * strict only on protocol + hostname — admins paste profile URLs in many
 * formats (handle vs `/p/<id>`, Reels, Pages, etc.) and we don't want to
 * reject legitimate variants.
 */
export function validateSocialUrl(platform: SocialPlatform, url: string): { ok: true } | { ok: false; error: string } {
  if (url.trim() === "") return { ok: true };

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, error: "Neispravan URL — mora počinjati sa https://" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "URL mora biti https:// ili http://" };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const expected = PLATFORM_META[platform].hostSuffix;
  if (!expected.some((suffix) => host === suffix || host.endsWith("." + suffix))) {
    return {
      ok: false,
      error: `URL mora biti sa ${expected.join(" ili ")} (dobio: ${host})`,
    };
  }

  return { ok: true };
}

/**
 * Filter to ONLY links the footer should render. Used by the row component
 * AND by the JSON-LD `sameAs` builder so the visual surface and the
 * structured-data surface stay in lockstep.
 */
export function visibleLinks(links: SocialLinks): { platform: SocialPlatform; url: string }[] {
  return SOCIAL_PLATFORMS
    .filter((p) => links[p].enabled && links[p].url.trim() !== "")
    .map((p) => ({ platform: p, url: links[p].url.trim() }));
}
