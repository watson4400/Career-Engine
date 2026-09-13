import type { Metadata } from "next";
import { nuggets } from "@/content";
import { FadeIn } from "@/components/Motion";
import { NuggetCard } from "@/components/NuggetCard";

export const metadata: Metadata = { title: "Discover" };

export default function NuggetsPage() {
  return (
    <main className="atmosphere topo-noise min-h-dvh">
      <div className="page-shell page-pad">
        <FadeIn>
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
            Discover
          </p>
          <h1 className="mt-3 font-display text-4xl text-granite sm:text-5xl">
            Historical nuggets
          </h1>
          <p className="mt-3 max-w-prose text-muted">
            Arsenals, knights, river crossings, and the quiet stories that cling
            to yellow arrows.
          </p>
        </FadeIn>
        <div className="mt-8">
          {nuggets.map((nugget, i) => (
            <NuggetCard key={nugget.id} nugget={nugget} index={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
