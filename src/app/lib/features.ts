/**
 * Features hidden in production for now. Visible in development; set the
 * matching NEXT_PUBLIC_FEATURE_* variable to "true" (or "false") to override.
 * Env vars are referenced literally so Next.js can inline them in client code.
 */
const flag = (value: string | undefined) =>
  value === undefined
    ? process.env.NODE_ENV !== "production"
    : value === "true";

/** Clerk runs only when its keys are configured (production has none yet). */
export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const features = {
  /** Sign-in button and the dashboard link in the navbar. Needs Clerk. */
  auth: clerkEnabled && flag(process.env.NEXT_PUBLIC_FEATURE_AUTH),
  /** "Name template" chips in the create-meeting wizard. */
  nameTemplates: flag(process.env.NEXT_PUBLIC_FEATURE_NAME_TEMPLATES),
  /** "Required participants" field in the create-meeting wizard. */
  requiredParticipants: flag(
    process.env.NEXT_PUBLIC_FEATURE_REQUIRED_PARTICIPANTS,
  ),
};
