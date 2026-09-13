"use client";

import { useEffect, useState } from "react";

export function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("camino-install-dismissed");
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (!dismissed && !isStandalone) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="mx-auto mb-4 w-full max-w-md rounded-2xl border border-line bg-shell/80 px-4 py-3 text-sm text-muted shadow-[0_8px_30px_rgba(28,36,34,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <p>
          <span className="font-medium text-granite">Add to Home Screen</span>
          {" — "}
          In Safari, tap Share, then{" "}
          <span className="text-granite">Add to Home Screen</span> for an
          offline pocket companion.
        </p>
        <button
          type="button"
          className="focus-ring shrink-0 rounded-full px-2 py-1 text-xs uppercase tracking-wider text-atlantic"
          onClick={() => {
            sessionStorage.setItem("camino-install-dismissed", "1");
            setVisible(false);
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
