import Shell from "@/components/Shell";
import { requireClient } from "@/lib/auth";
import { subscriptionAccess } from "@/lib/subscription-access";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient();
  const access = await subscriptionAccess(session.chatId!);
  return <Shell role="client" isPremium={access.premium}>{children}</Shell>;
}
