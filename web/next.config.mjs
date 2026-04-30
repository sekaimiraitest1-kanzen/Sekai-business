/** @type {import('next').NextConfig} */
const nextConfig = {
  // All public routes are now React-ported. Legacy HTML kept under /legacy/* for visual reference.
  async rewrites() {
    return { beforeFiles: [] };
  },
  // Disable Vercel image optimization — Supabase Storage serves originals (already compressed).
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "ljxovmahbyxgyyttvldv.supabase.co" },
    ],
  },
  // FK-join shape mismatch between Supabase inference and runtime is now handled
  // via local type aliases at page boundaries (musterije/[id], shop/porudzbine).
  // Codegen (`supabase gen types typescript`) deferred to a session with CLI auth;
  // when it lands, replace the manual aliases with generated types.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // SECURITY HEADERS (Phase B.9). HSTS is added automatically by Vercel on
  // production HTTPS, so it's not set here. Content-Security-Policy is
  // intentionally omitted from this first pass — defining a non-breaking CSP
  // requires inventorying inline styles, third-party iframes, and Google Fonts
  // bootstrap; a strict CSP shipped untested will brick the salon. CSP is
  // tracked as a follow-up and should land in report-only mode first.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
