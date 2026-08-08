import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const sessionCookie = (await cookies()).get("ain_session")?.value;
  redirect(sessionCookie ? "/client" : "/login");
}
