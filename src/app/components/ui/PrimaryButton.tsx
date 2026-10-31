"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type PrimaryButtonProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  /** Renders a link styled as the button (no nested <a><button>). */
  href?: string;
};

export default function PrimaryButton({
  children,
  className = "",
  onClick,
  disabled = false,
  type = "button",
  href,
}: PrimaryButtonProps) {
  const classes = twMerge(
    clsx(
      "group relative inline-flex items-center justify-center overflow-hidden rounded-2xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
      "bg-dark hover:bg-dark/90 text-white hover:shadow-xl hover:shadow-dark/20",
      className,
    ),
  );
  const content = (
    <span className="relative flex items-center gap-2 justify-center rounded-2xl px-6 py-2.5 transition-all duration-300 ease-out text-white">
      {children}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
    >
      {content}
    </button>
  );
}
