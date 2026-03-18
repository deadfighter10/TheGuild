# Features & UX Roadmap

> Post-MVP roadmap for security hardening, features, UX improvements, and technical debt.
> Generated from codebase audit on 2026-03-12. Revised 2026-03-17.

---

## Completed Work

### Security (all S0 items done)
- ~~S1. Firestore update rules (ownership checks)~~ DONE
- ~~S2. Server-side rep validation in rules~~ DONE
- ~~S3. Admin custom claims + Cloud Functions~~ DONE
- ~~S4. Markdown XSS fix~~ DONE
- ~~S5. Email verification flow~~ DONE
- ~~S6. Iframe sandboxing~~ DONE
- ~~S7. Rate limiting (Phase 1 client-side + Phase 2 Firestore rules)~~ DONE
- ~~S8. Input length limits in Firestore rules~~ DONE
- ~~S9. Audit logging~~ DONE
- ~~S10. Session management~~ DONE
- ~~S12. CSP headers~~ DONE
- ~~S13. Dependabot / dependency scanning~~ DONE

### Features (P0-P2 + Launch Readiness done)
- ~~P0-1. Pagination (Library, News, Discussions)~~ DONE
- ~~P0-2. Error feedback with Toasts~~ DONE
- ~~P0-3. Content moderation (flags system, FlagButton, FlagsPanel, flag-service)~~ DONE
- ~~P1-4. Notification system (NotificationBell, notification-service, domain model)~~ DONE
- ~~P1-5. Real-time updates (useRealtimeQuery + onSnapshot for Tree, Discussions, Newsroom)~~ DONE
- ~~P1-6. Search improvements (Phase 1)~~ DONE
- ~~P1-7. Thread & reply editing/deletion~~ DONE
- ~~P1-8. Responsive & mobile polish~~ DONE
- ~~P2-9. Rich text / Markdown editor~~ DONE
- ~~P2-10. Public user profiles~~ DONE
- ~~P2-11. Advancement activity feed~~ DONE
- ~~P2-12. Onboarding improvements~~ DONE
- ~~P2-13. Dark mode contrast refinements~~ DONE
- ~~P2-14. Loading skeletons~~ DONE

---

## Remaining Work

---

### Security — Low Priority

#### S11. Firebase App Check
**Severity:** LOW | **Effort:** Small (config only)

Code exists in `src/lib/firebase.ts` with `ReCaptchaEnterpriseProvider`. Activates when `VITE_RECAPTCHA_ENTERPRISE_KEY` env var is set.

**TODO:**
- Provision ReCaptcha Enterprise key in Google Cloud Console
- Add key to production environment variables
- Smoke-test existing auth and write flows

#### ~~S7 Phase 3. Hourly/Daily Rate Counters~~ DONE
**Severity:** LOW | **Effort:** Small

Added `RATE_LIMITS` config and `isWithinRateLimit()` pure function + `checkRateLimit()` Firestore helper. Limits: nodes (10/hr, 30/day), threads (5/hr, 20/day), replies (30/hr, 100/day), newsLinks (5/hr, 20/day), libraryEntries (3/hr, 10/day), flags (10/hr, 30/day). 8 tests. Integrated `checkRateLimit` into all 6 create functions: createNode, createThread, createReply, submitNewsLink, createLibraryEntry, flagContent.

#### ~~S14. Firestore Data Validation at Read Boundaries~~ DONE
**Severity:** MEDIUM | **Status:** COMPLETE

**Phase 1 DONE:** Zod schemas for TreeNode, NewsLink, DiscussionThread, DiscussionReply, ContentFlag, Notification. 12 schema tests.

**Phase 2 DONE:** Zod schemas for GuildUser, LibraryEntry, EntryVersion. Replaced all unsafe `as` casts in library-service, user-service, AuthContext, admin-service with schema validators. 9 additional tests (21 total). EntryVersion type moved to domain layer.

#### ~~S15. Input Sanitization Audit~~ DONE
**Severity:** LOW | **Effort:** Small

**Findings:** React's built-in JSX auto-escaping + Markdown renderer's `escapeHtml()` + `sanitizeUrl()` provide strong defense against stored XSS. The `"#"` fallback for invalid URLs is intentional and safe.

**Fix applied:** Added photoURL protocol validation in ProfilePage — rejects non-http/https URLs (blocks javascript: and data: protocol injection). Firestore rules enforce length limits on all user input fields. All text content `.trim()`ed before writes.

---

### Technical Debt

#### ~~T1. Extract Shared `timeAgo` Utility~~ DONE
Extracted to `src/shared/utils/time.ts` with compact mode option. Replaced 5 duplicate implementations. 8 tests added.

#### T2. Break Up Large Components
**Effort:** Medium-Large

Six components exceed 500 lines and violate single responsibility:

| File | Lines | Suggested Splits |
|------|-------|-----------------|
| `AdvancementDetailPage.tsx` | 770 | Extract tab content into separate components per pillar |
| `AdminPage.tsx` | 715 | Extract UsersPanel, FlagsPanel, AuditPanel into own files |
| `ProfilePage.tsx` | 664 | Extract ContributionsTab, EditProfileForm, VouchSection |
| `DiscussionForum.tsx` | 590 | Extract ThreadView, CreateThreadForm, ReplyForm |
| `TreeView.tsx` | 500 | Extract NodeCard, CreateNodeForm, NodeFilters |
| `Dashboard.tsx` | 499 | Extract StatsGrid, ActivityFeed, QuickActions |

#### ~~T3. Replace Silent Error Catches~~ DONE
Replaced all 11 `.catch(() => {})` silent swallows with descriptive `console.error` messages. Fire-and-forget notifications (4 service files) and UI data fetches (7 component files) now log errors for debugging.

#### ~~T4. Improve `useCallback`/`useMemo` Coverage~~ DONE
**Effort:** Small-Medium

Added `useMemo` to: Layout.tsx command palette filter (advancementResults, navResults), TreeView.tsx `buildTree(nodes)` call. TreeView and NewsroomPage already had proper memoization for filtering/sorting.

#### ~~T5. Lazy-Load Heavy Components~~ DONE
All pages already lazy-loaded via `React.lazy()` in App.tsx.

---

### Testing

#### TEST-1. Service Layer Test Coverage
**Priority:** HIGH | **Status:** Phase 1 DONE, Phase 2 partially done

**Phase 1 DONE:** 45 tests across 4 service files using mocked Firestore:
- `node-service.test.ts` (20 tests) — createNode, supportNode, setNodeStatus, editNode, getNode, getNodeLineage
- `discussion-service.test.ts` (14 tests) — createThread, createReply, editThread, deleteThread, deleteReply
- `news-service.test.ts` (10 tests) — submitNewsLink, voteNewsLink, getUserVote
- `flag-service.test.ts` (6 tests) — flagContent, resolveFlag, getPendingFlags

**Phase 2 partially done:**
- `library-service.test.ts` (9 tests) — createLibraryEntry, editLibraryEntry, getEntryVersions
- `notification-service.test.ts` (6 tests) — createNotification, getNotifications, markAsRead, markAllAsRead
- `vouch-service.test.ts` (10 tests) — vouchForUser, searchUserByEmail, hasBeenVouched, hasVouchedForSomeone
- `bookmark-service.test.ts` (6 tests) — toggleBookmark, isBookmarked, getUserBookmarks

**Remaining:** `admin-service.ts`, `audit-service.ts`, `globe-service.ts`, `user-service.ts`

#### TEST-2. Component Integration Tests
**Priority:** MEDIUM | **Status:** Phase 1 DONE

**Phase 1 DONE (shared components + auth):**
- `EmptyState.test.tsx` (5 tests) — title, description, action slot, all icon types
- `Markdown.test.tsx` (6 tests) — plain text, bold, links with target/rel, URL sanitization, code blocks, wrapper class
- `Skeleton.test.tsx` (6 tests) — SkeletonCard, SkeletonList count, SkeletonText lines, SkeletonStats grid
- `Toast.test.tsx` (5 tests) — renders children, displays toast, error styling, multiple toasts, aria-live
- `RepGate.test.tsx` (6 tests) — sufficient rep, custom fallback, hideWhenLocked, admin bypass
- `AuthForm.test.tsx` (9 tests) — login/register mode switching, form submission, error display, edu hint, error clearing

**Remaining (medium effort):**
- Tree CRUD (create node, support, status change)
- Discussion CRUD (create thread, reply, edit, delete)
- Additional Rep-gated UI scenarios

**Approach:** Vitest + Testing Library. Mock Firebase, test user interactions and state changes.

#### TEST-3. Firestore Rules Tests
**Priority:** MEDIUM | **Effort:** Medium

Firestore rules are complex (ownership checks, rep validation, rate limiting) but have no automated tests.

**Approach:** Use `@firebase/rules-unit-testing` with the emulator to test allow/deny for each collection and operation.

---

### Accessibility

#### ~~A11Y-1. ARIA Labels on Interactive Elements~~ DONE
Added `role="dialog"` + `aria-modal` to FlagButton modal, Command Palette, and mobile menu. Added `aria-label` to: TreeView expand button (+ `aria-expanded`), MarkdownToolbar icon buttons, notification unread dot, Command Palette search input, VouchPanel email input, DiscussionForum title/body inputs, Newsroom vote buttons (up/down), FlagButton, discussion Edit/Delete buttons, platform link cards in AdvancementDetailPage. Added `aria-hidden` to modal overlays. Added `role="progressbar"` with `aria-valuenow`/`aria-valuemax` to rep progress bar. Added `role="region"` to notification dropdown.

#### ~~A11Y-2. Keyboard Navigation (Basics)~~ DONE
**Priority:** MEDIUM | **Effort:** Small

Focus trapping in modals (FlagButton, Command Palette) via `useFocusTrap` hook. Escape key dismissal via `useEscapeKey` hook (FlagButton modal, Command Palette, mobile menu). 4 tests.

**Deferred:** Arrow key Tree navigation, `n` shortcut, `?` shortcuts overlay.

#### ~~A11Y-3. ARIA Live Regions~~ DONE
Added `role="status"` + `aria-live="polite"` to: Toast container (announces success/error/info messages), NotificationBell unread count (screen-reader-only live region announces count changes).

---

### Features — Nice to Have (P3)

#### P3 — Polish & UX

##### 16. Contribution Streaks & Stats
- "X day streak" on Dashboard
- Weekly/monthly contribution graph (GitHub-style heatmap)
- "Most active in [advancement]" badge
- Rep earned breakdown by time period

##### 22. Page Transition Animations
- Smooth route transitions between pages (View Transitions API or Framer Motion)
- Subtle enter/exit animations for content sections
- Skeleton → content fade-in for real-time data

##### 23. Rep History Timeline
- Visual timeline showing when and how Rep was earned/lost
- Breakdown by source (vouches, supports, verification, penalties)
- Filterable by date range and event type

##### 24. Avatar / Profile Pictures
- Firebase Storage upload or Gravatar fallback
- Shown on profile, discussion replies, activity feeds, vouch cards
- Image cropping/resizing on upload

##### 28. URL Metadata Auto-Fetch
- Cloud Function fetches OpenGraph metadata for submitted newsroom URLs
- Link preview cards with title, description, thumbnail
- Fallback to favicon + domain name if no OG tags

#### P3 — Discovery & Knowledge

##### 17. Advancement Comparison
- Side-by-side view of two advancements' Trees
- Cross-advancement search (unified results page)
- "Related ideas" suggestions based on keyword overlap between nodes

##### 25. 3D Tree Visualization
- Three.js force-directed graph (currently 2D list)
- Interactive zoom, pan, click-to-expand clusters
- Color-coded by node status (green/red/black)
- Toggle between 2D list and 3D graph views

##### 26. Node Detail Page
- Dedicated route `/advancement/:id/tree/:nodeId`
- Full lineage breadcrumb (root → parent → current)
- Related library entries cross-linked by keyword
- Discussion thread embedded inline
- Support history and timeline

##### ~~29. Fuzzy Search (Fuse.js)~~ DONE
Client-side fuzzy search via Fuse.js (zero infrastructure). Integrated into: Command Palette (advancements + nav), TreeView (recursive tree-aware fuzzy filtering), NewsroomPage (via reusable `useSearch` hook). 7 tests for useSearch hook.

**Deferred:** Server-side semantic search (Algolia/Typesense) for cross-content-type full-text search with filters.

##### 30. Research Paper Import
- Paste arXiv / PubMed / DOI URL → auto-extract title, authors, abstract
- Cloud Function fetches metadata via CrossRef / arXiv API
- Link paper to relevant Tree node or Library entry
- Citation count display (refreshed periodically)

##### 31. Knowledge Gap Detection
- Analyze Tree per advancement: identify branches with few nodes or low support
- Surface "frontier areas" on advancement dashboard — where ideas are needed most
- Optional: suggest related papers or news for underexplored branches
- Moderators can pin "wanted" topics to encourage contributions

#### P3 — Collaboration

##### 19. Content Bookmarking
- "Save for later" button on nodes, entries, links, threads
- `bookmarks/{userId}_{targetType}_{targetId}` Firestore collection
- Bookmarks tab on profile page with filters by type
- "Saved" indicator on bookmarked content

##### 27. Library Entry Editing
- Edit capability for existing entries (author or 3000+ Rep)
- Version history stored in `libraryEntryVersions` subcollection
- Diff view between versions (similar to GitHub compare)
- Revert to previous version (admin only)

##### 32. Co-Authorship
- Invite collaborators to co-author a Tree node or Library entry
- Co-authors listed on content, all earn Rep on supports
- `contentCollaborators/{contentId}_{userId}` collection
- Permission: original author can add/remove collaborators

##### 33. Working Groups
- Create named groups around a specific advancement or cross-cutting topic
- Group chat (discussion threads scoped to group)
- Shared bookmarks and reading lists
- Group activity feed on dashboard
- Rep requirement to create (500+), open to join

##### 34. Peer Review Queue
- Authors can submit nodes or Library entries for formal peer review
- Reviewers assigned from 3000+ Rep pool (or self-select)
- Structured feedback form: accuracy, clarity, novelty, evidence quality
- Review status: pending → in review → approved / needs revision / rejected
- Approved content gets "peer-reviewed" badge + bonus Rep for author and reviewers

##### 35. Hypothesis Tracker
- Formal hypothesis → experiment design → results pipeline per Tree node
- Structured fields: hypothesis statement, methodology, expected outcome, actual outcome
- Status: proposed → testing → confirmed / refuted
- Links to Data Vault datasets used as evidence
- Proven hypotheses auto-update parent node status to "proven"

#### P3 — Engagement & Gamification

##### 36. Achievements & Badges
- Milestone badges: "First Node", "100 Supports Given", "Library Scholar" (10+ entries)
- Advancement-specific badges: "Fusion Pioneer", "Gene Editor", etc.
- Displayed on profile and next to username in discussions
- `achievements/{userId}_{achievementId}` collection
- Cloud Function triggers on relevant events

##### 37. Weekly Challenges
- Auto-generated or admin-curated weekly prompts per advancement
- Examples: "Write a Library entry about X", "Propose an idea that builds on node Y"
- Leaderboard for challenge participants
- Bonus Rep for top contributors each week

##### 38. Spotlight System
- Community-nominated "Idea of the Week" per advancement
- Featured contributor profiles rotated on homepage/dashboard
- Admin or 3000+ Rep can nominate; community votes
- Spotlighted content gets boosted visibility

#### P3 — Platform & Infrastructure

##### 20. Export & Sharing
- Export Tree branch as SVG/PNG image or PDF
- Export Library entry as PDF with proper formatting
- Share button with copy-to-clipboard for direct links
- OpenGraph meta tags for rich link previews when shared on social media

##### 21. Analytics Dashboard (Admin)
- User growth over time chart (daily/weekly/monthly)
- Content creation trends per advancement
- Rep distribution histogram
- Retention metrics (DAU/WAU/MAU, return rate)
- Moderation stats (flags resolved, avg response time)

##### 39. Progressive Web App (PWA)
- Service worker for offline Library reading
- Push notifications for replies, supports, flags
- Install prompt on mobile browsers
- Cached assets for fast repeat visits

##### 40. Public API
- REST or GraphQL API for read-only access to public data
- API keys with rate limiting (keyed to user Rep level)
- Endpoints: advancements, nodes, library entries, newsroom links
- Enables third-party tools, research dashboards, browser extensions

##### 41. Embeddable Widgets
- Embeddable Tree branch viewer for external sites
- "Powered by The Guild" attribution link
- `<iframe>` or web component with configurable theme
- Drives discovery and new user acquisition

##### 42. Internationalization (i18n)
- UI string extraction to locale files
- Community-contributed translations
- RTL layout support
- Language selector in user settings

##### 43. Email Digest System
- Configurable weekly/daily digest of activity in followed advancements
- Includes: new nodes, popular discussions, newsroom highlights
- Unsubscribe per advancement or globally
- Cloud Function scheduled job + SendGrid/Mailgun integration

##### 44. Webhook & Integration Bus
- User-configurable webhooks for events (new node in advancement X, Rep milestone)
- Slack integration: post highlights to a channel
- Zapier/Make trigger for automation
- Foundation for The Launchpad phase

---

### Future Phases (Post-Launch)

#### Phase 6: The Dojo
- Course/lesson creation interface for professors and mentors
- Built on Library entries as modular curriculum units
- Structured learning paths per advancement (beginner → contributor-ready)
- Mentor-mentee matching based on advancement + expertise level
- Progress tracking, quizzes, completion certificates
- Mentor earns Rep for mentee milestones
- Integration with peer review queue for student submissions

#### Phase 7: The Pool
- Donation-funded treasury with transparent accounting dashboard
- Monthly maintenance costs deducted first, remainder funds contributors
- Voting system for fund allocation (3000+ Rep to vote)
- Proposal system: contributors pitch experiments, community votes to fund
- Milestone-based payouts (funds released as deliverables are met)
- Public ledger of all transactions
- Stripe/Open Collective integration for donations

#### Phase 8: The Launchpad
- GitHub OAuth integration (merged PRs to linked repos earn Rep)
- Notion / Google Docs / NotebookLM / Obsidian connectors
- External contribution tracking and verification via webhooks
- "Linked Projects" section on advancement pages
- Auto-sync: external activity summarized on advancement dashboard
- Contribution credit system (map external commits to Tree nodes)

#### Phase 9: The Data Vault
- Open dataset repository (1000+ Rep to upload)
- Structured metadata: format, size, methodology, licensing
- Peer review pipeline with reviewer queue (similar to P3-34)
- Organizational backing verification (institutional uploads prioritized)
- Versioned datasets with changelogs
- Falsified data detection → huge Rep penalty / instant ban + all related Tree nodes flagged for re-verification
- Integration with Hypothesis Tracker (P3-35): datasets as evidence

#### Phase 10: Advanced Reputation
- Google Scholar citation integration (auto-verify published work)
- Breakthrough awards (+500 Rep) nominated by 3000+ Rep users
- Rep decay for extended inactivity (configurable grace period)
- Negative Rep enforcement (temp ban, restricted access)
- Rep leaderboard per advancement (opt-in, privacy-respecting)
- Rep multipliers for cross-advancement contributions
- Reputation API for external verification ("is this person a contributor?")

#### Phase 11: Community & Social
- Discord integration (auto-role assignment based on Rep tier)
- @mentions in discussions and node descriptions
- Contributor spotlight system (automated + community-nominated)
- Weekly digest emails (see P3-43 as foundation)
- Direct messaging between users (opt-in, Rep-gated)
- "Follow" users and advancements for personalized feed
- Community events calendar (AMAs, hackathons, paper readings)

#### Phase 12: Content Quality
- Plain-language research paper translations (crowdsourced, bounty-funded from Pool)
- Bounty system for knowledge gaps (moderators post bounties, Pool funds payouts)
- Formal peer review workflow for Library entries (extends P3-34)
- Citation graph between nodes (visual map of how ideas reference each other)
- Quality scoring algorithm (combines peer review, supports, citations)
- "Verified" badge for content that passes peer review + has supporting data
- Automated plagiarism detection for Library submissions

---

## Suggested Sprint Sequence

### ~~Sprint 1: Code Quality & Resilience~~ COMPLETE
| # | Item | Status |
|---|------|--------|
| 1 | ~~T1: Extract `timeAgo` utility~~ | DONE — 8 tests |
| 2 | ~~T3: Replace silent error catches~~ | DONE — 11 catches fixed |
| 3 | ~~S14: Zod schemas for Firestore reads (Phase 1)~~ | DONE — 12 tests, 6 document types |
| 4 | ~~A11Y-1: ARIA labels pass (Phase 1)~~ | DONE — modals, inputs, buttons, progress bar |
| 5 | ~~TEST-1: Service layer tests (top 4 services)~~ | DONE — 45 tests (node, discussion, news, flag) |

### Sprint 2: Discovery & Content Depth
| # | Item | Effort | Why |
|---|------|--------|-----|
| 1 | ~~26: Node Detail Page~~ | DONE — route, lineage breadcrumb, child nodes, all actions |
| 2 | ~~29: Fuzzy Search (Fuse.js)~~ | DONE — useSearch hook, CommandPalette, TreeView, NewsroomPage |
| 3 | ~~19: Content Bookmarking~~ | DONE — toggle bookmark, profile tab, Firestore rules |
| 4 | ~~24: Avatar / Profile Pictures~~ | DONE — UserAvatar component, photoURL field, 7 locations updated |
| 5 | ~~27: Library Entry Editing + Versions~~ | DONE — version snapshots on edit, version history UI, 9 tests |

### Sprint 3: Collaboration & Engagement
| # | Item | Effort | Why |
|---|------|--------|-----|
| 1 | 34: Peer Review Queue | Large | Core to research credibility — proven nodes need formal validation |
| 2 | 36: Achievements & Badges | Medium | Drives retention, gives newcomers visible goals |
| 3 | 38: Spotlight System | Small | Surfaces best work, rewards quality over quantity |
| 4 | 32: Co-Authorship | Medium | Research is collaborative — single-author model is limiting |
| 5 | 16: Contribution Streaks & Stats | Medium | GitHub-style heatmap keeps people coming back |

### Sprint 4: Platform Maturity
| # | Item | Effort | Why |
|---|------|--------|-----|
| 1 | 39: PWA (offline + push notifications) | Medium | Mobile experience, re-engagement via push |
| 2 | 43: Email Digest System | Medium | Brings users back who don't check the site daily |
| 3 | 20: Export & Sharing + OG meta tags | Small | Content that can't be shared can't grow |
| 4 | 30: Research Paper Import | Medium | Bridge between The Guild and the broader research world |
| 5 | T2: Break up large components | Medium | Unblocks faster iteration on feature work |

**After Sprint 4:** Future phases (Dojo, Pool, Launchpad, Data Vault) in order, informed by community feedback and growth metrics.
