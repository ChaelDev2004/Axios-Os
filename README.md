# Chael Dev Portfolio — Next.js / React

Modern portfolio migrated from the original single-page `index.html` to **Next.js 15** with **React 19** and **TypeScript**.

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** React 19
- **Animations:** GSAP + ScrollTrigger
- **Smooth scroll:** Lenis
- **3D background:** Three.js
- **Styling:** Global CSS (ported from original design)

## Features preserved

- Three.js loading screen with progress bar
- Sticky hero scroll reveal
- Ink-reveal hero image on hover
- Particle background
- Custom cursor
- GSAP hero entrance timeline (image → nav → content → bio)
- Scroll-triggered section animations
- Side drawer / commission form
- Floating tech stack section
- Footer marquee

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/              # Next.js layout & page
├── components/       # React UI components
├── context/          # Portfolio state (loading, drawer)
├── hooks/            # GSAP hero & scroll effects
└── lib/              # Constants
```

## Legacy

The original static site is preserved as `index.legacy.html`.
