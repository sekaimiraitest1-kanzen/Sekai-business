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
};

export default nextConfig;
