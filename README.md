# The Guild

An open-source platform where researchers, engineers, students, and curious minds collaborate on humanity's biggest scientific advancements.

---

## What is The Guild?

The Guild is a living, community-driven hub focused on six of humanity's most important frontiers:

- **Longevity** — Telomerase activation and senolytics (cellular aging)
- **Neurotech** — Brain-machine interfaces and neural prosthetics
- **Regen Med** — In vivo tissue engineering (regenerative medicine)
- **Fusion** — Nuclear fusion (clean energy)
- **Gene Edit** — CRISPR-Cas9 (gene editing)
- **AAGI** — True autonomous artificial general intelligence

This is not a library or framework you install. It is a **platform** — a single shared instance where the community contributes knowledge, ideas, and research together. The codebase is fully open source so anyone can contribute to building and improving it.

### Core Features

| Feature | Description |
|---------|-------------|
| **The Tree** | Visual knowledge graph per advancement. Ideas branch into sub-ideas, color-coded by status: green (proven), red (theoretical), black (disproved). Fuzzy search, node detail pages, lineage breadcrumbs. |
| **The Grand Library** | Curated learning resources — articles, videos, papers, external sources — with version history, difficulty levels, and peer contributions. |
| **The Newsroom** | Aggregated news and papers about each advancement. Community voting (hot/new/top sorting), fuzzy search, link submission. |
| **The Pool** | Community-funded treasury. Maintenance first, remainder funds contributors and experiments. |
| **Discussions** | Threaded conversations scoped to each advancement with pagination, editing, and deletion. |
| **Notifications** | Real-time notification bell for replies, supports, vouches, flags, and rep changes. |
| **Bookmarks** | Save nodes, library entries, news links, and discussion threads for later. |
| **Moderation** | Community flagging system with admin review panel. Content flags with reason categories and resolution workflow. |
| **Reputation System** | Merit-based point system. Earn Rep through school email verification, vouches, contributions, and breakthroughs. Rate-limited writes prevent abuse. |

### Reputation Ladder

| Rep Range | Tier | Access |
|-----------|------|--------|
| 0-99 | Observer | Read access, supervised small contributions |
| 100-2,999 | Contributor | Full contributions, ideas, Discord, voting |
| 3,000+ | Moderator | Moderation tools, governance votes |

---

## Contributing

The Guild is built by its community. Whether you're fixing a bug, adding a feature, improving accessibility, or writing tests — all contributions matter.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide. Here's the short version:

1. Pick an issue or propose a change
2. Clone the repo and set up your local environment (see below)
3. Write tests for new functionality (we practice TDD)
4. Ensure `bun run lint` and `bun run test:run` pass
5. Open a pull request against `master`

See the [open issues](https://github.com/deadfighter10/TheGuild/issues) for areas where help is needed.

---

## Development Setup

To contribute code, you'll need a local development environment.

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) (recommended) or npm
- [Firebase CLI](https://firebase.google.com/docs/cli) (for local development with emulators)

### Getting the Code

```bash
git clone https://github.com/deadfighter10/TheGuild.git
cd the-guild
bun install
cp .env.example .env.local
```

### Running Locally

The app uses Firebase for authentication and Firestore for data. For local development, use the Firebase Emulators — no real Firebase project needed:

```bash
# Start emulators + dev server together
bun run dev:local

# Or start them separately:
bun run emulators    # Terminal 1
bun run dev          # Terminal 2
```

Add `VITE_USE_EMULATORS=true` to your `.env.local` when using emulators.

If you need to connect to a real Firebase project instead, see [Firebase Configuration](#firebase-configuration) below.

### Commands

```bash
bun run dev          # Start dev server (http://localhost:5173)
bun run build        # Type-check + production build
bun run preview      # Preview production build
bun run test         # Run tests in watch mode
bun run test:run     # Run tests once
bun run lint         # Type-check without emitting
```

---

## Project Structure

```
src/
├── domain/              # Business logic, types, and validation
│   ├── advancement.ts   # Advancement definitions and themes
│   ├── node.ts          # Tree node types and validation
│   ├── reputation.ts    # Rep thresholds and gate functions
│   ├── user.ts          # User types and tier logic
│   ├── notification.ts  # Notification types and formatting
│   ├── flag.ts          # Content flag types and validation
│   ├── news-link.ts     # News link types and validation
│   ├── discussion.ts    # Discussion types and validation
│   ├── library-entry.ts # Library entry types and validation
│   ├── bookmark.ts      # Bookmark types
│   └── *.test.ts        # Co-located domain tests
├── features/            # Feature modules (UI + services)
│   ├── admin/           # Admin panel (CRUD for all content)
│   ├── advancements/    # Advancement browsing and detail pages
│   ├── auth/            # Authentication (Firebase Auth)
│   ├── bookmarks/       # Content bookmarking
│   ├── discussions/     # Threaded discussions per advancement
│   ├── globe/           # 3D globe visualization (Three.js)
│   ├── home/            # Landing page and dashboard
│   ├── library/         # Grand Library (curated resources + versioning)
│   ├── moderation/      # Content flagging and moderation
│   ├── newsroom/        # News link aggregation and voting
│   ├── notifications/   # Notification bell and service
│   ├── onboarding/      # New user onboarding flow
│   ├── pool/            # The Pool (community treasury)
│   ├── profile/         # User profile and settings
│   ├── tree/            # The Tree (knowledge graph + node detail)
│   └── vouch/           # Vouch system for Rep
├── shared/              # Shared components and utilities
│   ├── components/      # Layout, Icons, Toast, RepGate, Markdown, etc.
│   ├── hooks/           # Reusable hooks (useSearch, useFocusTrap, useRealtimeQuery)
│   └── utils/           # Utility functions (timeAgo, etc.)
├── lib/                 # External service configuration
│   ├── firebase.ts      # Firebase initialization
│   ├── firestore-schemas.ts  # Zod schemas for Firestore document validation
│   └── rate-limit.ts    # Rate limiting (hourly/daily counters)
├── App.tsx              # Route configuration (lazy-loaded pages)
├── main.tsx             # Entry point
└── index.css            # Tailwind base + custom styles
```

### Architecture

- **`domain/`** contains pure business logic with no framework dependencies. All validation functions are tested independently.
- **`features/`** are self-contained modules. Each has its own components, service layer (Firestore calls), and page components.
- **`shared/`** holds reusable UI components, custom hooks, and utility functions used across features.
- **`lib/`** contains external service configuration, Zod schemas for Firestore document validation at read boundaries, and rate limiting.
- Routes are lazy-loaded with `React.lazy` for code splitting.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Language | TypeScript 5.7 (strict mode, all flags enabled) |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Backend | Firebase (Auth + Firestore + Cloud Functions) |
| Validation | Zod 4 (Firestore read boundaries) |
| Search | Fuse.js 7 (client-side fuzzy search) |
| 3D | Three.js + React Three Fiber |
| Testing | Vitest + Testing Library (370+ tests) |
| CI/CD | GitHub Actions (lint, test, build, deploy) |
| Runtime | Bun (also works with Node.js + npm) |

---

## CI/CD

Every push to `master` triggers the GitHub Actions pipeline:

1. **Type-check** — `tsc --noEmit`
2. **Tests** — `vitest run` (370+ tests)
3. **Build** — Vite production build + Cloud Functions build
4. **Deploy** — Firebase Hosting, Firestore rules, and Cloud Functions

Pull requests run steps 1-3 automatically. Deployment only happens on merge to `master`.

---

## License

[MIT](LICENSE)
