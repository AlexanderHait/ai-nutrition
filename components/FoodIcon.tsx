import { Apple, Beef, Coffee, Cookie, CupSoda, Fish, Pizza, Salad, Sandwich, Soup, Utensils } from "lucide-react";

export default function FoodIcon({dish,size=19}:{dish:string;size?:number}){
  const s=String(dish||"").toLowerCase();
  const Icon=
    /салат|овощ|редис|огур|помид/.test(s)?Salad:
    /бургер|сэндв|шаурм|хот.?дог/.test(s)?Sandwich:
    /суп|борщ|щи|бульон/.test(s)?Soup:
    /рыб|лосос|тунец|семг/.test(s)?Fish:
    /мяс|кур|индей|гов|свин|котлет|стейк/.test(s)?Beef:
    /коф|чай|капуч|латте/.test(s)?Coffee:
    /сок|напит|кола|лимонад/.test(s)?CupSoda:
    /ябл|банан|фрукт|груш|ягод/.test(s)?Apple:
    /печ|конф|шокол|мармел|десерт|торт/.test(s)?Cookie:
    /пицц/.test(s)?Pizza:
    Utensils;
  return <Icon size={size}/>;
}
