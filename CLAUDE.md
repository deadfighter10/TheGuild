# The Guild — Development Guidelines for Claude

> **About this file (v3.0.0):** Project context + development principles. Always loaded into context.

## Project Overview

**The Guild** is a fully open hub for contributors working on humanity's biggest advancements:
- Telomerase Activation and Senolytics (Cellular Aging)
- Brain-Machine Interfaces and Neural Prosthetics
- In Vivo Tissue Engineering (Regenerative Medicine)
- Nuclear Fusion (Clean Energy)
- CRISPR-Cas9 (Gene Editing)
- True AAGI (Autonomous Artificial General Intelligence)

### Key Domain Concepts

- **Rep (Reputation Points)**: Point system starting at 0. Earned via school email verification (100), vouches (100), successful ideas (variable), breakthroughs (500). Lost by rule-breaking, uploading junk, trolling. Negative Rep = temp ban.
- **Rep Ladder**: 0–99 Observer (read + supervised small contributions), 100–2999 Contributor (full contributions, ideas, voting), 3000+ Moderator (moderation tools, peer review, governance).
- **The Tree**: Visual knowledge graph per Advancement. Nodes = ideas, subnodes = builds on ideas. Green = proven/peer-reviewed, Red = theoretical/unproven, Black = disproved. Fuzzy search, node detail pages, lineage breadcrumbs.
- **The Grand Library**: Curated learning resources — articles, videos, papers — with version history, difficulty levels, and peer contributions.
- **The Newsroom**: Aggregated news and papers about the Advancements. Community voting (hot/new/top), fuzzy search, link submission.
- **Discussions**: Threaded conversations scoped to each advancement with pagination, editing, and deletion.
- **Peer Review**: Formal review queue for Tree nodes and Library entries. Structured feedback with multi-stage workflow.
- **Achievements**: 13 badges across milestone, advancement, and special categories.
- **Spotlights**: Community-nominated "Idea of the Week" per advancement. Weekly rotation, vote-driven.
- **Co-Authorship**: Invite collaborators to co-author Tree nodes or Library entries.
- **Contribution Streaks**: GitHub-style heatmap of daily contributions across all content types.
- **Analytics**: Privacy-first page view tracking (no cookies, no PII). Admin dashboard with trends, growth, and moderation health.
- **Notifications**: Real-time notification bell for replies, supports, vouches, flags, rep changes, and peer review updates.
- **Moderation**: Community flagging system with admin review panel and resolution workflow.

#### Future Phases (not yet built)

- **The Dojo**: Academic learning environment built on the Grand Library + mentoring.
- **The Pool**: Donation-funded treasury for community experiments and contributors.
- **The Launchpad**: Integration layer connecting to GitHub, Notion, Obsidian, etc. External contributions earn Rep.
- **The Data Vault**: Open dataset repository with peer review and falsification penalties.

### Architecture Notes

- **Backend**: Firebase Auth + Firestore + Cloud Functions v2 + Hosting
- **Firestore rules**: `firestore.rules` — default-deny, ownership checks, Rep-gated writes, input length limits
- **Cloud Functions**: `functions/src/index.ts` — 8 functions for admin ops, email verification, rate limiting, session management
- **Zod validation**: All Firestore reads go through `parse*Doc` functions in `src/lib/firestore-schemas.ts`
- **Rate limiting**: Dual-layer — client-side hourly/daily checks (`src/lib/rate-limit.ts`) + Firestore rules 10s minimum interval
- **Page views**: Anonymous tracking with localStorage-based rate limiting (120/hour), no PII
- **20 Firestore collections**, 14 service modules, 57 test files, 577 tests

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production code must be written in response to a failing test. No exceptions. This is not a suggestion or a preference - it is the fundamental practice that enables all other principles in this document.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state throughout development.

## Quick Reference

**Key Principles:**

- Write tests first (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

**Preferred Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Vitest (prefer Browser Mode for UI tests) + Testing Library
- **State Management**: Prefer immutable patterns

## Testing Principles

**Core principle**: Test behavior, not implementation. 100% coverage through business behavior.

**Quick reference:**
- Write tests first (TDD non-negotiable)
- Test through public API exclusively
- Use factory functions for test data (no `let`/`beforeEach`)
- Tests must document expected business behavior
- No 1:1 mapping between test files and implementation files

For detailed testing patterns and examples, load the `testing` skill.
For verifying test effectiveness through mutation analysis, load the `mutation-testing` skill.

## TypeScript Guidelines

**Core principle**: Strict mode always. Schema-first at trust boundaries, types for internal logic.

**Quick reference:**
- No `any` types - ever (use `unknown` if type truly unknown)
- No type assertions without justification
- Prefer `type` over `interface` for data structures
- Reserve `interface` for behavior contracts only
- Define schemas first, derive types from them (Zod/Standard Schema)
- Use schemas at trust boundaries, plain types for internal logic

For detailed TypeScript patterns and rationale, load the `typescript-strict` skill.

## Code Style

**Core principle**: Functional programming with immutable data. Self-documenting code.

**Quick reference:**
- No data mutation - immutable data structures only
- Pure functions wherever possible
- No nested if/else - use early returns or composition
- No comments - code should be self-documenting
- Prefer options objects over positional parameters
- Use array methods (`map`, `filter`, `reduce`) over loops

For detailed patterns and examples, load the `functional` skill.

## Development Workflow

**Core principle**: RED-GREEN-REFACTOR in small, known-good increments. TDD is the fundamental practice.

**Quick reference:**
- RED: Write failing test first (NO production code without failing test)
- GREEN: Write MINIMUM code to pass test
- REFACTOR: Assess improvement opportunities (only refactor if adds value)
- **Wait for commit approval** before every commit
- Each increment leaves codebase in working state
  For detailed TDD workflow, load the `tdd` skill.
  For refactoring methodology, load the `refactoring` skill.
  For significant work, load the `planning` skill. Plans live in `plans/` directory.
  For CI failure diagnosis, load the `ci-debugging` skill.
  For hexagonal architecture projects, load the `hexagonal-architecture` skill.
  For Domain-Driven Design projects, load the `domain-driven-design` skill.

**Project onboarding:** Run `/setup` in any new project to detect its tech stack and generate project-level CLAUDE.md, hooks, commands, and PR review agent in one shot. This replaces the need for `/init`.

**Project-level hooks:** Projects should add a PostToolUse hook in `.claude/settings.json` to run typecheck after Write/Edit on .ts/.tsx files. Use `/setup` to generate this automatically, or see the global `settings.json` prettier/eslint hook as a template.

## Output Guardrails

- **Write to files, not chat** — When asked to produce a plan, document, or artifact, always persist it to a file. You may also present it inline for approval, but the file is the source of truth.
- **Plan-only mode** — When asked for a plan, design, or document only, produce ONLY that artifact. Do not write production code, test code, or make any implementation changes unless explicitly asked.
- **Incremental output** — When exploring a codebase, produce a first draft of output within 3-4 tool calls. Refine iteratively rather than front-loading all exploration before producing anything.

## Working with Claude

**Core principle**: Think deeply, follow TDD strictly, capture learnings while context is fresh.

**Quick reference:**
- ALWAYS FOLLOW TDD - no production code without failing test
- Assess refactoring after every green (but only if adds value)
- Update CLAUDE.md when introducing meaningful changes
- Ask "What do I wish I'd known at the start?" after significant changes
- Document gotchas, patterns, decisions, edge cases while context is fresh

For detailed TDD workflow, load the `tdd` skill.
For refactoring methodology, load the `refactoring` skill.
For detailed guidance on expectations and documentation, load the `expectations` skill.

## Browser Automation

Prefer `agent-browser` for web automation. If it is not installed, fall back to other available tools (e.g. `WebFetch`, `curl`, or MCP browser tools). Always try `agent-browser` first.

`agent-browser` core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

Run `agent-browser --help` for all commands.

## Resources and References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)

## Summary

The key is to write clean, testable, functional code that evolves through small, safe increments. Every change should be driven by a test that describes the desired behavior, and the implementation should be the simplest thing that makes that test pass. When in doubt, favor simplicity and readability over cleverness.