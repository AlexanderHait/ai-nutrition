import Shell from "@/components/Shell";
import ClientExperienceCenter from "@/components/ClientExperienceCenter";
import { requireClient } from "@/lib/auth";
import { clientSetupComplete } from "@/lib/client-setup";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { subscriptionAccess } from "@/lib/subscription-access";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const current = await requireClient();
  const db = getSupabaseAdmin();
  const [access, { data: settings }] = await Promise.all([
    subscriptionAccess(current.accountId!),
    db.from("client_settings")
      .select("goal,current_weight_kg,kcal_target")
      .eq("account_id", current.accountId!)
      .maybeSingle(),
  ]);

  return (
    <Shell role="client" isPremium={access.premium}>
      <ClientExperienceCenter setupRequired={!clientSetupComplete(settings)} />
      {children}
    </Shell>
  );
}
