import Link from "next/link";
import { stopKindLabels } from "@/lib/labels";
import type { Stop } from "@/content";

export function StopLink({ stop }: { stop: Stop }) {
  return (
    <Link
      href={`/stops/${stop.slug}/`}
      className="focus-ring block rounded-2xl border border-line bg-shell/70 px-4 py-4 transition hover:border-atlantic/40 hover:bg-shell"
    >
      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ochre-deep">
        {stopKindLabels[stop.kind] ?? stop.kind}
      </p>
      <p className="mt-1 font-display text-xl text-granite">{stop.name}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{stop.summary}</p>
    </Link>
  );
}
