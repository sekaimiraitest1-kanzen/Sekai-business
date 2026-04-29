/** @type {import('next').NextConfig} */
const nextConfig = {
  // Legacy HTML prototypes still served as static fallbacks for routes
  // that haven't been ported to React yet. Each route below will be
  // removed as its React version ships.
  // /              → ported to React (see src/app/page.tsx)
  // /zakazivanje   → still legacy
  // /shop          → still legacy
  // /admin         → still legacy
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/zakazivanje", destination: "/legacy/booking.html" },
        { source: "/shop",        destination: "/legacy/shop.html" },
        { source: "/admin",       destination: "/legacy/admin.html" },
      ],
    };
  },
};

export default nextConfig;
