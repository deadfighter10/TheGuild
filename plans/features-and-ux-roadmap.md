# Features & UX Roadmap

> Post-MVP roadmap for features, UX improvements, and platform growth.
> Generated from codebase audit on 2026-03-12. Revised 2026-03-18.

---

## Completed Work

<details>
<summary>Security (all items done)</summary>

- S1. Firestore update rules (ownership checks)
- S2. Server-side rep validation in rules
- S3. Admin custom claims + Cloud Functions
- S4. Markdown XSS fix
- S5. Email verification flow
- S6. Iframe sandboxing
- S7. Rate limiting (client-side + Firestore rules + hourly/daily counters)
- S8. Input length limits in Firestore rules
- S9. Audit logging
- S10. Session management
- S12. CSP headers
- S13. Dependabot / dependency scanning
- S14. Firestore data validation at read boundaries (Zod schemas, 21 tests)
- S15. Input sanitization audit

</details>

<details>
<summary>Features (P0-P2 + Sprint 1-2)</summary>

- P0-1. Pagination (Library, News, Discussions)
- P0-2. Error feedback with Toasts
- P0-3. Content moderation (flags system)
- P1-4. Notification system
- P1-5. Real-time updates (onSnapshot)
- P1-6. Search improvements
- P1-7. Thread & reply editing/deletion
- P1-8. Responsive & mobile polish
- P2-9. Rich text / Markdown editor
- P2-10. Public user profiles
- P2-11. Advancement activity feed
- P2-12. Onboarding improvements
- P2-13. Dark mode contrast refinements
- P2-14. Loading skeletons
- 19. Content bookmarking
- 24. Avatar / profile pictures
- 26. Node detail page + lineage breadcrumb
- 27. Library entry editing + version history
- 29. Fuzzy search (Fuse.js)

</details>

<details>
<summary>Technical Debt & Quality (Sprint 1)</summary>

- T1. Extract shared `timeAgo` utility (8 tests)
- T3. Replace silent error catches (11 fixed)
- T4. `useCallback`/`useMemo` coverage
- T5. Lazy-load heavy components
- TEST-1. Service layer test coverage (all services, 65+ tests)
- TEST-2. Component integration tests (37 tests)
- TEST-3. Firestore rules tests (33 tests)
- A11Y-1. ARIA labels on interactive elements
- A11Y-2. Keyboard navigation (focus trapping, escape key)
- A11Y-3. ARIA live regions

</details>

---

## Remaining Work

---

### Security — One Remaining Item

#### S11. Firebase App Check
**Severity:** LOW | **Effort:** Small (config only)

Code exists in `src/lib/firebase.ts` with `ReCaptchaEnterpriseProvider`. Activates when `VITE_RECAPTCHA_ENTERPRISE_KEY` env var is set.

**TODO:**
- Provision ReCaptcha Enterprise key in Google Cloud Console
- Add key to production environment variables
- Smoke-test existing auth and write flows

---

### Technical Debt — One Remaining Item

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

---

## Sprint 3: Collaboration & Engagement (NEXT)

The platform's core loop works: users join → earn Rep → contribute ideas → browse knowledge. Sprint 3 shifts focus to making the platform **sticky** and **credible** — the two things an open-science hub needs to attract serious researchers.

| # | Item | Effort | Why |
|---|------|--------|-----|
| 1 | 34: Peer Review Queue | Large | Core to research credibility — proven nodes need formal validation |
| 2 | 36: Achievements & Badges | Medium | Drives retention, gives newcomers visible goals |
| 3 | 38: Spotlight System | Small | Surfaces best work, rewards quality over quantity |
| 4 | 32: Co-Authorship | Medium | Research is collaborative — single-author model is limiting |
| 5 | 16: Contribution Streaks & Stats | Medium | GitHub-style heatmap keeps people coming back |

### Sprint 3 Details

#### 34. Peer Review Queue
- Authors submit nodes or Library entries for formal peer review
- Reviewers assigned from 3000+ Rep pool (or self-select)
- Structured feedback form: accuracy, clarity, novelty, evidence quality
- Review status: pending → in review → approved / needs revision / rejected
- Approved content gets "peer-reviewed" badge + bonus Rep for author and reviewers

#### 36. Achievements & Badges
- Milestone badges: "First Node", "100 Supports Given", "Library Scholar" (10+ entries)
- Advancement-specific badges: "Fusion Pioneer", "Gene Editor", etc.
- Displayed on profile and next to username in discussions
- `achievements/{userId}_{achievementId}` collection
- Cloud Function triggers on relevant events

#### 38. Spotlight System
- Community-nominated "Idea of the Week" per advancement
- Featured contributor profiles rotated on homepage/dashboard
- Admin or 3000+ Rep can nominate; community votes
- Spotlighted content gets boosted visibility

#### 32. Co-Authorship
- Invite collaborators to co-author a Tree node or Library entry
- Co-authors listed on content, all earn Rep on supports
- `contentCollaborators/{contentId}_{userId}` collection
- Permission: original author can add/remove collaborators

#### 16. Contribution Streaks & Stats
- "X day streak" on Dashboard
- Weekly/monthly contribution graph (GitHub-style heatmap)
- "Most active in [advancement]" badge
- Rep earned breakdown by time period

---

## Sprint 4: Platform Maturity

Focus: reach, retention, and polish. Make the platform shareable, accessible offline, and maintainable.

| # | Item | Effort | Why |
|---|------|--------|-----|
| 1 | 39: PWA (offline + push notifications) | Medium | Mobile experience, re-engagement via push |
| 2 | 43: Email Digest System | Medium | Brings users back who don't check the site daily |
| 3 | 20: Export & Sharing + OG meta tags | Small | Content that can't be shared can't grow |
| 4 | 30: Research Paper Import | Medium | Bridge to the broader research world |
| 5 | T2: Break up large components | Medium | Unblocks faster iteration on feature work |

---

## Backlog — Nice to Have (P3)

Features that add value but aren't blocking growth. Pull into sprints as capacity allows.

### Polish & UX
- **22. Page Transition Animations** — View Transitions API or Framer Motion for smooth route changes
- **23. Rep History Timeline** — Visual timeline of Rep earned/lost, filterable by source and date
- **28. URL Metadata Auto-Fetch** — Cloud Function fetches OpenGraph metadata for newsroom URLs

### Discovery & Knowledge
- **17. Advancement Comparison** — Side-by-side Tree views, cross-advancement search, related ideas
- **25. 3D Tree Visualization** — Three.js force-directed graph, color-coded by node status
- **31. Knowledge Gap Detection** — Identify underpopulated Tree branches, surface frontier areas

### Collaboration
- **33. Working Groups** — Named groups around topics, group chat, shared bookmarks
- **35. Hypothesis Tracker** — hypothesis → experiment → results pipeline per Tree node

### Engagement & Gamification
- **37. Weekly Challenges** — Auto-generated or admin-curated prompts per advancement
- **45. Platform Analytics** — Custom built-in analytics (page views, growth, engagement, moderation health)

---

## Future Phases (Post-Launch)

Major platform expansions, each building on the previous. Order reflects dependency chain and strategic priority.

### Phase 6: The Dojo
- Course/lesson creation interface for professors and mentors
- Built on Library entries as modular curriculum units
- Structured learning paths per advancement (beginner → contributor-ready)
- Mentor-mentee matching based on advancement + expertise level
- Progress tracking, quizzes, completion certificates

### Phase 7: The Pool
- Donation-funded treasury with transparent accounting dashboard
- Voting system for fund allocation (3000+ Rep to vote)
- Proposal system: contributors pitch experiments, community votes to fund
- Milestone-based payouts, public ledger
- Stripe/Open Collective integration

### Phase 8: The Launchpad
- GitHub OAuth integration (merged PRs earn Rep)
- Notion / Google Docs / NotebookLM / Obsidian connectors
- External contribution tracking and verification
- Auto-sync: external activity summarized on advancement dashboard

### Phase 9: The Data Vault
- Open dataset repository (1000+ Rep to upload)
- Peer review pipeline, versioned datasets with changelogs
- Falsified data detection → Rep penalty / ban + Tree node re-verification
- Integration with Hypothesis Tracker (P3-35)

### Phase 10: Advanced Reputation
- Google Scholar citation integration
- Breakthrough awards (+500 Rep)
- Rep decay for inactivity, negative Rep enforcement
- Rep leaderboard per advancement, reputation API

### Phase 11: Community & Social
- Discord integration (auto-role by Rep tier)
- @mentions, direct messaging, "follow" users/advancements
- Community events calendar (AMAs, hackathons, paper readings)

### Phase 12: Content Quality
- Plain-language research paper translations (bounty-funded from Pool)
- Citation graph between nodes
- Quality scoring algorithm, "Verified" badge
- Automated plagiarism detection

### Phase 13: Platform & Infrastructure
- **40. Public API** — REST/GraphQL for read-only access, rate-limited by Rep
- **41. Embeddable Widgets** — Tree branch viewer for external sites
- **42. Internationalization (i18n)** — Locale files, RTL, community translations
- **44. Webhook & Integration Bus** — User-configurable webhooks, Slack integration
- **21. Analytics Dashboard (Admin)** — Growth charts, retention metrics, moderation stats

---

## Progress Summary

| Area | Status |
|------|--------|
| MVP (Phases 1-5.6) | COMPLETE |
| Security (S1-S15) | 14/15 done (S11 App Check remains — config only) |
| Technical Debt (T1-T5) | 4/5 done (T2 component splits remain) |
| Testing (TEST 1-3) | COMPLETE (41 test files, 140+ tests) |
| Accessibility (A11Y 1-3) | COMPLETE |
| Sprint 1: Code Quality | COMPLETE |
| Sprint 2: Discovery & Content | COMPLETE |
| **Sprint 3: Collaboration** | **NEXT** |
| Sprint 4: Platform Maturity | PLANNED |
| Future Phases (6-13) | PLANNED |
