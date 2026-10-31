import InvitationAccept from "@/components/Workspace/InvitationAccept";
import { getDictionary } from "@/lib/dictionary";
import { Locale } from "@root/i18n.config";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ lang: Locale; token: string }>;
}) {
  const { lang, token } = await params;
  const dict = await getDictionary(lang);
  return (
    <InvitationAccept
      token={token}
      lang={lang}
      t={dict.page.invitation}
      roles={dict.page.dashboard.roles}
      errors={dict.errors}
    />
  );
}
