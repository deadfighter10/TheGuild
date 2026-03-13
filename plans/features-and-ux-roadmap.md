# Features & UX Roadmap

> Comprehensive plan of missing features, security hardening, and UX improvements, prioritized by impact.
> Generated from a full codebase audit on 2026-03-12.
> Updated with security audit on 2026-03-12.

---

## S0 — Security Critical (must fix before public launch)

### ~~S1. Firestore Rules: Overly Permissive Update Rules~~ DONE

**Severity:** CRITICAL

**Problem:** Every `update` rule is `allow update: if request.auth != null`. This means any authenticated user can update any other user's document, any node, any library entry, any news link, and any discussion thread — regardless of ownership.

**Attack vector:** Open browser console, call `updateDoc(doc(db, "users", victimUid), { repPoints: 99999 })` — instant privilege escalation. Or delete someone else's bio, or change a node's status to "proven" without moderator rights.

**Affected collections:** `users`, `nodes`, `libraryEntries`, `newsLinks`, `discussionThreads`

**Fix:**
```
// Users: only owner can update their own profile
match /users/{userId} {
  allow update: if request.auth != null && request.auth.uid == userId;
}

// Nodes: only author can update, or moderator (store as custom claim)
match /nodes/{nodeId} {
  allow update: if request.auth != null
    && (request.auth.uid == resource.data.authorId
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.repPoints >= 3000
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.repPoints == -1);
}

// Library entries: same pattern (author or moderator)
// News links: same pattern
// Discussion threads: same pattern
```

For admin operations (rep changes, deletions from admin panel), use Firebase Admin SDK via Cloud Functions instead of direct client writes.

**Effort:** Medium — rewrite firestore.rules, may need Cloud Functions for admin actions

---

### ~~S2. Rep Validation is Client-Side Only~~ DONE

**Severity:** CRITICAL

**Problem:** Every service function accepts `authorRep` as a parameter and validates it locally. A malicious user can call `createNode({ authorRep: 5000, ... })` directly, bypassing the rep gate entirely. The Firestore rules don't check rep at all.

**Affected:** `node-service.ts`, `library-service.ts`, `news-service.ts`, `discussion-service.ts`, `vouch-service.ts`

**Fix (two options):**

**Option A — Firestore Rules (simpler, limited):**
```
match /nodes/{nodeId} {
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.repPoints >= 100;
}
```
This reads the user's actual rep from Firestore during the write. Costs 1 extra read per write but is fully server-enforced.

**Option B — Cloud Functions (more flexible):**
Move content creation into callable Cloud Functions that read the user's rep server-side. Client calls the function, function validates and writes. This also enables rate limiting and audit logging.

**Effort:** Medium (Option A) or Large (Option B)

---

### S3. Admin Authorization Has No Backend Enforcement

**Severity:** CRITICAL

**Problem:** Admin access is checked only in React (`isAdmin(guildUser.repPoints)`). The admin service functions (`deleteUser`, `updateUserRep`, `deleteNode`, etc.) are plain Firestore calls with no server-side authorization. Combined with S1, any user can set their own rep to -1 and gain full admin access.

**Fix:**
- Use Firebase Auth custom claims: `{ admin: true }` set via Admin SDK
- Check custom claims in Firestore rules: `request.auth.token.admin == true`
- Admin operations (delete user, change rep, delete content) should go through Cloud Functions that verify the custom claim server-side
- Remove client-side `repPoints === -1` as the admin mechanism; use custom claims instead

**Effort:** Large — requires Firebase Admin SDK setup, Cloud Functions, claim management

---

### ~~S4. Markdown Renderer Vulnerable to XSS via Link URLs~~ DONE

**Severity:** HIGH

**File:** `src/shared/components/Markdown.tsx` line 14

**Problem:** The markdown renderer escapes HTML entities but then injects raw URLs into `<a href="$2">` without validating the URL protocol. A user can inject `javascript:` or `data:` URLs, or break out of the href attribute.

**Attack examples:**
```markdown
[Click](javascript:alert(document.cookie))
[Click](data:text/html,<script>alert('xss')</script>)
[Click](" onmouseover="alert('xss'))
```

**Fix:** Sanitize URLs before injecting into href:
```typescript
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url
  } catch { /* invalid URL */ }
  return "#"
}
```
Apply in `renderInline()` before the link regex replacement. Also encode quotes in the URL to prevent attribute breakout.

**Effort:** Small — one function, one regex change

---

### S5. No Email Verification Before Granting School Email Rep Bonus

**Severity:** HIGH

**File:** `src/features/auth/AuthContext.tsx`

**Problem:** On registration, `isSchoolEmail(email)` grants +100 Rep instantly. Firebase Auth does not verify email ownership. Anyone can register with `fake@mit.edu` and get contributor-level access immediately.

**Fix:**
- Call `sendEmailVerification(user)` after `createUserWithEmailAndPassword()`
- Set initial `repPoints: 0` for all users regardless of email domain
- Grant the school email bonus only after the user clicks the verification link
- Check `user.emailVerified` before applying the bonus (via Cloud Function trigger on email verification, or on next login)

**Effort:** Medium — Firebase verification is built-in, but the rep bonus timing needs redesigning

---

### ~~S6. Iframe Injection via User-Provided URLs~~ DONE

**Severity:** MEDIUM

**File:** `src/features/library/LibraryEntryPage.tsx`

**Problem:** The `DocumentViewer` component renders `<iframe src={url} />` where `url` comes from a user-created library entry. While the form validates URLs client-side, a direct Firestore write (see S1) can store any URL. The iframe then loads arbitrary content in the user's browser.

**Fix:**
- Re-validate URLs at render time (not just at creation time)
- Only allow iframes for whitelisted domains (YouTube, known PDF hosts)
- For unknown URLs, render as a link card instead of an iframe
- Add `sandbox` attribute to iframes: `sandbox="allow-scripts allow-same-origin"`
- YouTube iframes already use `youtube-nocookie.com` (good)

**Effort:** Small

---

### ~~S7. No Rate Limiting on Any Actions~~ DONE (Phase 1)

**Severity:** MEDIUM

**Problem:** No rate limiting exists anywhere. A malicious user with 100+ Rep can create thousands of nodes, threads, links, or library entries. They can also spam votes on every news link.

**Fix (phased):**
- **Phase 1 — Client-side throttle:** Debounce submit buttons, disable for 2s after action
- **Phase 2 — Firestore rules rate limit:** Use `request.time` comparisons:
  ```
  allow create: if request.auth != null
    && request.time > resource.data.createdAt + duration.value(30, 's');
  ```
  (Firestore rate-limit rules are limited, but prevent rapid-fire writes)
- **Phase 3 — Cloud Functions:** Proper per-user rate limiting with a counter collection tracking actions per time window

**Effort:** Phase 1 small, Phase 2 small, Phase 3 medium

---

### ~~S8. No Input Length Limits in Firestore Rules~~ DONE

**Severity:** MEDIUM

**Problem:** While domain validation checks title/description are non-empty, there are no maximum length checks in Firestore rules. A malicious user can bypass client validation and store megabytes of text in a single document field, causing rendering issues and inflated Firestore costs.

**Affected fields:** Node title/description, thread title/body, reply body, library entry content, news link title, user bio

**Fix:** Add size constraints in Firestore rules:
```
allow create: if request.resource.data.title.size() <= 200
  && request.resource.data.description.size() <= 5000;
```
Also add corresponding max-length checks in domain validation functions and `maxLength` attributes on form inputs.

**Effort:** Small

---

## S1 — Security Important (fix soon after launch)

### ~~S9. No Audit Logging for Destructive Actions~~ DONE

**Severity:** MEDIUM

**Problem:** Admin deletions, rep changes, status changes, and user bans leave no trail. If an admin account is compromised, there's no way to know what was changed.

**Fix:**
- Create an `auditLog` Firestore collection: `{ actorId, action, targetCollection, targetId, details, timestamp }`
- Log all admin actions: delete user, change rep, delete content, change node status
- Make audit log append-only (Firestore rules: `allow create` only, no update/delete)
- Add "Audit Log" tab to admin panel

**Effort:** Medium

---

### S10. No CSRF/Session Protection Beyond Firebase Auth

**Severity:** LOW

**Problem:** Firebase Auth tokens are stored in IndexedDB/localStorage. While Firebase handles token refresh and expiry, there's no session invalidation mechanism if a user's account is compromised. No "sign out all devices" feature.

**Fix:**
- Add "Sign out everywhere" button to profile (revoke Firebase refresh tokens via Admin SDK)
- Add `lastPasswordChange` timestamp to user doc
- Optionally: show active sessions list

**Effort:** Medium (requires Cloud Function)

---

### S11. Sensitive Data Exposure in Client Bundle

**Severity:** LOW

**Problem:** Firebase config (API key, project ID, etc.) is embedded in the client bundle. While Firebase API keys are designed to be public (security comes from Firestore rules and Auth), the project ID enables enumeration of the Firestore API endpoint.

**Current mitigation:** This is acceptable for Firebase apps — the real security boundary is Firestore rules (which need fixing per S1-S3).

**Additional hardening:**
- Enable Firebase App Check to verify requests come from your app, not arbitrary API calls
- Set up Firestore security rule monitoring in Firebase Console
- Enable Firebase Auth abuse prevention (rate limiting on sign-ups)

**Effort:** Small (App Check is config-only)

---

### ~~S12. No Content Security Policy (CSP) Headers~~ DONE

**Severity:** LOW

**Problem:** No CSP headers configured. The app embeds iframes (YouTube, document viewer) and uses `dangerouslySetInnerHTML` for Markdown. Without CSP, a successful XSS attack has full access to the page.

**Fix:** Add CSP headers via Firebase Hosting config in `firebase.json`:
```json
{
  "hosting": {
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://www.youtube-nocookie.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com; img-src 'self' data: https:;"
      }]
    }]
  }
}
```

**Effort:** Small — config change, then test to ensure nothing breaks

---

### ~~S13. Dependency Security Monitoring~~ DONE

**Severity:** LOW

**Problem:** No automated dependency vulnerability scanning. The project uses `firebase`, `react`, `three`, and other packages that could have CVEs discovered.

**Fix:**
- Add Dependabot config (`.github/dependabot.yml`) for automated PR creation on vulnerable deps
- Add `npm audit` / `bun audit` step to CI pipeline
- Consider Snyk or Socket for deeper supply-chain analysis

**Effort:** Small

---

## Security Implementation Order

**Before public launch (S0):**
1. S4: Fix Markdown XSS (small, immediate risk)
2. S1: Fix Firestore update rules (medium, critical)
3. S8: Add input length limits to rules (small)
4. S6: Sandbox iframes (small)
5. S2: Server-side rep validation in rules (medium)
6. S7: Client-side rate limiting (small, Phase 1)
7. S12: Add CSP headers (small)
8. S13: Add Dependabot (small)

**Soon after launch:**
9. S5: Email verification flow (medium)
10. S3: Admin custom claims + Cloud Functions (large)
11. S9: Audit logging (medium)
12. S7: Server-side rate limiting (medium, Phase 2-3)
13. S11: Firebase App Check (small)
14. S10: Session management (medium)

---

## P0 — Critical (breaks core experience)

### ~~1. Pagination Everywhere~~ DONE (Library, News, Discussions)

**Problem:** Every list view loads all data at once. With 50+ users this will break.

**Where:**
- Newsroom: loads all links per advancement
- Library: loads all entries per advancement
- Tree: renders all nodes recursively
- Discussion threads + replies
- Admin panel tables
- Dashboard activity feed (hardcapped at 8 but fetches all)
- Profile contributions tabs

**Solution:** Cursor-based pagination using Firestore `startAfter()` + `limit()`. Load 20 items per page with "Load more" buttons. For the Tree, virtualize rendering for branches with 50+ nodes.

**Effort:** Medium — touches every service file and list component

---

### ~~2. Error Feedback on Actions~~ DONE

**Problem:** When creating ideas, submitting links, posting threads, voting, or editing profiles, failures show generic messages or nothing at all. Users don't know if their action worked.

**Where:**
- TreeView: support/status change catches errors silently
- DiscussionForum: thread/reply creation has no success confirmation
- NewsroomPage: vote failures caught silently
- ProfilePage: edit save has no success state
- LibraryEntryForm: save errors are vague

**Solution:**
- Use the existing Toast system (`useToast()`) for success/error feedback on every mutation
- Show inline validation errors before submit, not after server rejection
- Add loading spinners to all submit buttons (some already have this, make consistent)

**Effort:** Small — mostly wiring up existing Toast component

---

### 3. Content Moderation Basics

**Problem:** No way for moderators to flag, hide, or act on problematic content. Admin can delete, but regular moderators (3000+ Rep) have no tools.

**Missing:**
- Report/flag button on nodes, threads, replies, news links, library entries
- Flagged content queue for moderators
- Temp-ban mechanic (negative rep = banned, but no UI to trigger it)
- Reason logging for deletions

**Solution:**
- Add `flags` subcollection on each content type (userId, reason, createdAt)
- Flag button on every content card (available to all authenticated users)
- New "Flags" tab in admin panel showing flagged content
- Moderator action: dismiss flag, delete content, warn user
- Domain function: `applyRepPenalty(userId, amount, reason)` for rule-breaking

**Effort:** Large — new domain model, service layer, UI components, admin tab

---

## P1 — High Impact (significant UX improvement)

### 4. Notification System

**Problem:** Users have no idea when someone replies to their thread, supports their idea, vouches for them, or when their content is flagged. They have to manually check.

**Solution (in-app only, no email for v1):**
- `notifications` Firestore collection: `{ userId, type, message, link, read, createdAt }`
- Types: `reply`, `support`, `vouch`, `flag`, `rep_change`, `status_change`
- Bell icon in navbar with unread count badge
- Notification dropdown/page listing recent notifications
- Mark as read on click, "Mark all read" button
- Trigger notifications from service functions (when creating reply, supporting node, etc.)

**Effort:** Medium — new collection, service, UI component, integration into existing services

---

### 5. Real-Time Updates

**Problem:** If two users are viewing the same advancement's Tree or Discussion tab, changes from one don't appear for the other until they refresh.

**Solution:**
- Use Firestore `onSnapshot()` listeners for active views instead of one-time `getDocs()`
- Apply to: Tree nodes, discussion threads/replies, news link scores
- Show subtle "New content available" banner when data changes, or auto-merge

**Effort:** Medium — replace fetch patterns in services with snapshot listeners

---

### ~~6. Search That Works~~ DONE (Phase 1)

**Problem:** Current search is client-side text matching on already-loaded data. No way to search across the platform.

**Where it's broken:**
- Command palette (Cmd+K) only searches page names and advancement names
- Library search only matches loaded entry titles
- Newsroom has no search at all
- Tree search only matches loaded node titles/descriptions
- Admin panel search is client-side

**Solution (phased):**
- **Phase 1:** Add search inputs to Newsroom and Admin that filter loaded data (consistent with Library/Tree)
- **Phase 2:** Global search in command palette that queries Firestore across collections (nodes, entries, links, threads) using `where` + `orderBy` on title fields
- **Phase 3 (future):** Algolia or Typesense integration for full-text search

**Effort:** Phase 1 small, Phase 2 medium

---

### ~~7. Thread & Reply Editing/Deletion~~ DONE

**Problem:** Users can't edit or delete their own discussion posts. No thread owner controls.

**Missing:**
- Edit button on own threads and replies
- Delete button on own threads and replies (or moderator)
- "Edited" indicator with timestamp
- Soft-delete (mark as deleted, show "[deleted]" placeholder)

**Solution:**
- Add `validateEditThread`, `validateDeleteThread`, `validateEditReply`, `validateDeleteReply` to domain
- Add edit/delete service functions
- Add UI controls (edit icon, delete with confirmation)
- Track `updatedAt` field, show "edited" badge if different from `createdAt`

**Effort:** Medium

---

### 8. Responsive & Mobile Polish

**Problem:** Several pages are functional on mobile but not optimized.

**Issues found:**
- Advancement detail page tabs are cramped on small screens
- Library sidebar filters stack awkwardly
- Newsroom vote buttons are tight on mobile
- Admin panel tables overflow horizontally
- Tree view indentation becomes unreadable at 3+ levels on narrow screens
- Command palette input is small on mobile
- Profile edit form fields are tight

**Solution:**
- Advancement tabs: horizontal scroll or dropdown on mobile
- Library: move sidebar filters into a collapsible drawer
- Newsroom: compact vote button layout
- Admin: horizontal scroll wrapper on tables, or card layout on mobile
- Tree: reduce indent per level on small screens, collapse deeper levels by default
- Profile: full-width form fields

**Effort:** Medium — lots of small Tailwind tweaks across many components

---

## P2 — Medium Impact (better experience)

### ~~9. Rich Text / Markdown Editor for Content Creation~~ DONE

**Problem:** All content creation uses plain textarea inputs. Library articles, node descriptions, and discussion posts could benefit from formatting.

**Solution:**
- Add a lightweight markdown toolbar above textareas (bold, italic, heading, link, code, list)
- Live preview toggle for Library entries
- Render all user content through the existing Markdown component consistently
- Keep it simple — no WYSIWYG, just markdown shortcuts

**Effort:** Medium

---

### ~~10. User Profile Public Pages~~ DONE

**Problem:** Users can only see their own profile. There's no way to view another member's contributions, tier, or bio.

**Solution:**
- Route: `/users/:uid` — public profile page
- Shows: display name, tier badge, bio, interests, contributions
- Doesn't show: email, country (privacy)
- Link user names everywhere (node authors, thread authors, news submitters) to their profile
- Vouch button on other users' profiles

**Effort:** Medium — new page, new service function, update all author displays to link

---

### ~~11. Advancement Activity Feed~~ DONE

**Problem:** The Overview tab on advancement detail pages shows static stat cards but no sense of what's happening. Users can't see recent activity across pillars for a specific advancement.

**Solution:**
- Add "Recent Activity" section to Overview tab (similar to Dashboard activity feed)
- Show latest 10 items across nodes, threads, entries, links for that advancement
- Time-ago formatting, icon-coded by type
- "View all" links to respective tabs

**Effort:** Small — reuse Dashboard activity pattern with advancement filter

---

### ~~12. Onboarding Improvements~~ DONE

**Problem:** After onboarding, users land on their profile with 0 or 100 Rep and no guidance on what to do next.

**Solution:**
- Post-onboarding welcome modal/banner on first Dashboard visit explaining next steps
- "Getting Started" checklist: View an advancement, Read a library entry, Join a discussion, Submit your first idea
- Track checklist completion in user doc, dismiss when all done
- Vouch CTA if user has school email bonus but hasn't been vouched yet

**Effort:** Small-Medium

---

### ~~13. Dark Mode Refinements~~ DONE

**Problem:** The app is dark-only. While this fits the aesthetic, some contrast issues exist.

**Issues:**
- White/20 and White/25 text can be hard to read on void backgrounds
- Form input borders are very subtle (white/10)
- Disabled button states are hard to distinguish
- Active tab indicators could be stronger

**Solution:**
- Audit and bump minimum text opacity to white/30 for body text, white/40 for labels
- Increase form input border opacity to white/15, focus state to white/30
- Add distinct disabled styling (opacity-40 + cursor-not-allowed consistently)
- Strengthen active tab indicators with bottom border or filled background

**Effort:** Small — Tailwind class adjustments

---

### ~~14. Loading Skeletons~~ DONE

**Problem:** Most loading states show a simple "Loading..." text or nothing. This causes layout shifts and feels unpolished.

**Where:**
- All list views (entries, links, threads, nodes)
- Dashboard stats
- Admin overview
- Profile contributions

**Solution:**
- Create `Skeleton` component (animated pulse rectangles matching content shape)
- Replace "Loading..." text with skeleton layouts that match the final content
- Use for initial page loads and tab switches

**Effort:** Small-Medium — one component, applied everywhere

---

## P3 — Nice to Have (polish & future)

### 15. Keyboard Navigation

- Arrow keys to navigate Tree nodes
- `Enter` to expand/collapse
- Tab navigation through Newsroom items
- `n` shortcut to create new content (context-aware)
- `?` to show keyboard shortcuts overlay

### 16. Contribution Streaks & Stats

- Show "X day streak" on Dashboard
- Weekly/monthly contribution graph (GitHub-style)
- "Most active in [advancement]" badge
- Rep earned this week/month breakdown

### 17. Advancement Comparison

- Side-by-side view of two advancements' Trees
- Cross-advancement search (find ideas across all advancements)
- "Related ideas" suggestions between advancements

### 18. RSS Feed for Newsroom

- Auto-import news from configurable RSS feeds per advancement
- Mark imported vs user-submitted
- De-duplication by URL

### 19. Content Bookmarking

- "Save for later" button on nodes, entries, links
- Bookmarks section in profile or dashboard sidebar
- Bookmark folders/tags

### 20. Export & Sharing

- Share link for specific Tree nodes (deep linking already works via URL)
- Export Tree branch as image or PDF
- Export Library entry as PDF
- Copy-to-clipboard for node descriptions

### 21. Analytics Dashboard (Admin)

- User growth over time chart
- Content creation trends
- Most active advancements
- Rep distribution histogram
- Retention metrics (active users per week)

### 22. Email Verification Flow

- Send verification email on registration
- Badge for verified email on profile
- Consider requiring verification before earning Rep

### 23. The Dojo (Future Feature)

- Course/lesson creation interface for professors
- Built on Library entries as curriculum
- Mentor-mentee matching
- Progress tracking and completion certificates
- Separate rep pathway for teaching contributions

### 24. The Data Vault (Future Feature)

- Dataset upload with metadata (format, size, source, license)
- Peer review workflow (assigned reviewers, approval/rejection)
- Version tracking for datasets
- Citation tracking
- Falsification detection flags

### 25. The Launchpad (Future Feature)

- GitHub OAuth integration
- PR tracking → Rep conversion
- Notion/Google Docs linking
- External contribution verification
- Per-advancement resource aggregation

---

## Implementation Order (Suggested)

**Sprint 0 (Security Hardening — before public launch):**
- S4: Fix Markdown XSS
- S1: Rewrite Firestore update rules (ownership checks)
- S8: Input length limits in Firestore rules
- S6: Sandbox iframes, whitelist domains
- S2: Server-side rep validation in rules
- S7 Phase 1: Client-side rate limiting (debounce)
- S12: CSP headers in firebase.json
- S13: Dependabot config

**Sprint 1 (Foundation):**
- P0-1: Pagination
- P0-2: Error feedback with Toasts
- P2-14: Loading skeletons
- S5: Email verification flow

**Sprint 2 (Community):**
- P1-4: Notification system
- P1-7: Thread editing/deletion
- P2-10: Public user profiles
- S9: Audit logging for admin actions

**Sprint 3 (Quality + Security):**
- P0-3: Content moderation
- P1-6: Search improvements (Phase 1+2)
- P2-13: Contrast/accessibility pass
- S3: Admin custom claims + Cloud Functions
- S7 Phase 2-3: Server-side rate limiting

**Sprint 4 (Polish):**
- P1-8: Mobile responsive polish
- P2-9: Markdown editor
- P2-11: Advancement activity feed
- P2-12: Onboarding improvements
- S11: Firebase App Check

**Sprint 5 (Scale):**
- P1-5: Real-time updates
- P3-16: Contribution stats
- P3-21: Analytics dashboard
- S10: Session management

**Future:** Dojo, Data Vault, Launchpad, RSS, Discord integration
