"use client";

import BigText from "@/components/BigText";
import Button from "@/components/Button";
import Heading from "@/components/Heading";
import enDict from "@/dictionaries/en.json";

import { Locale } from "@root/i18n.config";

export default function GlobalError() {
  const lang = "en" as Locale;
  const dict = enDict;

  return (
    <div className="flex flex-1 flex-col justify-center items-center h-full">
      <BigText text={dict.page.error[500].heading} />
      <Heading text={dict.page.error[500].title} />
      <Button href={`/${lang}`} text={dict.button.homePage} />
    </div>
  );
}
