# Camiño — Camino Inglés Experience

An offline-ready Progressive Web App for walking the **Camino Inglés** from Ferrol to Santiago de Compostela. Stage guides, places to visit, practical tips, and historical nuggets — designed for iPhone Home Screen use on the trail.

## Features

- Six classic stages (Ferrol → Santiago)
- Stops with atmosphere, history, and practical notes
- Town events: festivals, patron feasts, romerías, and food celebrations
- Tips (credential, footing, weather, food, gear, etiquette)
- Historical nuggets and curiosities
- Local progress tracking and day notes (on-device only)
- Installable PWA with offline caching after first visit

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
```

Static files are emitted to `out/`. Serve that folder with any static host.

HTTPS is required for reliable service-worker / Add to Home Screen behaviour on iPhone (localhost is fine for development).

## Install on iPhone

1. Open the deployed site in **Safari**.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Launch **Camiño** from your home screen.
5. After the first load, core pages remain available offline.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Static export (`output: "export"`)
- Framer Motion for path / entrance motion
- Zod-validated content modules
- Custom service worker (`public/sw.js`)

## Content

Curated route data lives in `content/` (`stages.ts`, `stops.ts`, `events.ts`, `tips.ts`, `nuggets.ts`).
