"use client";

import { stages, TOTAL_DISTANCE_KM } from "@/content";
import { FadeIn, PathDraw } from "@/components/Motion";
import { StageRow } from "@/components/StageRow";
import { useProgress } from "@/components/ProgressProvider";
import { formatKm } from "@/lib/labels";

export default function JourneyPage() {
  const { state, isComplete } = useProgress();

  return (
    <main className="atmosphere topo-noise min-h-dvh">
      <div className="page-shell page-pad">
        <FadeIn>
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
            Camino Inglés
          </p>
          <h1 className="mt-3 font-display text-4xl text-granite sm:text-5xl">
            The journey
          </h1>
          <p className="mt-3 max-w-prose text-muted">
            Six classic stages from Ferrol’s docks to the Obradoiro —{" "}
            {formatKm(TOTAL_DISTANCE_KM)} of estuary, stone, and shared path.
          </p>
          <PathDraw className="mt-8 h-16 w-full" />
        </FadeIn>
        <FadeIn delay={0.12} className="mt-4">
          {stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              complete={isComplete(stage.id)}
              current={state.currentStageId === stage.id}
            />
          ))}
        </FadeIn>
      </div>
    </main>
  );
}
