import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireClient();
  redirect("/client/nutrition#history");
}
