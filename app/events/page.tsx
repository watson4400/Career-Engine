import type { Metadata } from "next";
import { EventsBrowser } from "@/components/EventsBrowser";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <main className="atmosphere topo-noise min-h-dvh">
      <div className="page-shell page-pad">
        <EventsBrowser />
      </div>
    </main>
  );
}
