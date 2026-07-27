"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Activity,BarChart3,CreditCard,Crown,Database,Headphones,LayoutDashboard,MessageSquare,Send,TrendingUp,UserRound,Users,Utensils} from "lucide-react";
type IconKey="home"|"clients"|"dialogs"|"activity"|"analytics"|"catalog"|"mailings"|"subscriptions"|"nutrition"|"progress"|"support"|"profile"|"plan";
type Item=readonly[string,string,IconKey];
const ICONS={home:LayoutDashboard,clients:Users,dialogs:MessageSquare,activity:Activity,analytics:BarChart3,catalog:Database,mailings:Send,subscriptions:CreditCard,nutrition:Utensils,progress:TrendingUp,support:Headphones,profile:UserRound,plan:Crown} satisfies Record<IconKey,React.ComponentType<{size?:number;strokeWidth?:number}>>;
function isActive(pathname:string,href:string){if(href==="/admin"||href==="/client")return pathname===href;return pathname===href||pathname.startsWith(href+"/")}
export default function NavLinks({items,unreadDialogs=0,mobile=false}:{items:readonly Item[];unreadDialogs?:number;mobile?:boolean}){
 const pathname=usePathname();return <>{items.map(([href,label,key])=>{const Icon=ICONS[key],badge=href==="/admin/dialogs"?unreadDialogs:0,active=isActive(pathname,href);return <Link href={href} key={href} className={active?"active":undefined} aria-current={active?"page":undefined}>{mobile?<><span className="mobileNavIcon"><Icon size={20} strokeWidth={1.8}/>{badge>0&&<em className="mobileBadge">{badge>9?"9+":badge}</em>}</span><span>{label}</span></>:<><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{badge>0&&<em className="navBadge">{badge>99?"99+":badge}</em>}</>}</Link>})}</>;
}
