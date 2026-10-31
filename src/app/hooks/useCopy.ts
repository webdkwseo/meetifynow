"use client";

import { useCallback, useState } from "react";

/** Copies text and exposes which key was copied for ~2s (null on failure). */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const copy = useCallback(async (text: string, key = text) => {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setFailed(true);
    }
  }, []);

  return { copy, copied, failed };
}
