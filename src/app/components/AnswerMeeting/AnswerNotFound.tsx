import Button from "@/components/Button";
import Heading from "@/components/Heading";
import Title from "@/components/Title";
import { getDictionary } from "@/lib/dictionary";
import { Locale } from "@root/i18n.config";
import { headers } from "next/headers";

export default async function AnswetNotFound() {
  const expectedHeaders = await headers();
  const preference = expectedHeaders.get("X-Language-Preference");
  const lang = (preference ?? "en") as Locale;
  const dict = await getDictionary(lang);
  return (
    <div className="flex flex-1 flex-col justify-center items-center h-full mt-20 mx-10 lg:m-0">
      <Title text={dict.page.answerNotFoundPage.title} />
      <Heading text={dict.page.answerNotFoundPage.heading} />
      <Button
        href={`/${lang}/meet/new`}
        text={dict.page.createMeeting.createButton}
      />
    </div>
  );
}
