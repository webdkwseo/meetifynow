import { getDictionary } from "@/lib/dictionary";
import { Locale } from "@root/i18n.config";

import BigText from "@/components/BigText";
import Button from "@/components/Button";
import Heading from "@/components/Heading";

import { getLocale } from "@/utils/getWebLocale";

export default async function NotFound() {
  // Should get the language from the URL but it't not possible with params here
  const lang = (await getLocale()) as Locale;
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-1 flex-col justify-center items-center h-full">
      <BigText text={dict.page.error[404].heading} />
      <Heading text={dict.page.error[404].title} />
      <Button href={`/${lang}`} text={dict.button.homePage} />
    </div>
  );
}
