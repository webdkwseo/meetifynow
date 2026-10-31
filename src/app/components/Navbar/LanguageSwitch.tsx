"use client";

import SlidingPill from "@/components/ui/SlidingPill";
import { usePathname } from "next/navigation";
import { MouseEvent, useState } from "react";

// Names stay in their own language so each reader recognises theirs.
const LANGUAGES = [
  { code: "pl", short: "PL", name: "Polski" },
  { code: "en", short: "EN", name: "English" },
] as const;

/** Lets the pill finish gliding before the page reloads. */
const SWITCH_DELAY_MS = 180;

export default function LanguageSwitch({
  lang,
  label,
}: {
  lang: string;
  label: string;
}) {
  const pathname = usePathname() ?? `/${lang}`;
  const [selected, setSelected] = useState(lang);

  const hrefFor = (code: string) =>
    pathname.replace(/^\/(pl|en)(?=\/|$)/, `/${code}`);

  const switchTo = (e: MouseEvent<HTMLAnchorElement>, code: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab etc.
    e.preventDefault();
    if (code === selected) return;
    setSelected(code);
    // Read by proxy.ts so "/" redirects to the language the visitor picked.
    document.cookie = `lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
    // Full load, not a client transition: the root layout (navbar, footer,
    // <html lang>, Clerk texts) only re-renders on a real request.
    const target =
      hrefFor(code) + window.location.search + window.location.hash;
    setTimeout(() => window.location.assign(target), SWITCH_DELAY_MS);
  };

  return (
    <nav
      aria-label={label}
      className="flex items-center h-9 p-0.5 rounded-xl border border-dark/10 bg-white/60"
    >
      {LANGUAGES.map(({ code, short, name }) => {
        const isSelected = code === selected;
        return (
          <a
            key={code}
            href={hrefFor(code)}
            hrefLang={code}
            lang={code}
            title={name}
            aria-label={name}
            aria-current={code === lang ? "true" : undefined}
            onClick={(e) => switchTo(e, code)}
            className={`relative isolate flex items-center justify-center h-full min-w-9 px-2 text-xs font-semibold rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected ? "text-white" : "text-dark/70 hover:text-dark"
            }`}
          >
            {isSelected && (
              <SlidingPill
                layoutId="language-switch"
                className="bg-dark rounded-lg"
              />
            )}
            {short}
          </a>
        );
      })}
    </nav>
  );
}
