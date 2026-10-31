import OrganizerPanel from "@/components/Dashboard/OrganizerPanel";
import { getDictionary } from "@/lib/dictionary";
import { Locale } from "@root/i18n.config";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return <OrganizerPanel lang={lang} dict={dict} />;
}
