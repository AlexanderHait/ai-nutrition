"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Activity,BarChart3,BrainCircuit,CreditCard,Crown,Database,Headphones,LayoutDashboard,LockKeyhole,MessageSquare,Send,Settings2,TrendingUp,UserRound,Users,Utensils} from "lucide-react";
export type IconKey="home"|"coach"|"clients"|"dialogs"|"activity"|"analytics"|"catalog"|"mailings"|"subscriptions"|"nutrition"|"progress"|"support"|"profile"|"plan"|"settings";
export type NavItem=readonly[string,string,IconKey,({premium?:boolean})?];
const ICONS={home:LayoutDashboard,coach:BrainCircuit,clients:Users,dialogs:MessageSquare,activity:Activity,analytics:BarChart3,catalog:Database,mailings:Send,subscriptions:CreditCard,nutrition:Utensils,progress:TrendingUp,support:Headphones,profile:UserRound,plan:Crown,settings:Settings2} satisfies Record<IconKey,React.ComponentType<{size?:number;strokeWidth?:number}>>;
function isActive(pathname:string,href:string){if(href==="/admin"||href==="/client")return pathname===href;return pathname===href||pathname.startsWith(href+"/")}
export default function NavLinks({items,unreadDialogs=0,isPremium=false}:{items:readonly NavItem[];unreadDialogs?:number;isPremium?:boolean}){
 const pathname=usePathname();return <>{items.map(([href,label,key,meta])=>{const Icon=ICONS[key],badge=href==="/admin/dialogs"?unreadDialogs:0,active=isActive(pathname,href),locked=Boolean(meta?.premium&&!isPremium);return <Link href={href} key={href} className={`${active?"active ":""}${locked?"premiumLocked":""}`.trim()||undefined} aria-current={active?"page":undefined}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{locked&&<em className="premiumNavTag"><LockKeyhole size={10}/>Premium</em>}{badge>0&&<em className="navBadge">{badge>99?"99+":badge}</em>}</Link>})}</>;
}
