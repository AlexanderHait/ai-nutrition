import Shell from "@/components/Shell";
import { requireClient } from "@/lib/auth";
import { subscriptionAccess } from "@/lib/subscription-access";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const current = await requireClient();
  const access = await subscriptionAccess(current.accountId!);
  return <Shell role="client" isPremium={access.premium}>{children}</Shell>;
}
