import ConvexClientProvider from "@/components/ConvexClientProvider";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar/Navbar.tsx";
import "@/global.css";
import { Locale, i18n } from "@root/i18n.config";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Metadata } from "next";
import { Poppins } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { cache } from "react";
import { getDictionary } from "./lib/dictionary";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});

export async function generateStaticParams() {
  return i18n.locales.map((locale: Locale) => ({ lang: locale }));
}

const getLocale = cache(async (): Promise<Locale> => {
  const expectedHeaders = await headers();
  const preference = expectedHeaders.get("X-Language-Preference");
  return (preference ?? "en") as Locale;
});

export async function generateMetadata() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const metadata: Metadata = {
    metadataBase: new URL("https://meetifynow.com"),
    title: dict.website.title,
    description: dict.website.description,
    openGraph: {
      images: "/imgs/og-image.webp",
      url: "/",
      description: dict.website.description,
      siteName: "MeetifyNow",
      type: "website",
      title: "MeetifyNow",
    },
    twitter: {
      card: "summary_large_image",
      title: "MeetifyNow",
      description: dict.website.description,
      images: "/imgs/og-image.webp",
    },
  };

  return metadata;
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} className={poppins.variable}>
      <head>
        <Script type="application/ld+json">
          {`
            {
                "@context" : "https://schema.org",
                "@type" : "WebSite",
                "name" : "MeetifyNow",
                "alternateName" : "MN",
                "url" : "https://meetifynow.com/"
            }
        `}
        </Script>
      </head>
      <body>
        <ConvexClientProvider
          lang={locale}
          confirmLabels={{
            confirm: dict.button.confirm,
            cancel: dict.button.cancel,
          }}
        >
          <Navbar lang={locale} />
          {children}
          <Footer dict={dict.footer} />
        </ConvexClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
