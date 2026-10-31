"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function NavbarAuthButtons({
  lang,
  loginLabel,
  dashboardLabel,
}: {
  lang: string;
  loginLabel: string;
  dashboardLabel: string;
}) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return <div className="w-20 h-9" />;

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/${lang}/dashboard`}
          className="flex items-center h-9 px-3 sm:px-4 text-sm font-medium text-white bg-dark rounded-xl hover:bg-dark/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {dashboardLabel}
        </Link>
        <UserButton />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="h-9 px-3 sm:px-4 text-sm font-medium text-dark border border-dark/20 rounded-xl hover:bg-dark/5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {loginLabel}
      </button>
    </SignInButton>
  );
}
