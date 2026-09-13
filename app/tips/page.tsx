import type { Metadata } from "next";
import { tips, type TipCategory } from "@/content";
import { FadeIn } from "@/components/Motion";
import { tipCategoryLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Tips" };

const order: TipCategory[] = [
  "credential",
  "footing",
  "weather",
  "food",
  "gear",
  "etiquette",
];

export default function TipsPage() {
  return (
    <main className="atmosphere topo-noise min-h-dvh">
      <div className="page-shell page-pad">
        <FadeIn>
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
            Pocket wisdom
          </p>
          <h1 className="mt-3 font-display text-4xl text-granite sm:text-5xl">
            Tips & tricks
          </h1>
          <p className="mt-3 max-w-prose text-muted">
            Small practices that keep the English Way kind to your feet,
            credential, and fellow pilgrims.
          </p>
        </FadeIn>
        <div className="mt-10 space-y-12">
          {order.map((category) => {
            const group = tips.filter((t) => t.category === category);
            if (!group.length) return null;
            return (
              <section key={category}>
                <h2 className="font-display text-2xl text-atlantic-deep">
                  {tipCategoryLabels[category]}
                </h2>
                <ul className="mt-5 space-y-6">
                  {group.map((tip) => (
                    <li key={tip.id}>
                      <h3 className="text-lg text-granite">{tip.title}</h3>
                      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
                        {tip.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
