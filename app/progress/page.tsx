"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { stages } from "@/content";
import { FadeIn } from "@/components/Motion";
import { useProgress } from "@/components/ProgressProvider";
import { formatKm } from "@/lib/labels";

export default function ProgressPage() {
  const {
    ready,
    state,
    isComplete,
    toggleComplete,
    saveNote,
    noteFor,
    setCurrent,
  } = useProgress();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ready) return;
    const next: Record<string, string> = {};
    for (const stage of stages) next[stage.id] = noteFor(stage.id);
    setDrafts(next);
  }, [ready, noteFor]);

  const completed = stages.filter((s) => isComplete(s.id)).length;
  const walkedKm = stages
    .filter((s) => isComplete(s.id))
    .reduce((sum, s) => sum + s.distanceKm, 0);

  return (
    <main className="atmosphere min-h-dvh">
      <div className="page-shell page-pad">
        <FadeIn>
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
            Your walk
          </p>
          <h1 className="mt-3 font-display text-4xl text-granite sm:text-5xl">
            Progress
          </h1>
          <p className="mt-3 max-w-prose text-muted">
            Mark stages as you go and leave a line or two for the day. Stored on
            this phone only.
          </p>
          {ready ? (
            <p className="mt-6 text-sm text-atlantic-deep">
              {completed} of {stages.length} stages · {formatKm(walkedKm)} walked
            </p>
          ) : null}
        </FadeIn>

        <div className="mt-10 space-y-8">
          {stages.map((stage) => {
            const complete = isComplete(stage.id);
            const current = state.currentStageId === stage.id;
            return (
              <section
                key={stage.id}
                className={`rounded-2xl border px-4 py-5 ${
                  current
                    ? "border-atlantic/40 bg-shell/80"
                    : "border-line bg-shell/50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/stages/${stage.slug}/`}
                      className="focus-ring font-display text-xl text-granite hover:text-atlantic-deep"
                    >
                      {stage.from} → {stage.to}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      Stage {stage.number} · {formatKm(stage.distanceKm)}
                      {current ? " · today" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrent(stage.id)}
                      className="focus-ring rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-granite"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComplete(stage.id)}
                      className={`focus-ring rounded-full px-3 py-1.5 text-xs ${
                        complete
                          ? "bg-atlantic text-shell"
                          : "border border-atlantic/30 text-atlantic-deep"
                      }`}
                    >
                      {complete ? "Walked" : "Mark walked"}
                    </button>
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="sr-only">Note for stage {stage.number}</span>
                  <textarea
                    value={drafts[stage.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [stage.id]: e.target.value }))
                    }
                    onBlur={() => saveNote(stage.id, drafts[stage.id] ?? "")}
                    rows={2}
                    placeholder="A line from the day…"
                    className="focus-ring w-full resize-none rounded-xl border border-line bg-fog/60 px-3 py-2 text-sm text-granite placeholder:text-muted/70"
                  />
                </label>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
