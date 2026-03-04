"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useState } from "react";

interface MotionProfileLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export default function MotionProfileLink({ href, className, children }: MotionProfileLinkProps) {
  const router = useRouter();
  const [pressing, setPressing] = useState(false);
  const disabled = !href || href === "#";

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    setPressing(true);

    window.setTimeout(() => {
      router.push(href);
    }, 140);
  }

  return (
    <a
      href={disabled ? "#" : href}
      className={`${className ?? ""} profile-link-motion${pressing ? " is-pressing" : ""}`}
      onClick={onClick}
      aria-disabled={disabled}
    >
      {children}
    </a>
  );
}
