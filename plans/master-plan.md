# The Guild — Master Plan

> Single source of truth for architecture, completed work, security posture, and roadmap.
> Last revised: 2026-03-20.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Completed Work](#completed-work)
4. [Security Posture](#security-posture)
5. [Immediate Work — Security Hardening](#immediate-work--security-hardening)
6. [Sprint 4: Platform Maturity](#sprint-4-platform-maturity)
7. [Sprint 5: Production Stabilization](#sprint-5-production-stabilization)
8. [Sprint 6: The Bounty Board](#sprint-6-the-bounty-board)
9. [Backlog](#backlog)
10. [Future Phases](#future-phases)
11. [Progress Summary](#progress-summary)

---

## Project Overview

**The Guild** is a fully open hub for contributors working on humanity's biggest advancements. The codebase is open source — the platform is a single shared instance, not a library.

### The Six Advancements

| ID | Short Name | Full Name |
|----|------------|-----------|
| `telomerase` | Longevity | Telomerase Activation and Senolytics (Cellular Aging) |
| `bci` | Neurotech | Brain-Machine Interfaces and Neural Prosthetics |
| `tissue-engineering` | Regen Med | In Vivo Tissue Engineering (Regenerative Medicine) |
| `fusion` | Fusion | Nuclear Fusion (Clean Energy) |
| `crispr` | Gene Edit | CRISPR-Cas9 (Gene Editing) |
| `aagi` | AAGI | True Autonomous Artificial General Intelligence |

### Core Platform Pillars

| Pillar | Purpose | Rep Gate |
|--------|---------|----------|
| **The Tree** | Visual knowledge graph per advancement — ideas branch into sub-ideas, status-tracked (theoretical → proven / disproved) | 100+ to create |
| **The Grand Library** | Curated learning resources with difficulty levels, version history, and markdown content | 1500+ to create |
| **The Newsroom** | Community-submitted news links per advancement with voting and sorting | 100+ to submit |
| **Discussions** | Threaded conversations per advancement | 100+ to post |
| **The Bounty Board** | Public wall of community-posted tasks with rep rewards for completion | Planned (Sprint 6) |
| **The Pool** | Community-funded treasury (placeholder page exists at `/pool`) | Future |
| **The Dojo** | Structured learning paths built on Library entries | Future |

### Reputation System

> **Current implementation** uses the simple 4-tier model below. A comprehensive revision is designed in `plans/reputation-system-revision.md` (11 tiers, supervised queue, breadth bonuses, decay, anti-gaming) — not yet implemented. The Bounty Board (`plans/bounty-system.md`) is designed against the revised system but can be built on either.

#### Current (Implemented)

| Range | Tier | Access |
|-------|------|--------|
| `-1` | Admin | Full platform access, admin panel, Cloud Function privileges |
| `0–99` | Observer | Read-only + supervised small contributions |
| `100–2999` | Contributor | Full contributor: create ideas, discussions, news links, Discord |
| `3000+` | Moderator | Moderate content, resolve flags, claim peer reviews |

**Rep sources:** School email verification (+100 via Cloud Function), vouches (+100), idea supports (+10), breakthroughs (+500 future), Google Scholar citations (future).
**Rep sinks:** Rule-breaking, junk uploads, trolling. Negative rep = temp ban.

#### Planned Revision (Design Complete)

Four phases, 11 tiers: Newcomer (0) → Apprentice (33) → Initiate (333) → Contributor (1,333) → Established (6,333) → Scholar (9,333) → Curator (13,333) → Mentor (21,333) → Reviewer (25,333) → Senior (29,333) → Moderator (33,333). Supervised content queue for pre-Core users, diminishing returns per content item, quality multipliers on peer-reviewed work, inactivity decay, breadth bonuses, and comprehensive anti-gaming (sybil detection, vote rings, farming patterns).

Full design: `plans/reputation-system-revision.md`

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript (strict mode), Vite 6 |
| Styling | Tailwind CSS 3.4 |
| 3D | Three.js via @react-three/fiber + @react-three/drei |
| Backend | Firebase (Auth + Firestore + Cloud Functions v2) |
| Search | Fuse.js (client-side fuzzy search) |
| Validation | Zod 4 (trust boundaries), plain types (internal) |
| Testing | Vitest 2.1, Testing Library, happy-dom/jsdom |
| Runtime | Bun |
| Deployment | Firebase Hosting |
| Fonts | Bricolage Grotesque (display), Sora (body), JetBrains Mono (mono) |

### Project Structure

```
src/
├── domain/           Pure types, validation, business logic (no Firebase imports)
│   ├── achievement.ts, advancement.ts, analytics.ts, bookmark.ts
│   ├── collaborator.ts, contribution-stats.ts, discussion.ts
│   ├── flag.ts, globe-data.ts, library-entry.ts, news-link.ts
│   ├── node.ts, notification.ts, onboarding.ts, peer-review.ts
│   ├── reputation.ts, spotlight.ts, user.ts, vouch.ts
│   └── advancement-theme.ts, pillar-theme.ts, countries.ts
├── features/         Feature modules (service + UI per feature)
│   ├── achievements/   achievement-service, AchievementBadge
│   ├── admin/          admin-service, audit-service, AdminPage
│   ├── analytics/      analytics-service, AnalyticsPanel
│   ├── auth/           AuthContext, AuthForm
│   ├── bookmarks/      bookmark-service, BookmarkButton
│   ├── collaboration/  collaboration-service
│   ├── discussions/    discussion-service, DiscussionForum
│   ├── globe/          globe-service, HeroScene
│   ├── home/           HomePage, Dashboard
│   ├── library/        library-service, LibraryPage, LibraryEntryPage, LibraryEntryForm
│   ├── moderation/     flag-service, FlagButton, FlagsPanel
│   ├── newsroom/       news-service, NewsroomPage, SubmitLinkForm
│   ├── notifications/  notification-service, NotificationBell
│   ├── onboarding/     OnboardingPage
│   ├── peer-review/    peer-review-service, SubmitForReviewButton
│   ├── pool/           PoolPage (placeholder)
│   ├── profile/        user-service, ProfilePage, PublicProfilePage
│   ├── spotlight/      spotlight-service
│   ├── stats/          contribution-stats-service
│   ├── tree/           node-service, TreeView, NodeDetailPage, CreateNodeForm
│   └── vouch/          vouch-service, VouchPanel
├── lib/              Firebase config, Zod schemas, rate limiting, seed data
├── shared/           Reusable components and hooks
│   ├── components/     Layout, Markdown, Toast, Skeleton, RepGate, ErrorBoundary, etc.
│   └── hooks/          use-page-view, use-realtime-query, use-search, use-focus-trap
└── App.tsx           Routes (public, protected, admin, onboarding guards)

functions/src/        Cloud Functions (Admin SDK)
└── index.ts          claimSchoolEmailBonus, setAdminClaim, adminUpdateUserRep,
                      adminDeleteContent, adminUpdateContent, checkContentRateLimit,
                      revokeAllSessions, deleteUserAccount
```

### Codebase Stats

| Metric | Count |
|--------|-------|
| Source files | 188 (.ts/.tsx) |
| Test code | ~9,600 lines |
| Test files | 62 |
| Tests | 641 |
| Domain modules | 19 |
| Service modules | 14 |
| Page components | 14 |
| Shared components | 12 |
| Cloud Functions | 9 |
| Firestore collections | 21 |

### Routing Map

| Path | Component | Guard |
|------|-----------|-------|
| `/` | HomePage | Public |
| `/advancements` | AdvancementsPage | Public |
| `/advancements/:id` | AdvancementDetailPage | Protected |
| `/advancements/:id/tree/:nodeId` | NodeDetailPage | Protected |
| `/library` | LibraryPage | Protected |
| `/library/:id` | LibraryEntryPage | Protected |
| `/newsroom` | NewsroomPage | Protected |
| `/bounties` | BountyBoardPage | Protected |
| `/bounties/new` | CreateBountyPage | Protected |
| `/bounties/:id` | BountyDetailPage | Protected |
| `/pool` | PoolPage | Protected |
| `/auth` | AuthForm | Public (redirects if logged in) |
| `/onboarding` | OnboardingPage | Onboarding (redirects if complete) |
| `/profile` | ProfilePage | Protected |
| `/users/:uid` | PublicProfilePage | Protected |
| `/admin` | AdminPage | Admin |

### Domain Model (Firestore Collections)

```
users/{uid}                  { email, displayName, repPoints, isSchoolEmail, emailVerified, createdAt, onboardingComplete, country, background, interests, bio, photoURL }
advancements/{id}            { name, description }
nodes/{id}                   { advancementId, parentNodeId?, authorId, title, description, status, supportCount, createdAt }
nodeSupports/{id}            { nodeId, userId, createdAt }
vouches/{id}                 { voucherId, voucheeId, createdAt }
libraryEntries/{id}          { advancementId, authorId, title, content, contentType, difficulty, url?, createdAt, updatedAt }
libraryEntryVersions/{id}    { entryId, title, content, contentType, difficulty, editedBy, createdAt }
newsLinks/{id}               { advancementId, submitterId, title, url, score, createdAt }
newsVotes/{userId_linkId}    { newsLinkId, userId, value(+1|-1), createdAt }
discussionThreads/{id}       { advancementId, authorId, authorName, title, body, replyCount, lastActivityAt, createdAt }
discussionReplies/{id}       { threadId, authorId, authorName, body, createdAt }
notifications/{id}           { userId, type, message, link, read, createdAt }
flags/{id}                   { targetCollection, targetId, targetTitle, reporterId, reporterName, reason, details, status, resolvedBy, resolvedAt, createdAt }
auditLog/{id}                { actorId, actorName, action, targetCollection, targetId, details, createdAt }
rateLimits/{userId_coll}     { lastWriteAt }
bookmarks/{id}               { userId, targetCollection, targetId, targetTitle, createdAt }
peerReviews/{id}             { contentType, contentId, contentTitle, advancementId, authorId, authorName, status, reviewerId, reviewerName, feedback, decision, submittedAt, reviewedAt }
achievements/{userId_achId}  { userId, achievementId, earnedAt }
spotlights/{id}              { contentType, contentId, contentTitle, advancementId, authorId, authorName, nominatedBy, nominatorName, votes, weekId, createdAt }
contentCollaborators/{cId_uId} { contentId, contentType, userId, displayName, addedBy, addedAt }
spotlightVotes/{voterId_spotId}  { spotlightId, voterId, createdAt }
pageViews/{id}               { path, timestamp }
bounties/{id}                { posterId, posterName, title, description, advancementId, bountyType, difficulty, rewardAmount, status, deadline, claimWindowDays, currentHunterId, currentHunterName, claimedAt, claimCount, relatedContentIds, isSystemBounty, createdAt, updatedAt }
bountySubmissions/{id}       { bountyId, hunterId, hunterName, summary, contentLinks, externalLinks, revisionNumber, status, rejectionFeedback, submittedAt, reviewedAt }
globeData/{country}          { count }
```

### Cloud Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `claimSchoolEmailBonus` | Grants +100 Rep when school email is verified in Firebase Auth | Authenticated |
| `setAdminClaim` | Sets/removes admin custom claims on a user | Admin |
| `adminUpdateUserRep` | Sets a user's repPoints to a specific value | Admin |
| `adminDeleteContent` | Deletes a doc from an allowlisted collection | Admin |
| `adminUpdateContent` | Updates an allowed field on an allowed collection | Admin |
| `checkContentRateLimit` | Server-side rate limit check (hourly count per collection) | Authenticated |
| `revokeAllSessions` | Revokes all refresh tokens for the caller | Authenticated |
| `migrateAdminStatus` | Auto-migrates legacy admin markers to role-based admin | Authenticated |
| `deleteUserAccount` | Deletes a user from Auth + Firestore | Admin |
| `completeBounty` | Mints rep for hunter + poster bonus on accepted submission | Authenticated (poster) |

### Rate Limits

| Collection | Per Hour | Per Day |
|------------|----------|---------|
| `nodes` | 10 | 30 |
| `discussionThreads` | 5 | 20 |
| `discussionReplies` | 30 | 100 |
| `newsLinks` | 5 | 20 |
| `libraryEntries` | 3 | 10 |
| `flags` | 10 | 30 |
| `peerReviews` | 5 | 15 |
| `bounties` | 5 | 15 |
| `pageViews` (anon) | 120/hr | — |

Rate limiting is dual-layer: client-side checks via `checkRateLimit` + Firestore rules enforce a 10-second minimum interval via `rateLimits/{userId}_{collection}` docs.

### Testing Configuration

- **Unit/integration tests** (`vitest.config.ts`): jsdom environment, excludes `firestore-rules.test.ts`
- **Rules tests** (`vitest.rules.config.ts`): Node environment, requires running Firebase emulators
- **Scripts**: `test` (watch), `test:run` (single run), `test:rules` (rules only), `test:coverage`

### Design Principles

1. **Progressive disclosure** — simple first, depth discovered naturally
2. **Advancement-first architecture** — advancement is the primary organizing unit
3. **Visual identity per pillar** — consistent icon + color everywhere
4. **Two-speed interface** — browsing (newcomers) AND doing (regulars)

**Anti-patterns to avoid:**
- No sidebar nav (sub-hub tabs are enough)
- No tooltips everywhere (inline contextual hints are better)
- No animations for the sake of it (focus on instant feedback)
- No over-personalization (dashboard = your stuff + what's new, not an algorithmic feed)

---

## Completed Work

<details>
<summary>MVP — Phases 1–5.6</summary>

**Phase 1: Project Setup + User System**
- Registration with email (school email detection for bonus Rep)
- Login/logout (session-based auth via Firebase Auth)
- Profile page showing Rep balance and contributions
- Single-account enforcement (email uniqueness)
- Email verification flow with school email bonus via Cloud Function
- Edit profile (bio, interests, country, background, avatar)

**Phase 2: Reputation System**
- Rep balance per user, starting at 0
- School email verification → +100 Rep (via Cloud Function)
- Vouch from existing member with 100+ Rep → +100 Rep
- Idea support → +10 Rep per support
- Rep ladder gates access (observer 0-99, contributor 100+, moderator 3000+)
- Admin flag (repPoints === -1) with Firebase custom claims

**Phase 3: The Tree (Core Feature)**
- Browse advancements (6 top-level categories)
- View idea nodes in a tree structure per advancement
- Create idea nodes (100+ Rep required), create subnodes
- Support/upvote ideas, node status management (theoretical/proven/disproved)
- Search/filter and sort nodes, node editing for authors and moderators

**Phase 4: The Grand Library**
- Browse entries per advancement with difficulty levels
- Create entries (1500+ Rep or admin), entry detail pages
- Markdown rendering, search, version history

**Phase 5: The Newsroom + Sub-Hubs**
- News feed per advancement with submit/vote/sort
- Advancement sub-hub pages with tabbed navigation (Tree / Library / News / Discussions)
- Discussion forum with threads and replies

**Phase 5.6: UX & Navigation Overhaul**
- Command Palette (Cmd+K), context-aware navbar, pillar identity system
- Dashboard for logged-in users, advancement switcher
- Newcomer onramp banners, section headers
- 3D globe hero scene on landing page

</details>

<details>
<summary>Security — S1 through S15 (14/15 complete)</summary>

- S1. Firestore update rules — ownership checks on all writable collections
- S2. Server-side rep validation — Rep gates enforced in Firestore rules
- S3. Admin custom claims — Cloud Functions with `assertAdmin()`, legacy rep fallback
- S4. Markdown XSS fix — `escapeHtml` before regex, `sanitizeUrl` on links
- S5. Email verification — Cloud Function `claimSchoolEmailBonus` with double-claim prevention
- S6. Iframe sandboxing — `sandbox` attribute on YouTube/Docs embeds
- S7. Rate limiting — dual-layer: client-side hourly/daily + Firestore rules 10s interval
- S8. Input length limits — enforced in Firestore rules for all user-writable text fields
- S9. Audit logging — `auditLog` collection, admin-only read/create
- S10. Session management — `revokeAllSessions` Cloud Function
- S12. CSP headers — comprehensive policy in `firebase.json`
- S13. Dependabot / dependency scanning
- S14. Firestore data validation at read boundaries — Zod schemas, `parse*Doc` functions
- S15. Input sanitization audit
- ~~S11. Firebase App Check~~ — code exists, needs ReCaptcha Enterprise key (config only)

</details>

<details>
<summary>Features — P0 through P2 + Sprint 1–2</summary>

- P0-1. Pagination (Library, News, Discussions)
- P0-2. Error feedback with Toasts (ToastProvider + useToast)
- P0-3. Content moderation (flags system — FlagButton, FlagsPanel, flag-service)
- P1-4. Notification system (NotificationBell, real-time unread count)
- P1-5. Real-time updates (onSnapshot subscriptions)
- P1-6. Search improvements (Fuse.js fuzzy search)
- P1-7. Thread & reply editing/deletion
- P1-8. Responsive & mobile polish
- P2-9. Rich text / Markdown editor (MarkdownToolbar with preview)
- P2-10. Public user profiles (PublicProfilePage at `/users/:uid`)
- P2-11. Advancement activity feed
- P2-12. Onboarding improvements (multi-step onboarding wizard)
- P2-13. Dark mode contrast refinements
- P2-14. Loading skeletons (Skeleton component)
- 19\. Content bookmarking (BookmarkButton, bookmark-service)
- 24\. Avatar / profile pictures (UserAvatar, photoURL)
- 26\. Node detail page + lineage breadcrumb
- 27\. Library entry editing + version history (libraryEntryVersions)
- 29\. Fuzzy search (Fuse.js across all content types)

</details>

<details>
<summary>Sprint 3: Collaboration & Engagement — 5 features, 74 tests</summary>

- 34\. **Peer Review Queue** — domain types (PeerReview, ReviewFeedback, 5 statuses, 3 decisions), validation functions (submitForReview, claimReview, submitFeedback), service layer with rate limiting, SubmitForReviewButton modal component, review notifications
- 36\. **Achievements & Badges** — 13 achievements (6 milestone, 6 advancement, 1 special), AchievementBadge component with category-specific styling (cyan/violet/amber), milestone eligibility checker, dedup via composite doc IDs
- 38\. **Spotlight System** — ISO-week-scoped nominations, vote incrementing, domain validation (Rep + ownership checks), spotlight-service with week-filtered queries
- 32\. **Co-Authorship** — Collaborator type, add/remove with composite doc IDs, ownership validation, collaboration-service, notification on add
- 16\. **Contribution Streaks & Stats** — streak calculation (gap detection, same-day dedup), 365-day heatmap data generation, multi-collection aggregation across 5 content types

</details>

<details>
<summary>Platform Analytics — page views, growth, engagement, moderation</summary>

- 45\. **Analytics Dashboard** — admin-only AnalyticsPanel with time range selector (7d/30d/90d/all), overview metric cards, page view time series, user growth chart, content trends by advancement, moderation health (pending/dismissed/actioned counts, avg resolution time)
- **Anonymous page view tracking** — records all visitors (auth + anonymous), localStorage-based rate limit (120/hour) for unauthenticated users, authenticated users bypass limit
- **Privacy-first**: no cookies, no fingerprinting, no user ID or IP in page view documents

</details>

<details>
<summary>Technical Debt & Quality — Sprint 1</summary>

- T1. Extract shared `timeAgo` utility (8 tests)
- T3. Replace silent error catches (11 fixed)
- T4. `useCallback`/`useMemo` coverage
- T5. Lazy-load heavy components (all pages use `React.lazy`)
- TEST-1. Service layer test coverage (14 service modules, 65+ tests)
- TEST-2. Component integration tests (37 tests)
- TEST-3. Firestore rules tests (33 tests, separate vitest config)
- A11Y-1. ARIA labels on interactive elements
- A11Y-2. Keyboard navigation (focus trapping via `useFocusTrap`, escape key via `useEscapeKey`)
- A11Y-3. ARIA live regions for dynamic content

</details>

---

## Security Posture

> Audit conducted 2026-03-18 after Sprint 3 + Analytics completion.

### Strengths

| Area | Implementation |
|------|---------------|
| Auth | Firebase Auth with email/password, email verification, `ProtectedRoute`/`AdminRoute` guards |
| Authorization | Firestore rules enforce ownership (`authorId == auth.uid`), Rep gates (`isContributor`, `isModerator`), admin checks |
| Admin ops | All privileged actions via Cloud Functions with `assertAdmin()` — custom claims + legacy fallback |
| XSS prevention | Custom `escapeHtml` → regex pipeline, `sanitizeUrl` blocks non-http protocols, CSP blocks inline scripts |
| CSP | `default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'` |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` |
| Input limits | Firestore rules enforce max lengths on all user-writable text fields |
| Rate limiting | Dual-layer: client-side hourly/daily checks + Firestore rules 10s minimum interval |
| Data validation | Zod `safeParse` at all Firestore read boundaries via `parse*Doc` functions |
| Session management | `revokeAllSessions` Cloud Function revokes all refresh tokens |
| Secrets | `.env` in `.gitignore`, `import.meta.env` with demo fallbacks, no hardcoded credentials |
| Analytics privacy | Page views store only `path` + `timestamp` — no user ID, IP, cookies, or fingerprinting |

### Open Findings

#### P0 — Fixed

| # | Finding | Fix Applied |
|---|---------|-------------|
| S16 | Missing Firestore rules for 6 collections | Added rules for `peerReviews`, `achievements`, `spotlights`, `contentCollaborators`, `pageViews`, `spotlightVotes` |
| S17 | `newsLinks` update allows any user to modify any link | Score-only updates for contributors, full edits for owner/moderator |
| S18 | `voteForSpotlight` has no dedup | Added `spotlightVotes/{voterId}_{spotlightId}` collection + domain `validateVote` |

#### P1 — Fixed

| # | Finding | Fix Applied |
|---|---------|-------------|
| S19 | `awardAchievement` takes arbitrary userId | Firestore rule enforces `userId == auth.uid`; composite doc ID prevents duplicates |
| S20 | `libraryEntryVersions` create allows history pollution | Added rule: `editedBy == auth.uid` |
| S21 | `notifications` create allows arbitrary type/link | Validated `type` against enum, `link` must start with `/` |
| S22 | `adminUpdateContent` doesn't validate field values | Added value validation: `nodes.status` must be theoretical/proven/disproved, `users.repPoints` must be integer |

#### P2 — Improve When Convenient

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| S11 | Firebase App Check not activated | LOW | Provision ReCaptcha Enterprise key, add to prod env, smoke-test |
| S23 | Page view rate limit is client-side only (localStorage, bypassable) | MEDIUM | Add server-side enforcement via Cloud Function or Firestore rules |
| S24 | Registration sets `repPoints` client-side via `calculateInitialRep` | LOW | Always set to 0 on create; rely on `claimSchoolEmailBonus` for bonus |
| S25 | `checkRateLimit` queries all user docs in a collection (no `limit()`) | LOW | Add `limit(100)` — only recent timestamps matter |

#### Accepted Risks

| Finding | Rationale |
|---------|-----------|
| `iframe sandbox="allow-scripts allow-same-origin"` | Required for YouTube/Docs embeds; mitigated by CSP `frame-src` whitelist |
| Markdown renderer uses regex (not a full parser) | `escapeHtml` runs first; `sanitizeUrl` blocks `javascript:` URLs; safe for current feature set |

---

## Completed: Security Hardening (S16–S22)

> All P0 and P1 security findings resolved. 84 Firestore rules tests, 641 unit tests.

**What was done:**
- Added Firestore rules for 6 missing collections (`peerReviews`, `achievements`, `spotlights`, `contentCollaborators`, `pageViews`, `spotlightVotes`)
- Fixed `newsLinks` update rule — score-only updates for contributors, full edits for owner/moderator
- Fixed `libraryEntryVersions` create rule — requires `editedBy == auth.uid`
- Added `spotlightVotes` dedup collection with Firestore rules + domain `validateVote` function
- Achievements locked to self-only creates via Firestore rules
- Notifications create validates `type` enum and `link` starts with `/`
- `adminUpdateContent` validates `nodes.status` (must be theoretical/proven/disproved) and `users.repPoints` (must be integer)

---

## Sprint 4: Platform Maturity

> Begins after security hardening is complete.

Focus: reach, retention, and polish. Make the platform shareable, accessible offline, and maintainable.

| # | Item | Effort | Why |
|---|------|--------|-----|
| 1 | **PWA + Push Notifications** | Medium | Mobile experience, re-engagement via push. Service worker for offline shell, web push via Firebase Cloud Messaging |
| 2 | **Email Digest System** | Medium | Brings users back who don't check the site daily. Weekly digest of activity in followed advancements, sent via Cloud Function + SendGrid/Resend |
| 3 | **Export & Sharing + OG Meta Tags** | Small | Content that can't be shared can't grow. OG tags for Tree nodes, Library entries, discussions. Share button with copy-link, Twitter/X, LinkedIn |
| 4 | **Research Paper Import** | Medium | Bridge to the broader research world. Parse DOI/arXiv URLs, extract metadata, auto-populate Library entry fields |
| 5 | **T2: Break Up Large Components** | Medium | Unblocks faster iteration on feature work |

### T2 Component Splits — Current State

| File | Lines | Suggested Extractions |
|------|-------|----------------------|
| `ProfilePage.tsx` | 799 | ContributionsTab, EditProfileForm, VouchSection |
| `AdvancementDetailPage.tsx` | 760 | Tab content components per pillar (TreeTab, LibraryTab, NewsTab, DiscussionsTab) |
| `AdminPage.tsx` | 708 | UsersPanel, FlagsPanel, AuditPanel, AnalyticsPanel (already a separate component) |
| `DiscussionForum.tsx` | 580 | ThreadView, CreateThreadForm, ReplyForm |
| `TreeView.tsx` | 524 | NodeCard, CreateNodeForm, NodeFilters |

`Dashboard.tsx` (477 lines) and `HomePage.tsx` (419 lines) are under threshold.

---

## Sprint 5: Production Stabilization

> **Nothing ships until this sprint is green.** Every item here exists to prevent regressions, catch drift, and guarantee the platform works exactly as expected in production.

### S5-1: Comprehensive E2E Test Suite

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 1 | **Critical path E2E tests** | Medium | Playwright tests covering: signup → onboarding → first contribution → support → vouch flow. Runs against Firebase emulators. |
| 2 | **Auth flow E2E** | Small | Login, logout, session revocation, school email verification, legacy admin migration — all verified end-to-end |
| 3 | **Admin flow E2E** | Small | Admin login → user management → content moderation → audit log verification |
| 4 | **Destructive action E2E** | Small | Delete user, delete content, flag resolution — verify cascading state updates and UI feedback |

### S5-2: Data Integrity & Validation

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 5 | **Firestore rules regression suite** | Small | Expand rules tests to cover every write path with both allowed and denied scenarios. Target: 100% rule branch coverage |
| 6 | **Schema drift detection** | Small | CI step that validates all Firestore `parse*Doc` Zod schemas match the actual document shapes written by services. Catches silent data model changes |
| 7 | **Seed data integrity check** | Small | Automated test that seeds a fresh emulator, runs all services, and verifies every collection has expected document structure |
| 8 | **Rate limit verification** | Small | Integration tests proving both client-side and Firestore-level rate limits reject requests correctly at boundaries (10s interval, hourly/daily caps) |

### S5-3: Error Handling & Resilience

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 9 | **ErrorBoundary coverage audit** | Small | Verify every route and lazy-loaded component is wrapped in an ErrorBoundary. Add missing boundaries. Test that errors render fallback UI, not white screens |
| 10 | **Offline/network failure handling** | Small | Test behavior when Firestore goes offline mid-operation: pending writes, UI feedback, reconnection recovery. Verify no data corruption |
| 11 | **Cloud Function failure modes** | Small | Test every Cloud Function with: missing auth, invalid input, Firestore unavailable, timeout. Verify error codes and client-side handling |
| 12 | **Toast error coverage** | Small | Audit every `catch` block — verify all user-facing errors surface a toast or inline message, never fail silently |

### S5-4: Security Regression Prevention

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 13 | **Auth bypass test suite** | Small | Automated tests attempting every Firestore write without auth, with wrong user, with insufficient Rep. Must all be denied |
| 14 | **XSS regression tests** | Small | Render markdown with known XSS payloads (`<script>`, `javascript:` URLs, event handlers, nested encoding). Verify all are sanitized |
| 15 | **CSP validation** | Small | Automated check that `firebase.json` headers match expected CSP policy. Alert on any loosening |
| 16 | **Dependency audit gate** | Small | CI step running `npm audit` / `bun audit` — block deployment on high/critical vulnerabilities |

### S5-5: Build & Deploy Safety

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 17 | **TypeScript strict compilation gate** | Small | CI enforces `tsc --noEmit` with zero errors, zero warnings. No `@ts-ignore`, no `any` leaks |
| 18 | **Bundle size budget** | Small | Set max bundle size thresholds per chunk. CI fails if a change exceeds budget by >5%. Prevents accidental bloat |
| 19 | **Lighthouse CI** | Small | Run Lighthouse in CI on key pages (home, advancement detail, profile). Enforce minimum scores: Performance 90+, Accessibility 95+, Best Practices 95+ |
| 20 | **Preview deploy + smoke test** | Medium | Every PR deploys to a Firebase preview channel. Automated smoke test hits 5 critical routes and checks for 200 status + no console errors |
| 21 | **Rollback runbook** | Small | Document exact steps to rollback: hosting (revert to previous version), Cloud Functions (redeploy previous), Firestore rules (revert rules version). Test the rollback process |

### S5-6: Monitoring & Observability

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 22 | **Client error tracking** | Small | Integrate lightweight error reporter (e.g., Sentry free tier or custom Cloud Function). Capture unhandled exceptions + rejected promises with stack traces and user context (uid only) |
| 23 | **Cloud Function monitoring** | Small | Firebase console alerts for: function errors >1%, latency >5s, cold start frequency. Document alert thresholds |
| 24 | **Firestore usage alerts** | Small | Set budget alerts for reads/writes/deletes. Monitor for unexpected spikes that could indicate abuse or bugs |
| 25 | **Uptime monitoring** | Small | External ping on `/` and `/api/health` (add simple health endpoint). Alert on downtime >2 minutes |

### S5-7: Pre-Launch Checklist

Before any production deployment, all of the following must be green:

- [ ] `tsc --noEmit` passes with zero errors
- [ ] All unit tests pass (`vitest run`)
- [ ] All Firestore rules tests pass (`vitest run --config vitest.rules.config.ts`)
- [ ] E2E critical path tests pass against emulators
- [ ] Bundle size within budget
- [ ] Lighthouse scores meet thresholds
- [ ] `npm audit` / dependency check shows no high/critical issues
- [ ] Preview deploy smoke test passes
- [ ] Security regression suite passes (auth bypass, XSS, CSP)
- [ ] Manual spot-check: signup, create idea, support idea, flag content, admin panel
- [ ] Rollback tested within last 30 days

---

## Sprint 6: The Bounty Board

> Begins after Sprint 5. Adds a public task marketplace where contributors post work requests and hunters earn rep by completing them. Full design: `plans/bounty-system.md`.

### Why Now

The Bounty Board solves three problems that become acute after production stabilization: newcomers have no guided path to earn rep, experienced members can't direct work toward gaps they see, and there's no structured way to ask for help. It also lays groundwork for the rep system revision by introducing system-minted rewards tied to verified work.

### Key Design Decisions

- **Rep is trust, not currency** — posting a bounty costs nothing. The hunter earns system-minted rep on completion, same as any other contribution. The poster earns a token bonus (+3 to +10).
- **Posting requires Core phase** — Contributor (1,333+) can post bounties at any difficulty. Pre-Core users can browse and claim (rate-limited).
- **4 difficulty tiers** — Newcomer (15–75 rep), Standard (30–150), Advanced (75–333), Expert (150–666). No tier-gating on claiming — any Apprentice can attempt any difficulty.
- **Quality gate is the review, not the tier** — the poster reviews and accepts/rejects submissions. Auto-accept after 7 days prevents stalling.
- **Anti-collusion with appeals** — reciprocal blocks, concentration limits, and ring detection catch farming. All automated restrictions can be overridden by a Moderator appeal so legitimate collaborators aren't punished.
- **Inflation-controlled** — poster posting cap (3 open, 5/week), reward ranges, daily cap (500/day with deferral), platform-wide weekly cap (5,000 rep/week).

### Implementation Phases

| Phase | Items | Effort |
|-------|-------|--------|
| **6.1 Core** | Bounty CRUD, reward minting on completion, claiming/submission flow, poster review (accept/reject), Bounty Board page with filters, basic notifications | Large |
| **6.2 Safety** | Anti-collusion detection (reciprocal block, concentration limit, ring detection), moderator appeal system, claim squatting defenses, edit freeze on claim, auto-accept timeout, community flagging | Medium |
| **6.3 Engagement** | Mutual ratings, work logs, bounty-related achievements (5 new), system bounties (admin-posted), analytics dashboard integration, "Bounties for you" on Dashboard | Medium |

### New Infrastructure

| Item | Details |
|------|---------|
| Collections | `bounties`, `bountySubmissions`, `bountyWorkLogs`, `bountyDisputes`, `bountyRatings` (5 new) |
| Cloud Functions | `completeBounty` (mint rep), `autoAcceptSubmission`, `expireBounties`, `expireClaims`, `detectBountyAbuse` (5 new) |
| Pages | `/bounties` (board), `/bounties/:id` (detail) |
| Firestore rules | Read for all authenticated users, create/update gated by role (poster vs hunter) |

---

## Backlog

Features that add value but aren't blocking growth. Pull into sprints as capacity allows.

### Polish & UX
| # | Item | Effort | Description |
|---|------|--------|-------------|
| 22 | Page Transition Animations | Small | View Transitions API or Framer Motion for smooth route changes |
| 23 | Rep History Timeline | Medium | Visual timeline of Rep earned/lost, filterable by source and date |
| 28 | URL Metadata Auto-Fetch | Small | Cloud Function fetches OpenGraph metadata for newsroom URLs on submission |

### Discovery & Knowledge
| # | Item | Effort | Description |
|---|------|--------|-------------|
| 17 | Advancement Comparison | Medium | Side-by-side Tree views, cross-advancement search, related ideas |
| 25 | 3D Tree Visualization | Large | Three.js force-directed graph, color-coded by node status |
| 31 | Knowledge Gap Detection | Medium | Identify underpopulated Tree branches, surface frontier areas |

### Collaboration
| # | Item | Effort | Description |
|---|------|--------|-------------|
| 33 | Working Groups | Large | Named groups around topics, group chat, shared bookmarks |
| 35 | Hypothesis Tracker | Large | Hypothesis → experiment → results pipeline per Tree node |

### Engagement & Gamification
| # | Item | Effort | Description |
|---|------|--------|-------------|
| 37 | Weekly Challenges | Medium | Auto-generated or admin-curated prompts per advancement |

---

## Future Phases

Major platform expansions, each building on the previous. Order reflects dependency chain and strategic priority.

### Phase 6: The Dojo
| Item | Description |
|------|-------------|
| Course builder | Creation interface for professors and mentors |
| Curriculum units | Built on Library entries as modular building blocks |
| Learning paths | Structured per advancement (beginner → contributor-ready) |
| Mentor matching | Based on advancement + expertise level |
| Progress tracking | Quizzes, completion certificates |

**Depends on:** Library being well-populated, Rep system matured.

### Phase 7: The Pool
| Item | Description |
|------|-------------|
| Treasury | Donation-funded with transparent accounting dashboard |
| Voting | Fund allocation proposals, 3000+ Rep to vote |
| Proposals | Contributors pitch experiments, community votes to fund |
| Payouts | Milestone-based, public ledger |
| Integration | Stripe/Open Collective |

**Depends on:** Active community (100+ contributors), legal/compliance review.
**Note:** Placeholder page exists at `/pool` (371 lines).

### Phase 8: The Launchpad
| Item | Description |
|------|-------------|
| GitHub OAuth | Merged PRs in relevant repos earn Rep |
| Connectors | Notion, Google Docs, NotebookLM, Obsidian |
| External tracking | Contribution verification from external platforms |
| Auto-sync | External activity summarized on advancement dashboard |

**Depends on:** Stable Rep system, OAuth infrastructure.

### Phase 9: The Data Vault
| Item | Description |
|------|-------------|
| Dataset repo | Open datasets, 1000+ Rep to upload |
| Peer review | Pipeline for dataset quality, versioned with changelogs |
| Integrity | Falsified data detection → Rep penalty / ban + Tree node re-verification |
| Integration | Links to Hypothesis Tracker (backlog #35) |

**Depends on:** Peer review system (Sprint 3, done), storage infrastructure (Cloud Storage).

### Phase 10: Advanced Reputation
| Item | Description |
|------|-------------|
| Citations | Google Scholar citation integration |
| Awards | Breakthrough awards (+1,666 Rep to author, +250 to reviewer) |
| Visibility | Leaderboard per advancement, reputation API |

**Depends on:** Mature community, established norms for Rep fairness.
**Note:** The rep system revision (`plans/reputation-system-revision.md`) already designs decay, 11 tiers, diminishing returns, breadth bonuses, and anti-gaming. If the revision is implemented before this phase, the remaining items here are citations and visibility only.

### Phase 11: Community & Social
| Item | Description |
|------|-------------|
| Discord | Auto-role by Rep tier |
| Social | @mentions, direct messaging, "follow" users/advancements |
| Events | Community calendar (AMAs, hackathons, paper readings) |

**Depends on:** Active user base, moderation tooling (Sprint 3, done).

### Phase 12: Content Quality
| Item | Description |
|------|-------------|
| Translations | Plain-language research paper translations (posted as bounties on the Bounty Board) |
| Citation graph | Visual links between Tree nodes |
| Quality scoring | Algorithm-based, "Verified" badge |
| Plagiarism | Automated detection |

**Depends on:** Bounty Board (Sprint 6) for translation bounties, peer review (Sprint 3, done).

### Phase 13: Platform & Infrastructure
| # | Item | Description |
|---|------|-------------|
| 40 | Public API | REST/GraphQL for read-only access, rate-limited by Rep |
| 41 | Embeddable Widgets | Tree branch viewer for external sites |
| 42 | Internationalization | Locale files, RTL support, community translations |
| 44 | Webhook & Integration Bus | User-configurable webhooks, Slack integration |

**Depends on:** Stable API surface, community demand.

---

## Progress Summary

| Area | Status |
|------|--------|
| MVP (Phases 1–5.6) | COMPLETE |
| Security (S1–S15) | 14/15 done — S11 App Check remains (config only) |
| Security Hardening (S16–S22) | COMPLETE — all P0 + P1 findings fixed |
| Security Audit (S23–S25) | 3 P2 findings remain (low priority) |
| Technical Debt (T1–T5) | 4/5 done — T2 component splits remain |
| Testing | COMPLETE — 71 files, 808 unit tests, 84 rules tests |
| Accessibility (A11Y 1–3) | COMPLETE |
| Sprint 1: Code Quality | COMPLETE |
| Sprint 2: Discovery & Content | COMPLETE |
| Sprint 3: Collaboration | COMPLETE — 5 features, 74 tests |
| Platform Analytics | COMPLETE — anonymous + auth tracking, admin dashboard |
| Security Hardening | COMPLETE |
| Sprint 4: Platform Maturity | COMPLETE — OG meta, ShareButton, T2 component splits, PWA + FCM, Email Digest, Research Paper Import |
| **Sprint 5: Production Stabilization** | **COMPLETE** — All 6 phases done. 808 unit tests across 71 files. E2E infra (Playwright), security regression tests (XSS, CSP, auth bypass), schema drift detection, rate limit boundary tests, RouteErrorBoundary, OfflineBanner, Cloud Function error mode tests, toast coverage audit, CI gates (bundle size, Lighthouse, dependency audit, preview deploy), error tracking, monitoring docs |
| Sprint 6: The Bounty Board | **Phase 6.1 COMPLETE** — Domain types + validation (7 increments, 64 tests), Zod schemas (2 increments, 13 tests), service layer (11 increments, 34 tests), Cloud Function `completeBounty` (9 tests), Firestore rules, bounty notifications, BountyBoardPage, BountyDetailPage, CreateBountyPage, routes + nav. Phases 6.2 (Safety) and 6.3 (Engagement) remain |
| Reputation System Revision | DESIGNED — 11-tier system (`plans/reputation-system-revision.md`), not yet implemented |
| Backlog (P3) | 9 items across 4 categories |
| Future Phases (6–13) | 8 phases planned |
