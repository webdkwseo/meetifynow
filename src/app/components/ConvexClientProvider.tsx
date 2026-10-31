"use client";

import { plPL } from "@clerk/localizations";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { MotionConfig } from "framer-motion";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
  lang,
  confirmLabels,
}: {
  children: ReactNode;
  lang: string;
  confirmLabels: { confirm: string; cancel: string };
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      localization={lang === "pl" ? plPL : undefined}
      afterSignOutUrl={`/${lang}`}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <MotionConfig reducedMotion="user">
          <ConfirmProvider labels={confirmLabels}>{children}</ConfirmProvider>
        </MotionConfig>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
