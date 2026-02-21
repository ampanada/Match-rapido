import type { Metadata } from "next";
import LanguageTabs from "@/components/LanguageTabs";
import { getServerLang } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Match MVP",
  description: "Emparejamiento rapido de tenis para clubes"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getServerLang();

  return (
    <html lang={lang}>
      <body>
        <LanguageTabs lang={lang} />
        {children}
      </body>
    </html>
  );
}
