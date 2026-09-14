import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEventsForStage,
  getNuggetById,
  getStageBySlug,
  getStopById,
  getTipById,
  stages,
} from "@/content";
import { EventCard } from "@/components/EventCard";
import { NuggetCard } from "@/components/NuggetCard";
import { StopLink } from "@/components/StopLink";
import { StageActions } from "@/components/StageActions";
import { sortEventsByRelevance } from "@/lib/events";
import { difficultyLabel, formatKm, tipCategoryLabels } from "@/lib/labels";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return stages.map((stage) => ({ slug: stage.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stage = getStageBySlug(slug);
  if (!stage) return { title: "Stage" };
  return { title: `Stage ${stage.number}: ${stage.from} → ${stage.to}` };
}

export default async function StagePage({ params }: Props) {
  const { slug } = await params;
  const stage = getStageBySlug(slug);
  if (!stage) notFound();

  const stageStops = stage.stopIds
    .map((id) => getStopById(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const stageTips = stage.tipIds
    .map((id) => getTipById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const stageNuggets = stage.nuggetIds
    .map((id) => getNuggetById(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));
  const stageEvents = sortEventsByRelevance(getEventsForStage(stage.id)).slice(
    0,
    4,
  );

  const index = stages.findIndex((s) => s.id === stage.id);
  const prev = index > 0 ? stages[index - 1] : null;
  const next = index < stages.length - 1 ? stages[index + 1] : null;

  return (
    <main className="atmosphere min-h-dvh">
      <div className="page-shell page-pad">
        <Link
          href="/journey/"
          className="focus-ring text-sm text-atlantic hover:text-atlantic-deep"
        >
          ← Journey
        </Link>

        <p className="mt-8 text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
          Stage {String(stage.number).padStart(2, "0")}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-granite sm:text-5xl">
          {stage.from}
          <span className="mx-3 text-muted">→</span>
          {stage.to}
        </h1>
        <p className="mt-4 text-sm text-muted">
          {formatKm(stage.distanceKm)} · {difficultyLabel(stage.difficulty)} ·{" "}
          {stage.elevationFeel}
        </p>
        <p className="mt-8 max-w-prose text-[1.05rem] leading-relaxed text-granite-soft">
          {stage.narrative}
        </p>

        <StageActions stageId={stage.id} />

        <section className="mt-12">
          <h2 className="font-display text-2xl text-granite">Along the way</h2>
          <div className="mt-5 flex flex-col gap-3">
            {stageStops.map((stop) => (
              <StopLink key={stop.id} stop={stop} />
            ))}
          </div>
        </section>

        {stageEvents.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl text-granite">
                Events nearby
              </h2>
              <Link
                href="/events/"
                className="focus-ring shrink-0 text-sm text-atlantic hover:text-atlantic-deep"
              >
                All events
              </Link>
            </div>
            <div className="mt-2">
              {stageEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </section>
        ) : null}

        {stageTips.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-granite">Stage tips</h2>
            <ul className="mt-5 space-y-4">
              {stageTips.map((tip) => (
                <li key={tip.id} className="border-l-2 border-atlantic/40 pl-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ochre-deep">
                    {tipCategoryLabels[tip.category]}
                  </p>
                  <p className="mt-1 font-medium text-granite">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {tip.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {stageNuggets.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-granite">Nuggets</h2>
            <div className="mt-2">
              {stageNuggets.map((nugget, i) => (
                <NuggetCard key={nugget.id} nugget={nugget} index={i} />
              ))}
            </div>
          </section>
        ) : null}

        <nav className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-6 text-sm">
          {prev ? (
            <Link
              href={`/stages/${prev.slug}/`}
              className="focus-ring text-atlantic hover:text-atlantic-deep"
            >
              ← {prev.to}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/stages/${next.slug}/`}
              className="focus-ring text-atlantic hover:text-atlantic-deep"
            >
              {next.from} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </main>
  );
}
