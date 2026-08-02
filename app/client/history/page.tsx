import { requireClient } from "@/lib/auth";
import TimelinePanel from "@/components/TimelinePanel";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireClient();
  return (
    <>
      <div className="pageHead">
        <div>
          <p>Хронология сопровождения</p>
          <h1>История</h1>
          <span>Питание, вес и решения TeddY в одном месте.</span>
        </div>
      </div>
      <section className="card top">
        <TimelinePanel />
      </section>
    </>
  );
}
