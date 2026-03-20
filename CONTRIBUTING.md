# Contributing to The Guild

Thank you for your interest in contributing. This document explains how to get started, what we expect from contributions, and how the development process works.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and inclusive.

## Getting Started

1. **Fork** the repository and clone your fork
2. **Install dependencies**: `bun install`
3. **Set up environment**: `cp .env.example .env.local`
4. **Start emulators + dev server**: `bun run dev:local`

See [README.md](README.md) for detailed setup instructions.

## Development Principles

### Test-Driven Development

We practice TDD. The workflow is:

1. **RED** — Write a failing test that describes the behavior you want
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up while keeping tests green

Every pull request with new functionality should include tests. Domain logic (`src/domain/`) must be tested.

### TypeScript Strict Mode

The project uses TypeScript with all strict flags enabled:

- No `any` types — use `unknown` if the type is truly unknown
- No type assertions (`as`) without strong justification
- All data structures use `readonly` properties
- Prefer `type` over `interface` for data, reserve `interface` for behavior contracts

### Code Style

- **Functional programming**: Immutable data, pure functions, no mutation
- **Self-documenting code**: No comments unless the logic is genuinely non-obvious
- **Early returns** over nested conditionals
- **Array methods** (`map`, `filter`, `reduce`) over imperative loops

### Data Validation

- Use **Zod schemas** at Firestore read boundaries to validate incoming data
- All Firestore document reads go through `parse*Doc` functions in `src/lib/firestore-schemas.ts`
- Domain types are defined in `src/domain/`, schemas derive from them
- Never use `as` type assertions for Firestore data — always validate with a schema parser

## How to Contribute

### Reporting Bugs

Open an issue using the **Bug Report** template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots if relevant

### Suggesting Features

Open an issue using the **Feature Request** template. Describe:

- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

### Submitting Code

1. Create a branch from `master`: `git checkout -b feat/your-feature`
2. Make your changes following the principles above
3. Ensure all checks pass:
   ```bash
   bun run lint       # Type-check
   bun run test:run   # Unit/integration tests (577 tests)
   bun run test:rules # Firestore rules tests (requires emulators running)
   bun run build      # Production build
   ```
4. Write a clear commit message describing what and why
5. Push and open a pull request against `master`

### Pull Request Guidelines

- **Keep PRs focused** — one feature or fix per PR
- **Write a clear description** — explain what changed and why
- **Include tests** for new behavior
- **Update types** if you change data structures
- **Don't include unrelated changes** — formatting fixes, refactors, or other cleanup should be separate PRs

## Project Structure

```
src/
├── domain/           # Pure business logic and types (no React, no Firebase)
├── features/         # Feature modules (components + service layer)
│   ├── achievements/ # Achievement badges and awarding
│   ├── admin/        # Admin panel (users, flags, audit, analytics)
│   ├── advancements/ # The six advancement areas
│   ├── analytics/    # Platform analytics dashboard
│   ├── auth/         # Authentication (Firebase Auth)
│   ├── bookmarks/    # Content bookmarking
│   ├── collaboration/ # Co-authorship management
│   ├── discussions/  # Threaded discussions per advancement
│   ├── globe/        # 3D globe visualization (Three.js)
│   ├── home/         # Landing page and user dashboard
│   ├── library/      # Grand Library (resources + versioning)
│   ├── moderation/   # Content flagging and moderation
│   ├── newsroom/     # News aggregation + voting
│   ├── notifications/ # Notification bell and service
│   ├── onboarding/   # New user onboarding flow
│   ├── peer-review/  # Peer review queue and submission
│   ├── pool/         # The Pool (community treasury — placeholder)
│   ├── profile/      # User profile and public profiles
│   ├── spotlight/    # Spotlight nominations and voting
│   ├── stats/        # Contribution streaks and heatmap
│   ├── tree/         # The Tree (knowledge graph + node detail)
│   └── vouch/        # Vouch system for Rep
├── shared/           # Reusable UI components, hooks, and utilities
│   ├── components/   # Layout, Toast, RepGate, Markdown, EmptyState, etc.
│   ├── hooks/        # useSearch, useFocusTrap, useRealtimeQuery, usePageView, etc.
│   └── utils/        # timeAgo, etc.
└── lib/              # External service configuration + schemas
    ├── firebase.ts        # Firebase initialization + App Check
    ├── firestore-schemas.ts # Zod document validators
    └── rate-limit.ts      # Rate limiting logic (hourly/daily counters)

functions/src/        # Cloud Functions (Admin SDK)
└── index.ts          # Admin ops, email verification, rate limiting, session management
```

- **`domain/`** is framework-agnostic. It should never import React or Firebase.
- **`features/`** each own their UI and data access. Cross-feature imports are allowed for shared services (e.g., `notification-service` is called by `peer-review-service`), but prefer going through domain types when possible.
- **`shared/`** components, hooks, and utilities are generic and reusable.
- **`lib/`** holds Firebase config, Zod schemas for Firestore reads, and rate limiting.

## Questions?

Open a discussion or issue. We're happy to help contributors get oriented.
