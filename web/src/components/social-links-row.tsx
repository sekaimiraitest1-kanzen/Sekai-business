import { SocialIcon } from "@/components/social-icons";
import { PLATFORM_META, visibleLinks, type SocialLinks } from "@/lib/social-links";

/**
 * Footer row of social-media icons. Renders nothing when no platform is both
 * enabled and has a non-empty URL — the section header & spacing collapse.
 * Each icon is a simple `<a>` with `target="_blank" rel="noopener"` and an
 * accessible label drawn from the platform metadata.
 */
export function SocialLinksRow({ links }: { links: SocialLinks }) {
  const visible = visibleLinks(links);
  if (visible.length === 0) return null;

  return (
    <div className="footer-social-row">
      <div className="footer-social-label">
        <span data-sr>FOLLOW US</span>
        <span data-lat>PRATI NAS</span>
      </div>
      <div className="footer-social-icons">
        {visible.map(({ platform, url }) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={PLATFORM_META[platform].label}
            className="footer-social-icon"
          >
            <SocialIcon platform={platform} size={44} />
          </a>
        ))}
      </div>
    </div>
  );
}
