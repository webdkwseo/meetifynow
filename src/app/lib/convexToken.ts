import { auth } from "@clerk/nextjs/server";
import { clerkEnabled } from "./features";

/** Clerk JWT for server-side `fetchQuery`, so Convex sees who is asking. */
export async function convexToken(): Promise<string | undefined> {
  if (!clerkEnabled) return undefined;
  const { getToken } = await auth();
  return (await getToken({ template: "convex" })) ?? undefined;
}
