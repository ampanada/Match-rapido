"use client";

import { type AppLang } from "@/lib/i18n";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface LoginSuccessToastProps {
  lang: AppLang;
}

export default function LoginSuccessToast({ lang }: LoginSuccessToastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (!nextParams.has("loggedIn")) {
        return;
      }

      nextParams.delete("loggedIn");
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams]);

  return <p className="notice success">{lang === "ko" ? "로그인 완료 ✅" : "Sesion iniciada ✅"}</p>;
}
