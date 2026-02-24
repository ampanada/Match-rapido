import type { Metadata } from "next";
import GlobalNotice from "@/components/GlobalNotice";
import LanguageTabs from "@/components/LanguageTabs";
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
        <LanguageTabs lang={lang} />
        <GlobalNotice lang={lang} />
        {children}
      </body>
    </html>
  );
}
