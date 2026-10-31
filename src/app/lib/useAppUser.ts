"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import { clerkEnabled } from "./features";

const signedOut = { isLoaded: true, isSignedIn: false, user: null } as const;

/**
 * Clerk's `useUser`, or a permanent "signed out" when Clerk isn't configured
 * (no ClerkProvider is mounted then, and Clerk's hook would throw).
 */
export const useUser: typeof useClerkUser = clerkEnabled
  ? useClerkUser
  : ((() => signedOut) as unknown as typeof useClerkUser);
