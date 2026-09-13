import Link from "next/link";
import { InstallHint } from "@/components/InstallHint";
import { FadeIn } from "@/components/Motion";
import { ScallopMark } from "@/components/ScallopMark";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden atmosphere-deep">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 topo-noise mix-blend-soft-light"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-granite/50 to-transparent"
        aria-hidden
      />
      <EstuarySilhouette />
      <div className="page-shell relative flex min-h-dvh flex-col justify-end page-pad">
        <FadeIn>
          <div className="mb-8 flex items-center gap-3 text-shell/80">
            <ScallopMark tone="light" />
            <span className="text-[0.75rem] uppercase tracking-[0.28em]">
              The English Way
            </span>
          </div>
          <h1 className="font-display text-[clamp(3.5rem,14vw,5.5rem)] leading-[0.9] text-shell">
            Camiño
          </h1>
          <p className="mt-5 max-w-[18rem] text-base leading-relaxed text-mist/90">
            Ferrol to Santiago — stages, sights, and stories in your pocket.
          </p>
          <div className="mt-10">
            <Link
              href="/journey/"
              className="focus-ring inline-flex items-center gap-3 rounded-full bg-shell px-6 py-3.5 text-sm font-medium tracking-wide text-atlantic-deep transition hover:bg-mist"
            >
              Begin the journey
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="mt-8">
            <InstallHint />
          </div>
        </FadeIn>
      </div>
    </main>
  );
}

function EstuarySilhouette() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-[18%] h-[42%] w-full text-atlantic/30"
      viewBox="0 0 400 180"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0 120C40 100 70 70 110 75c50 6 60 40 110 38 40-2 55-30 90-28 40 2 55 30 90 20v75H0V120Z"
        opacity="0.35"
      />
      <path
        fill="currentColor"
        d="M0 140c55-18 85-8 130-20 55-14 70 10 120 6 45-4 60-24 95-18 30 5 40 18 55 16v56H0v-40Z"
        opacity="0.55"
      />
      <path
        stroke="rgba(247,244,239,0.35)"
        strokeWidth="1.5"
        fill="none"
        d="M20 150c40-8 70-30 110-28s70 28 120 22 80-26 130-18"
      />
    </svg>
  );
}
