import LanguageSwitch from "@/components/Navbar/LanguageSwitch.tsx";
import NavbarAuthButtons from "@/components/Navbar/NavbarAuthButtons.tsx";
import { getDictionary } from "@/lib/dictionary.ts";
import { features } from "@/lib/features.ts";
import { Locale } from "@root/i18n.config.ts";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import meetifyNowLogo from "../../assets/imgs/meetifynow-logo.webp";

export default async function Navbar({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);

  return (
    <div className="fixed top-4 sm:top-6 z-50 w-full flex justify-center pointer-events-none px-4">
      <nav className="pointer-events-auto w-full max-w-[1000px] bg-white/80 backdrop-blur-xl border border-gray/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl py-3 px-4 sm:px-6 md:px-8 flex justify-between items-center gap-3">
        <Link
          href={`/${lang}`}
          aria-label={dict.nav.home}
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Image
            src={meetifyNowLogo}
            height={28}
            width={200}
            alt="MeetifyNow"
            className="h-5 sm:h-6 md:h-7 w-auto opacity-90 transition-opacity hover:opacity-100"
            style={{ width: "auto" }}
            priority
          />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href={`/${lang}/meet/new`}
            aria-label={dict.nav.newMeeting}
            className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 text-sm font-medium text-dark rounded-xl hover:bg-dark/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">{dict.nav.newMeeting}</span>
          </Link>
          <LanguageSwitch lang={lang} label={dict.nav.language} />
          {features.auth && (
            <NavbarAuthButtons
              lang={lang}
              loginLabel={dict.nav.login}
              dashboardLabel={dict.nav.dashboard}
            />
          )}
        </div>
      </nav>
    </div>
  );
}
