"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type NavDir = "forward" | "back";

const STACK_KEY = "match_rapido_nav_stack_v1";

function loadStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-50)));
  } catch {
    // ignore
  }
}

export default function RouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [direction, setDirection] = useState<NavDir>("forward");
  const initialized = useRef(false);

  const key = useMemo(() => pathname, [pathname]);

  useEffect(() => {
    const stack = loadStack();

    if (!initialized.current) {
      initialized.current = true;
      if (stack.length === 0 || stack[stack.length - 1] !== pathname) {
        stack.push(pathname);
        saveStack(stack);
      }
      setDirection("forward");
      return;
    }

    const last = stack[stack.length - 1];
    const prev = stack[stack.length - 2];

    if (last === pathname) {
      return;
    }

    if (prev === pathname) {
      stack.pop();
      saveStack(stack);
      setDirection("back");
      return;
    }

    stack.push(pathname);
    saveStack(stack);
    setDirection("forward");
  }, [pathname]);

  return (
    <div key={key} className={`route-frame route-${direction}`}>
      {children}
    </div>
  );
}
