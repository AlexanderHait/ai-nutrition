import Shell from "@/components/Shell";
import ClientExperienceCenter from "@/components/ClientExperienceCenter";
import ClientDesignV3 from "@/components/ClientDesignV3";
import { requireClient } from "@/lib/auth";
import { clientSetupComplete } from "@/lib/client-setup";
import { clientSettingsAccountData } from "@/lib/account-data";
import { subscriptionAccess } from "@/lib/subscription-access";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const current = await requireClient();
  const [access, settings] = await Promise.all([
    subscriptionAccess(current.accountId!),
    clientSettingsAccountData(current.accountId!),
  ]);

  return (
    <Shell role="client" isPremium={access.premium}>
      <ClientDesignV3 />
      <ClientExperienceCenter setupRequired={!clientSetupComplete(settings)} />
      {children}
    </Shell>
  );
}
