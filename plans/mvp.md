# The Guild — MVP Plan

## MVP Goal

Deliver the smallest working version of The Guild that demonstrates the core loop: **users join, earn Rep, contribute ideas to The Tree, and browse knowledge**.

## Status: COMPLETE

All MVP phases and core features are implemented and functional.

### Phases Complete
- **Phase 1**: Project Setup + User System
- **Phase 2**: Reputation System
- **Phase 3**: The Tree
- **Phase 4**: The Grand Library
- **Phase 5**: The Newsroom
- **Phase 5.5**: Advancement Sub-Hubs (tabbed pages, discussions, platforms config, live stats)
- **Phase 5.6**: UX & Navigation Overhaul (pillar identity, context-aware navbar, command palette, onramp banners, advancement switcher, section headers, dashboard)

---

## What's IN the MVP (all done)

### 1. User System
- [x] Registration with email (school email detection for bonus Rep)
- [x] Login/logout (session-based auth via Firebase Auth)
- [x] Profile page showing Rep balance and contributions
- [x] Single-account enforcement (email uniqueness)
- [x] Email verification flow with school email bonus via Cloud Function
- [x] Edit profile (bio, interests, country, background)

### 2. Reputation System
- [x] Rep balance per user, starting at 0
- [x] School email verification → +100 Rep (via Cloud Function after email verification)
- [x] Vouch from existing member with 100+ Rep → +100 Rep
- [x] Idea support → +10 Rep per support
- [x] Rep ladder gates access (observer 0-99, contributor 100+, moderator 3000+)
- [x] Admin flag (repPoints === -1) with Firebase custom claims

### 3. The Tree (Core Feature)
- [x] Browse advancements (6 top-level categories)
- [x] View idea nodes in a tree structure per advancement
- [x] Create idea nodes (100+ Rep required)
- [x] Create subnodes (build on existing ideas)
- [x] Support/upvote ideas
- [x] Node status management (theoretical/proven/disproved by moderators)
- [x] Search/filter and sort nodes
- [x] Node editing for authors and moderators

### 4. The Grand Library
- [x] Browse entries per advancement with difficulty levels
- [x] Create entries (1500+ Rep or admin)
- [x] Entry detail pages with markdown rendering
- [x] Search across entries

### 5. The Newsroom
- [x] News feed per advancement
- [x] Submit links (100+ Rep)
- [x] Upvote/downvote with score tracking
- [x] Sort by hot/new/top (gravity decay scoring)

### 6. Discussion Forum
- [x] Thread creation and replies per advancement
- [x] Thread/reply editing and deletion (author or moderator)
- [x] Reply counts and last activity tracking

---

## Polish Items (from original plan)

### Done
- [x] 3D hero with interactive particle constellation + gradient orb fallback
- [x] Loading skeleton / fallback while 3D scene initializes
- [x] Lazy-loaded 3D scene (dynamic import)
- [x] Scroll-down indicator / animated chevron
- [x] Scroll-triggered animations (intersection observer)
- [x] Live stats on homepage (members, ideas, entries, links)
- [x] Mobile-responsive 3D hero (gradient fallback on <768px)
- [x] Mobile hamburger menu (full-screen overlay, scroll lock)
- [x] Breadcrumb navigation for nested pages
- [x] User contributions on profile (tabbed: ideas, entries, links)
- [x] Edit profile post-onboarding
- [x] Discussion / comments on nodes
- [x] Markdown rendering for library entries
- [x] Search across library entries
- [x] Sort newsroom by hot/new/top
- [x] Consistent loading states (branded PageLoader)
- [x] Error boundary with branded error page
- [x] Empty states with SVG illustrations
- [x] Toast notification system
- [x] Accessibility pass (skip-to-content, aria labels, semantic roles)
- [x] Code-split routes
- [x] Node sort by newest/most supported/status

### Remaining (nice-to-have, not blocking launch)

All items below are now tracked as P3 features in `features-and-ux-roadmap.md`:
- Page transition animations (P3-22)
- Rep history timeline (P3-23)
- Avatar / profile pictures (P3-24)
- 3D tree visualization (P3-25)
- Node detail page + lineage (P3-26)
- Library entry editing (P3-27)
- URL metadata auto-fetch + link previews (P3-28)
- Content bookmarking (P3-19)

---

## What's Next

MVP is complete. All further development — technical debt, testing, accessibility, P3 features, and future phases — is tracked in `features-and-ux-roadmap.md`.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript (strict mode) + Vite 6
- **Backend**: Firebase (Auth + Firestore + Cloud Functions)
- **Testing**: Vitest + Testing Library
- **Styling**: Tailwind CSS
- **3D**: Three.js (via @react-three/fiber + @react-three/drei)
- **Deployment**: Firebase Hosting
- **Runtime**: Bun
- **Fonts**: Bricolage Grotesque (display), Sora (body), JetBrains Mono (mono)

## Domain Model (Firestore Collections)

```
users/{uid}                { email, displayName, repPoints, isSchoolEmail, emailVerified, createdAt, onboardingComplete, country, background, interests, bio }
advancements/{id}          { name, description }
nodes/{id}                 { advancementId, parentNodeId?, authorId, title, description, status, supportCount, createdAt }
nodeSupports/{id}          { nodeId, userId, createdAt }
vouches/{id}               { voucherId, voucheeId, createdAt }
libraryEntries/{id}        { advancementId, authorId, title, content, difficulty, createdAt }
newsLinks/{id}             { advancementId, submitterId, title, url, score, createdAt }
newsVotes/{id}             { newsLinkId, userId, value(+1|-1), createdAt }
discussionThreads/{id}     { advancementId, authorId, authorName, title, body, replyCount, lastActivityAt, createdAt, updatedAt }
discussionReplies/{id}     { threadId, authorId, authorName, body, createdAt, updatedAt }
notifications/{id}         { userId, type, message, link, read, createdAt }
flags/{id}                 { targetCollection, targetId, reporterId, reason, details, status, createdAt }
auditLog/{id}              { actorId, actorName, action, targetCollection, targetId, details, createdAt }
globeData/{country}        { count }
```
