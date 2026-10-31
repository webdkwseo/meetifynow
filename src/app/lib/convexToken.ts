import { auth } from "@clerk/nextjs/server";

/** Clerk JWT for server-side `fetchQuery`, so Convex sees who is asking. */
export async function convexToken(): Promise<string | undefined> {
  const { getToken } = await auth();
  return (await getToken({ template: "convex" })) ?? undefined;
}
