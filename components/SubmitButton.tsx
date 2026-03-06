"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
};

export default function SubmitButton({ idleLabel, pendingLabel, className = "button", disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button className={className} type="submit" disabled={isDisabled} aria-busy={pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
