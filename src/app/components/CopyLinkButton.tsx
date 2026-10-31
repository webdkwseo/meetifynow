"use client";

import { useCopy } from "@/hooks/useCopy";
import { Check, Link2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function CopyLinkButton(props: {
  /** Defaults to the current page URL. */
  url?: string;
  /** When set, phones get the native share sheet (WhatsApp, Messenger…) instead of copying. */
  shareTitle?: string;
  className?: string;
  dict: any;
}) {
  const { copy, copied, failed } = useCopy();
  const t = props.dict.button.copyLink;
  const isCopied = copied !== null;
  const [canShare, setCanShare] = useState(false);

  // Feature-detect after mount; desktop browsers with navigator.share keep copying.
  useEffect(() => {
    setCanShare(
      !!props.shareTitle &&
        typeof navigator.share === "function" &&
        window.matchMedia("(pointer: coarse)").matches,
    );
  }, [props.shareTitle]);

  const handleClick = async () => {
    const url = props.url ?? window.location.href;
    if (canShare) {
      try {
        await navigator.share({ title: props.shareTitle, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return; // user closed the sheet
      }
    }
    copy(url, "link");
  };

  const Icon = isCopied ? Check : canShare ? Share2 : Link2;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 text-dark font-medium w-fit px-5 py-2.5 rounded-2xl self-center border border-dark/10 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${props.className ?? ""}`}
    >
      <Icon
        className={`w-4 h-4 ${isCopied ? "text-green-700" : ""}`}
        aria-hidden
      />
      <span aria-live="polite">
        {isCopied ? t.copied : failed ? t.failed : canShare ? t.share : t.copy}
      </span>
    </button>
  );
}
