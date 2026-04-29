import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cormorant_Garamond, Playfair_Display, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/legacy.css";

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
  title: "Берберница Триша · Батајница",
  description: "Твоје место за стил, традицију и добру причу.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050"),
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
      <body>{children}</body>
    </html>
  );
}
