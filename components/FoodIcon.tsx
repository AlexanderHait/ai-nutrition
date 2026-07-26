import {
  Apple, Beef, Coffee, Cookie, CupSoda, Drumstick, Egg, Fish, IceCreamBowl,
  Milk, Pizza, Salad, Sandwich, Soup, Utensils, Wheat
} from "lucide-react";

export default function FoodIcon({dish,size=19}:{dish:string;size?:number}){
  const s=String(dish||"").toLowerCase();
  const Icon=
    /яйц|омлет|скрэмбл/.test(s)?Egg:
    /молок|йогур|творог|кефир|сыр/.test(s)?Milk:
    /кур|бедр|голен|крыл/.test(s)?Drumstick:
    /салат|овощ|редис|огур|помид|капуст/.test(s)?Salad:
    /бургер|сэндв|шаурм|хот.?дог/.test(s)?Sandwich:
    /суп|борщ|щи|бульон|солян/.test(s)?Soup:
    /рыб|лосос|тунец|семг|треск/.test(s)?Fish:
    /мяс|индей|гов|свин|котлет|стейк|кордон/.test(s)?Beef:
    /коф|чай|капуч|латте|эспресс/.test(s)?Coffee:
    /сок|напит|кола|лимонад|морс/.test(s)?CupSoda:
    /ябл|банан|фрукт|груш|ягод|персик|апельс/.test(s)?Apple:
    /печ|конф|шокол|мармел|десерт|торт|морож/.test(s)?(/морож/.test(s)?IceCreamBowl:Cookie):
    /пицц/.test(s)?Pizza:
    /хлеб|булоч|лаваш|лепеш|овсян|каша|рис|греч|макарон/.test(s)?Wheat:
    Utensils;
  return <Icon size={size} strokeWidth={1.8}/>;
}
