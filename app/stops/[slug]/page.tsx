import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEventsForStop,
  getNuggetsForStop,
  getStageById,
  getStopBySlug,
  stops,
} from "@/content";
import { EventCard } from "@/components/EventCard";
import { NuggetCard } from "@/components/NuggetCard";
import { sortEventsByRelevance } from "@/lib/events";
import { stopKindLabels } from "@/lib/labels";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return stops.map((stop) => ({ slug: stop.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stop = getStopBySlug(slug);
  if (!stop) return { title: "Stop" };
  return { title: stop.name };
}

export default async function StopPage({ params }: Props) {
  const { slug } = await params;
  const stop = getStopBySlug(slug);
  if (!stop) notFound();

  const stage = getStageById(stop.stageId);
  const related = getNuggetsForStop(stop.id);
  const stopEvents = sortEventsByRelevance(getEventsForStop(stop.id));

  return (
    <main className="atmosphere min-h-dvh">
      <div className="page-shell page-pad">
        {stage ? (
          <Link
            href={`/stages/${stage.slug}/`}
            className="focus-ring text-sm text-atlantic hover:text-atlantic-deep"
          >
            ← Stage {stage.number}: {stage.from} → {stage.to}
          </Link>
        ) : (
          <Link
            href="/journey/"
            className="focus-ring text-sm text-atlantic hover:text-atlantic-deep"
          >
            ← Journey
          </Link>
        )}

        <p className="mt-8 text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
          {stopKindLabels[stop.kind] ?? stop.kind}
        </p>
        <h1 className="mt-3 font-display text-4xl text-granite sm:text-5xl">
          {stop.name}
        </h1>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-granite-soft">
          {stop.atmosphere}
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-granite">History</h2>
          <p className="mt-3 max-w-prose leading-relaxed text-muted">
            {stop.history}
          </p>
        </section>

        {stop.practical ? (
          <section className="mt-10 rounded-2xl border border-line bg-shell/60 px-5 py-5">
            <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-ochre-deep">
              Practical
            </h2>
            <p className="mt-2 leading-relaxed text-granite-soft">
              {stop.practical}
            </p>
          </section>
        ) : null}

        {stopEvents.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl text-granite">
                Town events
              </h2>
              <Link
                href="/events/"
                className="focus-ring shrink-0 text-sm text-atlantic hover:text-atlantic-deep"
              >
                All events
              </Link>
            </div>
            <p className="mt-2 max-w-prose text-sm text-muted">
              Festivals and celebrations tied to this stop and its town.
            </p>
            <div className="mt-2">
              {stopEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={i}
                  showTown={false}
                />
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-granite">Nuggets</h2>
            <div className="mt-2">
              {related.map((nugget, i) => (
                <NuggetCard key={nugget.id} nugget={nugget} index={i} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
