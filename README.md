# The Guild

An open hub for contributors working on humanity's biggest scientific advancements.

Built with React 19, TypeScript (strict mode), Firebase, Tailwind CSS, and Three.js.

---

## What is The Guild?

The Guild is a platform where researchers, engineers, students, and curious minds collaborate on six of humanity's most important frontiers:

- **Longevity** — Telomerase activation and senolytics (cellular aging)
- **Neurotech** — Brain-machine interfaces and neural prosthetics
- **Regen Med** — In vivo tissue engineering (regenerative medicine)
- **Fusion** — Nuclear fusion (clean energy)
- **Gene Edit** — CRISPR-Cas9 (gene editing)
- **AAGI** — True autonomous artificial general intelligence

### Core Features

| Feature | Description |
|---------|-------------|
| **The Tree** | Visual knowledge graph per advancement. Ideas branch into sub-ideas, color-coded by status: green (proven), red (theoretical), black (disproved). |
| **The Grand Library** | Curated learning resources — articles, videos, papers, external sources — to catch up to the cutting edge. |
| **The Newsroom** | Aggregated news and papers about each advancement from real-world sources and hub discoveries. |
| **The Pool** | Community-funded treasury. Maintenance first, remainder funds contributors and experiments. |
| **Discussions** | Threaded conversations scoped to each advancement. |
| **Reputation System** | Merit-based point system. Earn Rep through school email verification, vouches, contributions, and breakthroughs. |

### Reputation Ladder

| Rep Range | Tier | Access |
|-----------|------|--------|
| 0–99 | Observer | Read access, supervised small contributions |
| 100–2,999 | Contributor | Full contributions, ideas, Discord, voting |
| 3,000+ | Moderator | Moderation tools, governance votes |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) (recommended) or npm
- [Firebase CLI](https://firebase.google.com/docs/cli) (for local development with emulators)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/the-guild.git
cd the-guild

# Install dependencies
bun install    # or: npm install

# Copy environment config
cp .env.example .env.local
```

### Firebase Configuration

The app uses Firebase for authentication and Firestore for data. You have two options:

**Option A: Use Firebase Emulators (recommended for development)**

No real Firebase project needed. The emulators run locally:

```bash
# Start emulators + dev server together
bun run dev:local

# Or start them separately:
bun run emulators    # Terminal 1
bun run dev          # Terminal 2
```

Add `VITE_USE_EMULATORS=true` to your `.env.local` when using emulators.

**Option B: Use a real Firebase project**

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password provider)
3. Create a Firestore database
4. Copy your config values into `.env.local`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Development

```bash
bun run dev          # Start dev server (http://localhost:5173)
bun run build        # Type-check + production build
bun run preview      # Preview production build
bun run test         # Run tests in watch mode
bun run test:run     # Run tests once
bun run lint         # Type-check without emitting
```

### Deployment

Pushing to `main` automatically deploys to Firebase Hosting via GitHub Actions.

To set this up on your fork:

1. In your Firebase project, go to **Project Settings > Service accounts**
2. Click **Generate new private key** to download a JSON key file
3. In your GitHub repo, go to **Settings > Secrets and variables > Actions**
4. Add these repository secrets:

| Secret | Value |
|--------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | Entire JSON key file contents |
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `my-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | e.g. `my-project-abc123` |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `my-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

Every push to `main` will: type-check, test, build, then deploy hosting + Firestore rules.

---

## Project Structure

```
src/
├── domain/              # Business logic, types, and validation
│   ├── advancement.ts   # Advancement definitions
│   ├── node.ts          # Tree node types and validation
│   ├── reputation.ts    # Rep thresholds and gate functions
│   ├── user.ts          # User types and tier logic
│   └── *.test.ts        # Co-located domain tests
├── features/            # Feature modules (UI + services)
│   ├── admin/           # Admin panel (CRUD for all content)
│   ├── advancements/    # Advancement browsing and detail pages
│   ├── auth/            # Authentication (Firebase Auth)
│   ├── discussions/     # Threaded discussions per advancement
│   ├── globe/           # 3D globe visualization (Three.js)
│   ├── home/            # Landing page and dashboard
│   ├── library/         # Grand Library (curated resources)
│   ├── newsroom/        # News link aggregation and voting
│   ├── onboarding/      # New user onboarding flow
│   ├── pool/            # The Pool (community treasury)
│   ├── profile/         # User profile and settings
│   ├── tree/            # The Tree (knowledge graph)
│   └── vouch/           # Vouch system for Rep
├── shared/              # Shared components and utilities
│   └── components/      # Layout, Icons, ErrorBoundary, etc.
├── lib/                 # External service configuration
│   └── firebase.ts      # Firebase initialization
├── App.tsx              # Route configuration
├── main.tsx             # Entry point
└── index.css            # Tailwind base + custom styles
```

### Architecture

- **`domain/`** contains pure business logic with no framework dependencies. All validation functions are tested independently.
- **`features/`** are self-contained modules. Each has its own components, service layer (Firestore calls), and page components.
- **`shared/`** holds reusable UI components used across features.
- Routes are lazy-loaded with `React.lazy` for code splitting.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Language | TypeScript 5.7 (strict mode, all flags enabled) |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Backend | Firebase (Auth + Firestore) |
| 3D | Three.js + React Three Fiber |
| Testing | Vitest + Testing Library |
| Runtime | Bun (also works with Node.js + npm) |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

Quick version:

1. Fork the repo and create a branch from `main`
2. Write tests for new functionality
3. Ensure `bun run lint` and `bun run test:run` pass
4. Submit a pull request

See the [open issues](https://github.com/your-username/the-guild/issues) for areas where help is needed.

---

## License

[MIT](LICENSE)
