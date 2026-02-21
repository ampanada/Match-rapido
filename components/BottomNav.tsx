"use client";

import { getClientLangFromCookie } from "@/lib/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [lang, setLang] = useState<"es" | "ko">("es");

  useEffect(() => {
    setLang(getClientLangFromCookie(document.cookie));
  }, []);

  const MENUS =
    lang === "ko"
      ? [
          { href: "/", label: "홈" },
          { href: "/post", label: "글쓰기" },
          { href: "/my", label: "내정보" },
          { href: "/login", label: "로그인" }
        ]
      : [
          { href: "/", label: "Inicio" },
          { href: "/post", label: "Publicar" },
          { href: "/my", label: "Mi cuenta" },
          { href: "/login", label: "Acceso" }
        ];

  return (
    <nav className="bottom-nav" aria-label="하단 네비게이션">
      {MENUS.map((menu) => {
        const active =
          menu.href === "/" ? pathname === "/" : pathname === menu.href || pathname.startsWith(`${menu.href}/`);

        return (
          <Link key={menu.href} className={`nav-item${active ? " active" : ""}`} href={menu.href}>
            {menu.label}
          </Link>
        );
      })}
    </nav>
  );
}
