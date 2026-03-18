# The Guild — MVP Plan

## Status: COMPLETE (archived)

All MVP phases and core features are implemented. This plan is kept as a historical record.

For active development, see `features-and-ux-roadmap.md`.

---

## What Was Built

### Phase 1: Project Setup + User System
- Registration with email (school email detection for bonus Rep)
- Login/logout (session-based auth via Firebase Auth)
- Profile page showing Rep balance and contributions
- Single-account enforcement (email uniqueness)
- Email verification flow with school email bonus via Cloud Function
- Edit profile (bio, interests, country, background)

### Phase 2: Reputation System
- Rep balance per user, starting at 0
- School email verification → +100 Rep (via Cloud Function)
- Vouch from existing member with 100+ Rep → +100 Rep
- Idea support → +10 Rep per support
- Rep ladder gates access (observer 0-99, contributor 100+, moderator 3000+)
- Admin flag (repPoints === -1) with Firebase custom claims

### Phase 3: The Tree (Core Feature)
- Browse advancements (6 top-level categories)
- View idea nodes in a tree structure per advancement
- Create idea nodes (100+ Rep required)
- Create subnodes (build on existing ideas)
- Support/upvote ideas
- Node status management (theoretical/proven/disproved by moderators)
- Search/filter and sort nodes
- Node editing for authors and moderators

### Phase 4: The Grand Library
- Browse entries per advancement with difficulty levels
- Create entries (1500+ Rep or admin)
- Entry detail pages with markdown rendering
- Search across entries

### Phase 5: The Newsroom + Sub-Hubs
- News feed per advancement with submit/vote/sort
- Advancement sub-hub pages with tabbed navigation
- Discussion forum with threads and replies

### Phase 5.6: UX & Navigation Overhaul
- Command Palette (Cmd+K), context-aware navbar, pillar identity system
- Dashboard for logged-in users, advancement switcher
- Newcomer onramp banners, section headers

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
