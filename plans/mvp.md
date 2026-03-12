# The Guild — MVP Plan

## MVP Goal

Deliver the smallest working version of The Guild that demonstrates the core loop: **users join, earn Rep, contribute ideas to The Tree, and browse knowledge**.

## Current Status (as of 2026-03-11)

### Done
- [x] Project setup (Vite + React + TypeScript + Vitest + Tailwind + Firebase)
- [x] Firebase Auth (email/password) + Firestore integration
- [x] Domain models: user, reputation, advancement, node, vouch, library-entry, news-link, onboarding, globe-data
- [x] Registration + login UI
- [x] Onboarding flow (country, background, interests, bio)
- [x] Profile page with Rep tier display + vouch panel
- [x] 6 Advancements seeded + browsable grid + detail pages
- [x] School email detection for bonus Rep
- [x] Vouch system (Firestore + UI)
- [x] Rep-gated access (RepGate component)
- [x] The Tree: node CRUD, tree view, create node/subnode, support/upvote, status management
- [x] The Grand Library: browse entries, create entries, entry detail page, difficulty levels
- [x] The Newsroom: news feed per advancement, submit links, upvote/downvote
- [x] Globe data / country-based member stats on homepage
- [x] 3D hero with interactive particle constellation (React Three Fiber)
- [x] Dark void aesthetic with advancement-colored theming throughout

### Phases Complete
- **Phase 1**: Project Setup + User System — **DONE**
- **Phase 2**: Reputation System — **DONE**
- **Phase 3**: The Tree — **DONE**
- **Phase 4**: The Grand Library — **DONE**
- **Phase 5**: The Newsroom — **DONE**
- **Phase 5.5**: Advancement Sub-Hubs — **DONE**
  - Tabbed sub-hub pages per advancement (Overview, Tree, Discussions, Library, Platforms)
  - Discussion forum with threads + replies (domain, service, UI)
  - External platforms config per advancement (GitHub, journals, orgs, tools)
  - Live stats per advancement (ideas, threads, entries, links)
- **Phase 5.6**: UX & Navigation Overhaul — **DONE**
  - Pillar identity system (colors + icons per feature: Tree/green, Library/cyan, Newsroom/violet, Discussions/amber, Platforms/slate)
  - Context-aware navbar (transforms when inside advancement sub-hub, shows breadcrumb + advancement switcher)
  - Command Palette (Cmd+K) for fast navigation across advancements and pages
  - Contextual onramp banners for newcomers (auth-aware, Rep-aware, dismissible)
  - Advancement switcher dropdown in sub-hub for quick cross-advancement travel
  - Section headers with context (dismissible explainers per sub-hub tab)
  - Dashboard for logged-in users (replaces landing page with personalized hub: contributions, activity, quick actions)

---

## What's IN the MVP

### 1. User System
- Registration with email (school email detection for bonus Rep)
- Login/logout (session-based auth)
- Profile page showing Rep balance and contributions
- Single-account enforcement (email uniqueness)

### 2. Reputation System (Simplified)
- Rep balance per user, starting at 0
- Earning Rep:
  - School email verification → +100 Rep (auto-detected via `.edu` domain)
  - Vouch from existing member with 100+ Rep → +100 Rep (one vouch per new user)
  - Idea gets upvoted/supported → +10 Rep per support
- Rep ladder gates access (read-only at 0-100, contribute at 100+)

### 3. The Tree (Core Feature)
- Browse advancements (6 top-level categories)
- View idea nodes in a tree structure per advancement
- Create a new idea node (requires 100+ Rep)
- Build on an existing idea (create subnode)
- Support/upvote an idea
- Node status: Red (theoretical), Green (proven — set by 3000+ Rep moderators), Black (disproved — set by moderators, hides sub-tree)
- Each node shows: title, description, creator, status, support count

### 4. The Grand Library (Read-Only for MVP)
- Browse curated learning resources per advancement
- Moderators (3000+ Rep) can add/edit library entries
- Each entry: title, content (markdown), advancement category, contributor

### 5. Basic Newsroom (Minimal)
- Simple feed of links/articles per advancement
- Anyone with 100+ Rep can submit a link
- Upvote/downvote links

---

## What to Improve (Polish & UX)

### Hero & Homepage
- [x] Add loading skeleton / fallback while 3D scene initializes — gradient orb fallback
- [x] Lazy-load the 3D scene so it doesn't block initial paint (dynamic import)
- [x] Add a scroll-down indicator / animated chevron at bottom of hero
- [x] Animate the advancement cards on scroll (intersection observer — all sections)
- [x] Add live stats to homepage (members, ideas, library entries, news links via getCountFromServer)
- [x] Make the 3D hero gracefully degrade on mobile / low-power devices (gradient orb fallback on <768px)

### Navigation & Layout
- [x] Add mobile hamburger menu (full-screen overlay, body scroll lock, closes on nav)
- [x] Active route highlighting in navbar (was already there, verified)
- [x] Breadcrumb navigation for nested pages (advancement detail + library entry)
- [ ] Page transition animations between routes

### Profile & User Experience
- [x] Show user's contributions on profile (tabbed: ideas, library entries, news links)
- [ ] Rep history timeline (show when and how Rep was earned/lost)
- [ ] Avatar / profile picture support (Firebase Storage or Gravatar)
- [x] Edit profile (update bio, interests, country, background after onboarding)
- [ ] Notification system for vouches received, nodes supported, etc.

### The Tree
- [ ] 3D tree visualization using Three.js (currently a flat list/tree view)
- [x] Search/filter nodes within an advancement
- [ ] Node detail page (dedicated route, not just inline expand)
- [x] Discussion / comments on nodes (full discussion forum per advancement)
- [x] Node edit capability for authors (and moderators)
- [ ] Show node lineage (path from root to current node)
- [x] Sort nodes by: newest, most supported, status

### The Grand Library
- [x] Markdown rendering for entry content (lightweight built-in renderer: headers, bold, italic, links, code, lists)
- [x] Search across all library entries
- [ ] Related entries / cross-advancement linking
- [ ] Reading progress or bookmarks
- [ ] Entry edit/update capability

### The Newsroom
- [ ] Auto-fetch metadata from submitted URLs (title, image, description via OpenGraph)
- [x] Sort by: hot, new, top (time-weighted scoring via gravity decay)
- [ ] Link preview cards with thumbnails
- [ ] Flag/report inappropriate links
- [ ] Pagination or infinite scroll

### Design System & Polish
- [x] Consistent loading states across all pages (branded PageLoader with animated gradient logo)
- [x] Error boundary with branded error page
- [x] Empty states with SVG illustrations (tree, book, newspaper, search, user icons)
- [x] Toast / notification system for success/error feedback (ToastProvider + useToast hook)
- [x] Smooth page scroll behavior (CSS scroll-behavior: smooth)
- [x] Accessibility pass (skip-to-content link, aria labels on nav/search/buttons, semantic roles)
- [x] Code-split routes for smaller initial bundle (1.7MB → 738KB main, 922KB lazy 3D scene)

---

## What's Next (Post-MVP Features)

### Phase 6: The Dojo
- Academic learning environment built on top of The Grand Library
- Structured courses / learning paths per advancement
- Professors/teachers create curriculum content
- Mentoring system connecting experienced contributors with newcomers
- Progress tracking and completion certificates

### Phase 7: The Pool
- Donation-funded treasury with transparent accounting
- Monthly maintenance costs deducted automatically
- Remainder funds promising ideas and experiments
- Contributors earn Pool allocation based on Rep and contributions
- Voting system for fund allocation (3000+ Rep members)

### Phase 8: The Launchpad
- GitHub integration (merged PRs earn Rep)
- Notion / Obsidian / Google Docs connectors
- NotebookLM integration for research
- External contribution tracking and Rep rewards
- Summarizes current state of ideas across platforms
- Access gated by Rep level

### Phase 9: The Data Vault
- Open dataset repository
- Upload requires 1000+ Rep
- Peer review pipeline for dataset quality
- Organizational backing verification
- Falsified data detection → huge Rep penalty / instant ban + Tree node re-verification
- Dataset versioning and citation tracking

### Phase 10: Advanced Reputation
- Google Scholar citation integration for Rep
- Breakthrough awards (+500 Rep for verified breakthroughs)
- Rep decay for inactivity (gentle, to encourage ongoing contribution)
- Negative Rep enforcement (temp ban system)
- Rep leaderboard per advancement

### Phase 11: Community & Social
- Discord integration (auto-role based on Rep tier)
- @mentions and notifications within the platform
- Contributor spotlight system for promising ideas
- Weekly digest emails
- RSS feeds for The Newsroom

### Phase 12: Content Quality
- Plain-language research paper translations (crowdsourced)
- Bounty system for knowledge gaps (funded by The Pool)
- Peer review workflow for Library entries
- Citation graph between nodes
- Advanced moderation tools (audit log, bulk actions, appeals)

---

## Tech Stack

- **Frontend**: React 19 + TypeScript (strict mode) + Vite
- **Backend**: Firebase (Auth + Firestore)
- **Database**: Firestore
- **Auth**: Firebase Auth (email/password)
- **Testing**: Vitest + Testing Library
- **Styling**: Tailwind CSS
- **3D Visualization**: Three.js (via @react-three/fiber + @react-three/drei)
- **Deployment**: Firebase Hosting
- **Fonts**: Bricolage Grotesque (display), Sora (body), JetBrains Mono (mono)

## Domain Model (Firestore Collections)

```
users/{uid}         { email, displayName, repPoints, isSchoolEmail, createdAt, onboardingComplete, country, background, interests, bio }
advancements/{id}   { name, description }
nodes/{id}          { advancementId, parentNodeId?, authorId, title, description, status(theoretical|proven|disproved), supportCount, createdAt }
nodeSupports/{id}   { nodeId, userId, createdAt }
vouches/{id}        { voucherId, voucheeId, createdAt }
libraryEntries/{id} { advancementId, authorId, title, content, difficulty, createdAt }
newsLinks/{id}      { advancementId, submitterId, title, url, score, createdAt }
newsVotes/{id}      { newsLinkId, userId, value(+1|-1), createdAt }
discussionThreads/{id} { advancementId, authorId, authorName, title, body, replyCount, lastActivityAt, createdAt }
discussionReplies/{id} { threadId, authorId, authorName, body, createdAt }
globeData/{country} { count }
```

## Decisions

- **Tree visualization**: Three.js via @react-three/fiber for 3D trees (planned, currently 2D)
- **Deployment**: Firebase Hosting + Firestore
- **School email verification**: Domain check only for MVP (no confirmation email)
- **Hero**: Interactive 3D particle constellation with advancement-colored orbs (React Three Fiber)
- **Bundle size**: ~1.7MB — needs code-splitting before production launch
