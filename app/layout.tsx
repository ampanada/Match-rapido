import type { Metadata } from "next";
import GlobalNotice from "@/components/GlobalNotice";
import ClubTabs from "@/components/ClubTabs";
import RouteFrame from "@/components/RouteFrame";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";
import { getServerLang } from "@/lib/i18n-server";
import "./globals.css";

function resolveMetadataBase() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
      // Fall through to default URL.
    }
  }
  return new URL("https://match-rapido.vercel.app");
}

export const metadata: Metadata = {
  title: "Match Rapido",
  description: "Emparejamiento rapido de tenis para clubes",
  metadataBase: resolveMetadataBase(),
  openGraph: {
    title: "Match Rapido",
    description: "Emparejamiento rapido de tenis para clubes",
    type: "website",
    locale: "es_AR",
    siteName: "Match Rapido",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Match Rapido - tenis para clubes"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Match Rapido",
    description: "Emparejamiento rapido de tenis para clubes",
    images: ["/opengraph-image"]
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();

  return (
    <html lang={lang}>
      <body>
        <ClubTabs lang={lang} />
        <GlobalNotice lang={lang} />
        <RouteTransitionIndicator />
        <RouteFrame>{children}</RouteFrame>
      </body>
    </html>
  );
}
