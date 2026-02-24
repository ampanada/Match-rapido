"use client";

import { createClient } from "@/lib/supabase/client";
import { getClientLangFromCookie } from "@/lib/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [lang, setLang] = useState<"es" | "ko">("es");
  const [pendingCount, setPendingCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setLang(getClientLangFromCookie(document.cookie));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function refreshPendingHostRequests(userId: string) {
      const { data: hostPosts } = await supabase.from("posts").select("id").eq("host_id", userId).eq("status", "open");
      const postIds = (hostPosts ?? []).map((post) => post.id);

      if (postIds.length === 0) {
        if (mounted) {
          setPendingCount(0);
        }
        return;
      }

      const { count } = await supabase
        .from("joins")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in("post_id", postIds);

      if (mounted) {
        setPendingCount(count ?? 0);
      }
    }

    async function init() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setUserId(null);
          setPendingCount(0);
        }
        return;
      }
      if (mounted) {
        setUserId(user.id);
      }

      await refreshPendingHostRequests(user.id);

      const channel = supabase
        .channel(`pending-host-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "joins"
          },
          async () => {
            await refreshPendingHostRequests(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const MENUS = userId
    ? lang === "ko"
      ? [
          { href: "/", label: "홈" },
          { href: "/post", label: "글쓰기" },
          { href: "/results", label: "결과" },
          { href: "/u", label: "프로필" }
        ]
      : [
          { href: "/", label: "Inicio" },
          { href: "/post", label: "Publicar" },
          { href: "/results", label: "Resultados" },
          { href: "/u", label: "Perfil" }
        ]
    : lang === "ko"
      ? [
          { href: "/", label: "홈" },
          { href: "/post", label: "글쓰기" },
          { href: "/login", label: "로그인" }
        ]
      : [
          { href: "/", label: "Inicio" },
          { href: "/post", label: "Publicar" },
          { href: "/login", label: "Acceso" }
        ];

  return (
    <nav className="bottom-nav" aria-label="하단 네비게이션">
      {MENUS.map((menu) => {
        const active =
          menu.href === "/" ? pathname === "/" : pathname === menu.href || pathname.startsWith(`${menu.href}/`);
        const showPendingBadge = userId !== null && menu.href === "/u" && pendingCount > 0;

        return (
          <Link key={menu.href} className={`nav-item${active ? " active" : ""}`} href={menu.href}>
            {menu.label}
            {showPendingBadge ? <span className="nav-badge">{pendingCount}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
