import type { Metadata } from "next";
import GlobalNotice from "@/components/GlobalNotice";
import ClubTabs from "@/components/ClubTabs";
import RouteFrame from "@/components/RouteFrame";
import RouteTransitionIndicator from "@/components/RouteTransitionIndicator";
import { getServerLang } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Match MVP",
  description: "Emparejamiento rapido de tenis para clubes"
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
