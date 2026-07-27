import Shell from '@/components/Shell';
import {requireClient} from '@/lib/auth';
import {subscriptionLifecycleData} from '@/lib/data';
export default async function L({children}:{children:React.ReactNode}){
  const session=await requireClient();
  const life=await subscriptionLifecycleData(session.chatId!);
  const isPremium=life?.plan==='premium'&&['trial','active','grace'].includes(String(life?.state||''))&&(!life?.current_period_end||new Date(life.current_period_end)>new Date()||life?.state==='grace');
  return <Shell role="client" isPremium={Boolean(isPremium)}>{children}</Shell>
}
