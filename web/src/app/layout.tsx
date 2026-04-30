import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cormorant_Garamond, Playfair_Display, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/legacy.css";
import "@/styles/legacy-booking.css";
import "@/styles/legacy-shop.css";
import "@/styles/product-detail.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { CookieNotice } from "@/components/cookie-notice";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Берберница Триша · Батајница",
    template: "%s · Берберница Триша",
  },
  description: "Твоје место за стил, традицију и добру причу. Мушка берберница у Батајници — шишање, брада, бријање. Заказивање онлине.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Триша",
    startupImage: [{ url: "/icons/icon-512.png" }],
  },
  applicationName: "Триша",
  formatDetection: { telephone: false, email: false, address: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    url: "/",
    siteName: "Берберница Триша",
    title: "Берберница Триша · Батајница",
    description: "Мушка берберница у Батајници. Шишање, брада, бријање. Заказивање онлине, без чекања.",
    images: [
      {
        url: "/logo-source.png",
        width: 600,
        height: 600,
        alt: "Берберница Триша — Батајница",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Берберница Триша · Батајница",
    description: "Мушка берберница у Батајници. Шишање, брада, бријање. Заказивање онлине, без чекања.",
    images: ["/logo-source.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#1A0F05",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = cookies().get("lang")?.value === "lat" ? "lat" : "sr";

  return (
    <html
      lang={lang === "sr" ? "sr-Cyrl" : "sr-Latn"}
      data-lang={lang}
      className={`${cormorant.variable} ${playfair.variable} ${oswald.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>
        {children}
        <CookieNotice />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
