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

1. Create a branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes following the principles above
3. Ensure all checks pass:
   ```bash
   bun run lint       # Type-check
   bun run test:run   # Tests
   bun run build      # Production build
   ```
4. Write a clear commit message describing what and why
5. Push and open a pull request against `main`

### Pull Request Guidelines

- **Keep PRs focused** — one feature or fix per PR
- **Write a clear description** — explain what changed and why
- **Include tests** for new behavior
- **Update types** if you change data structures
- **Don't include unrelated changes** — formatting fixes, refactors, or other cleanup should be separate PRs

## Project Structure

```
src/
├── domain/        # Pure business logic and types (no React, no Firebase)
├── features/      # Feature modules (components + service layer)
├── shared/        # Reusable UI components
└── lib/           # External service configuration
```

- **`domain/`** is framework-agnostic. It should never import React or Firebase.
- **`features/`** each own their UI and data access. Don't import across feature boundaries except through domain types.
- **`shared/`** components are generic and reusable.

## Questions?

Open a discussion or issue. We're happy to help contributors get oriented.
