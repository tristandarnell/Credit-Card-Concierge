import { PurchaseAdvisor } from "@/components/purchase-advisor";
import { SectionHeading } from "@/components/section-heading";
import { getCleanRewardCards } from "@/lib/rewards/data";

export default async function OptimizerPage() {
  const cards = await getCleanRewardCards(500);

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Purchase Optimizer"
        subtitle="Add purchases to find the best card for each. The optimizer recalculates automatically when you add a new purchase."
      />

      <PurchaseAdvisor cards={cards} />
    </section>
  );
}
