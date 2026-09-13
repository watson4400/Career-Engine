"use client";

import { useProgress } from "@/components/ProgressProvider";

export function StageActions({ stageId }: { stageId: string }) {
  const { ready, isComplete, setCurrent, toggleComplete } = useProgress();

  if (!ready) return <div className="mt-8 h-12" aria-hidden />;

  const complete = isComplete(stageId);

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => setCurrent(stageId)}
        className="focus-ring rounded-full border border-line bg-shell px-4 py-2.5 text-sm text-granite transition hover:border-atlantic/40"
      >
        Set as today
      </button>
      <button
        type="button"
        onClick={() => toggleComplete(stageId)}
        className={`focus-ring rounded-full px-4 py-2.5 text-sm transition ${
          complete
            ? "bg-atlantic text-shell"
            : "border border-atlantic/30 text-atlantic-deep hover:bg-atlantic hover:text-shell"
        }`}
      >
        {complete ? "Marked walked" : "Mark as walked"}
      </button>
    </div>
  );
}
