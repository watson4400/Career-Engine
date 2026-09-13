import Link from "next/link";
import { difficultyLabel, formatKm } from "@/lib/labels";
import type { Stage } from "@/content";

export function StageRow({
  stage,
  complete,
  current,
}: {
  stage: Stage;
  complete?: boolean;
  current?: boolean;
}) {
  return (
    <Link
      href={`/stages/${stage.slug}/`}
      className={`focus-ring group block border-b border-line py-5 transition-colors ${
        current ? "bg-atlantic/10" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl text-atlantic tabular-nums">
            {String(stage.number).padStart(2, "0")}
          </span>
          <div>
            <p className="text-lg text-granite group-hover:text-atlantic-deep">
              {stage.from}
              <span className="mx-2 text-muted">→</span>
              {stage.to}
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatKm(stage.distanceKm)} · {difficultyLabel(stage.difficulty)}
              {complete ? " · walked" : ""}
            </p>
          </div>
        </div>
        <span className="text-ochre-deep transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
        {stage.highlight}
      </p>
    </Link>
  );
}
