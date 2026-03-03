"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function RouteTransitionIndicator() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (prevPath.current === pathname) {
      return;
    }

    prevPath.current = pathname;
    setShow(true);
    const timer = window.setTimeout(() => setShow(false), 360);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return <div className={`route-transition${show ? " show" : ""}`} aria-hidden="true" />;
}
