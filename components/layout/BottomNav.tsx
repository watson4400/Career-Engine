"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/journey/", label: "Journey", icon: JourneyIcon },
  { href: "/events/", label: "Events", icon: EventsIcon },
  { href: "/nuggets/", label: "Discover", icon: DiscoverIcon },
  { href: "/tips/", label: "Tips", icon: TipsIcon },
  { href: "/progress/", label: "Progress", icon: ProgressIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-shell/90 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="page-shell grid grid-cols-5 gap-0.5 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const base = href.replace(/\/$/, "");
          const active =
            pathname === href ||
            pathname === base ||
            pathname.startsWith(`${base}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`focus-ring flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.65rem] tracking-wide transition-colors ${
                active
                  ? "text-atlantic-deep"
                  : "text-muted hover:text-granite"
              }`}
            >
              <Icon active={active} />
              <span className={active ? "font-medium" : undefined}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function JourneyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18c3-1 5-5 8-5s5 4 8 5"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="8"
        r="2.2"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function EventsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
      />
      <path
        d="M4 9.5h16M8 3.5v3M16 3.5v3"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="14.5"
        r="1.4"
        fill={active ? "var(--atlantic)" : "currentColor"}
      />
    </svg>
  );
}

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5c2.8 3.2 7 6.4 7 10a7 7 0 1 1-14 0c0-3.6 4.2-6.8 7-10Z"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="13.5"
        r="1.6"
        fill={active ? "var(--atlantic)" : "currentColor"}
      />
    </svg>
  );
}

function TipsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h4l2-6 4 12 2-6h4"
        stroke={active ? "var(--atlantic)" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
