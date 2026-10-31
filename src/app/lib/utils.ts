import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ConvexError } from "convex/values";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Replaces `{key}` placeholders in a dictionary string. */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Picks a plural form (`one`/`few`/`many`/`other`) from a dictionary object. */
export function plural(
  forms: Record<string, string>,
  count: number,
  lang: string,
) {
  const rule = new Intl.PluralRules(lang).select(count);
  return fmt(forms[rule] ?? forms.other, { count });
}

/** Text colour with readable contrast on the given hex background. */
export function textOn(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L =
    0.2126 * lin((n >> 16) & 255) +
    0.7152 * lin((n >> 8) & 255) +
    0.0722 * lin(n & 255);
  // White wins when its contrast ratio beats #0f172a's (relative luminance + 0.05 = 0.0588).
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0588 ? "#ffffff" : "#0f172a";
}

export const DEFAULT_BRAND_COLOR = "#004466";

/** Code of a `ConvexError({ code })` thrown by our Convex functions. */
export function errorCode(err: unknown): string | undefined {
  return err instanceof ConvexError
    ? (err.data as { code?: string })?.code
    : undefined;
}

/** Maps a `ConvexError({ code })` to `dict.errors[code]`; anything else gets the fallback. */
export function errorText(
  err: unknown,
  errors: Record<string, string>,
  fallback: string,
) {
  const code = errorCode(err);
  return (code && errors[code]) || fallback;
}
