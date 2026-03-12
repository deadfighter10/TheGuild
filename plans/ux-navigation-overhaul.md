# UX & Navigation Overhaul — Making The Guild intuitive for newcomers and fast for regulars

## The Problem

Right now the hub has these UX issues:

### For newcomers
- **Flat navigation hides depth.** The navbar shows Home, Advancements, Library, Newsroom — but doesn't communicate that these are interconnected pillars of a larger system. A newcomer doesn't know what "The Tree" is, what Rep does, or how the pieces fit together.
- **No guided path.** After landing on the homepage, there's no clear "here's what you should do first" flow. You can browse, but there's no narrative pulling you in.
- **Features look the same.** The Tree, Library, Newsroom, and Discussions all use the same dark cards + mono labels. Nothing visually distinguishes them. A newcomer can't tell at a glance which section they're in.
- **Terminology is opaque.** "The Tree", "The Pool", "Rep" — these are domain-specific terms with no explanation at point of use.

### For regulars
- **No fast travel.** To get to the CRISPR Tree, you click Advancements → CRISPR → Tree tab. Three clicks. A regular who works in one advancement daily shouldn't need that.
- **No personalized hub.** Whether you're a first-time visitor or a 5000-Rep moderator, you see the same homepage. Regulars need a dashboard showing _their_ activity, _their_ advancements, _their_ discussions.
- **No cross-advancement awareness.** If you work in Fusion, you have no idea what's happening in AAGI unless you manually go check. No activity feed, no "trending across all advancements" view.
- **No quick search.** Can't search for a specific idea, thread, or person without navigating to the right section first.

---

## Design Principles

1. **Progressive disclosure.** Show the simple version first. Let users discover depth naturally. Don't front-load complexity.
2. **Advancement-first architecture.** The advancement is the primary organizing unit. Everything (Tree, Library, Newsroom, Discussions) lives inside an advancement. Cross-advancement views are secondary.
3. **Visual identity per pillar.** Each feature pillar gets a consistent icon + color that appears everywhere it's referenced:
   - **The Tree** — green / tree icon — ideas and knowledge graphs
   - **The Grand Library** — cyan / book icon — learning and research
   - **The Newsroom** — violet / newspaper icon — news and papers
   - **Discussions** — amber / chat icon — community conversation
   - **Platforms** — white / link icon — external real-world work
   - **The Pool** — yellow / coins icon — funding (future)
4. **Two-speed interface.** Design for browsing (newcomers) AND for doing (regulars). Same interface, different entry points.

---

## What to Build

### 1. Command Palette (Cmd+K) — Fast travel for regulars

A global search overlay triggered by `Cmd+K` (or a search icon in the navbar).

**What it searches:**
- Advancements by name ("CRISPR", "fusion")
- Tree ideas by title
- Library entries by title
- Discussion threads by title
- Navigation shortcuts ("go to newsroom", "my profile")

**Why:** This is the single biggest quality-of-life improvement for regulars. One shortcut to get anywhere. Discord, Slack, VS Code, Linear — every power-user tool has this.

**Implementation:**
- New component: `src/shared/components/CommandPalette.tsx`
- Fuzzy search across multiple Firestore collections
- Recent searches persisted in localStorage
- Keyboard navigation (arrow keys + enter)

### 2. Context-aware navbar with advancement switcher

**Current:** `Home | Advancements | Library | Newsroom`

**Proposed:** When inside an advancement sub-hub, the navbar transforms:

```
[G] The Guild    [← All]  CRISPR:  Overview  Tree  Discussions  Library  Platforms    [Search] [Profile]
```

- The main nav links are replaced with the sub-hub tabs
- A "← All Advancements" back link appears
- The advancement name and color accent are prominent
- Outside an advancement, the navbar stays as-is but with a search trigger added

**Why:** Reduces clicks. Makes the sub-hub feel like a real destination, not just a detail page. Gives regulars instant access to their advancement's sections.

**Implementation:**
- Modify `Layout.tsx` to detect `/advancements/:id` routes
- Render advancement-specific nav when inside a sub-hub
- Add search icon trigger for Command Palette

### 3. Pillar identity system — Visual distinction

Each pillar gets a consistent visual treatment everywhere it appears:

| Pillar | Color | Icon | Border accent |
|--------|-------|------|---------------|
| Tree | `green-400` | tree branches | left green bar |
| Library | `cyan-400` | open book | left cyan bar |
| Newsroom | `violet-400` | newspaper | left violet bar |
| Discussions | `amber-400` | chat bubble | left amber bar |
| Platforms | `white/50` | external link | left white bar |

**Where this shows up:**
- Section headers within the sub-hub
- Homepage pillar cards
- Navigation items
- Empty states
- Breadcrumbs

**Why:** Right now everything looks the same. A user should know they're "in the Library" vs "in the Tree" at a glance without reading text.

**Implementation:**
- Define `PILLAR_THEMES` constant (like `ADVANCEMENT_THEMES`)
- Apply consistently across all pillar-related UI
- Add colored left-border accent to section containers within the sub-hub

### 4. Newcomer onramp — "Getting Started" strip

For logged-out or low-Rep users, show a contextual getting-started strip:

**On homepage:**
> "The Guild is an open research hub. Pick an advancement below to explore, or [join] to start contributing."

**On advancement sub-hub (logged out):**
> "You're browsing [CRISPR]. Join to contribute ideas, discuss with researchers, and earn Rep. [Join The Guild]"

**On advancement sub-hub (logged in, <100 Rep):**
> "Welcome! You're at [X] Rep. Get to 100 Rep to start contributing. [Verify school email (+100)] [Get vouched (+100)]"

**Why:** Contextual guidance > generic onboarding. Tell people what they can do _here_, not in an abstract tutorial.

**Implementation:**
- New component: `src/shared/components/OnrampBanner.tsx`
- Renders different content based on auth state and Rep level
- Dismissible (persisted in localStorage)

### 5. Dashboard for logged-in users — Replace homepage

When a user is logged in, the homepage should shift from "marketing page" to "dashboard":

**Dashboard shows:**
- **My Advancements** — the advancements they've contributed to or marked as interests (from onboarding), with direct links to each sub-hub
- **Recent Activity** — their last few contributions (ideas created, threads posted, library entries)
- **Activity Feed** — recent activity across all advancements (new ideas, hot discussions, new library entries)
- **Quick Stats** — their Rep, contributions count, tier

**Why:** A regular shouldn't see the "Welcome to The Guild" hero every time. They need a launch pad to their work.

**Implementation:**
- New component: `src/features/home/Dashboard.tsx`
- `HomePage` conditionally renders `Dashboard` vs `LandingPage` based on auth state
- Dashboard fetches user's contributions and recent platform activity

### 6. Advancement switcher within sub-hub

When inside an advancement sub-hub, add a dropdown or pill selector to quickly jump to another advancement without going back to the list:

```
[←] CRISPR ▾   Overview | Tree | Discussions | Library | Platforms
     ├─ Telomerase
     ├─ BCI
     ├─ Tissue Engineering
     ├─ Fusion
     ├─ CRISPR ✓
     └─ AAGI
```

**Why:** A researcher might work across 2-3 advancements. Going back to the list page every time is friction.

**Implementation:**
- Dropdown component in the sub-hub header
- Navigates to same tab in the new advancement (e.g., Tree → Tree)

### 7. Pillar section headers with context

Within each sub-hub tab, add a brief contextual header that explains what this section is:

**Tree tab:**
> "The Tree is a knowledge graph of ideas. Theoretical ideas are red, proven ideas are green. Support ideas you believe in, or branch off with your own."

**Discussions tab:**
> "Discuss ideas, share questions, and collaborate with other contributors working on [advancement name]."

These appear once (dismissible) and help newcomers understand each section on first visit.

**Implementation:**
- Inline in each tab's component
- Dismissed state in localStorage
- Only shows for first 3 visits or until dismissed

---

## Priority Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Pillar identity system (colors/icons) | Small | High — immediate visual clarity |
| **P0** | Context-aware navbar in sub-hub | Medium | High — reduces friction for everyone |
| **P1** | Newcomer onramp banners | Small | High — helps first-time users |
| **P1** | Advancement switcher in sub-hub | Small | Medium — quality of life for regulars |
| **P1** | Pillar section headers with context | Small | Medium — helps newcomers per-section |
| **P2** | Command Palette (Cmd+K) | Medium | High — power-user fast travel |
| **P2** | Dashboard for logged-in users | Large | High — transforms regular experience |

---

## What NOT to do

- **Don't add a sidebar nav.** The sub-hub tabs are enough. A sidebar adds permanent visual weight and fights with content width.
- **Don't add tooltips for everything.** Inline contextual hints (onramp banners, section headers) are better than hover tooltips nobody reads.
- **Don't add animations for the sake of it.** Page transitions look cool but add perceived latency. Focus on instant feedback.
- **Don't over-personalize.** The dashboard should be simple: your stuff + what's new. Not an algorithmic feed.

---

## Firestore Impact

- **No new collections needed** for P0/P1 items (all UI-side changes)
- **Command Palette** needs a lightweight client-side search index or compound Firestore queries
- **Dashboard** reuses existing queries (`getNodesByAuthor`, `getLibraryEntriesByAuthor`, etc.)

---

## Files to create/modify

### New files
- `src/shared/components/CommandPalette.tsx` (P2)
- `src/shared/components/OnrampBanner.tsx` (P1)
- `src/features/home/Dashboard.tsx` (P2)
- `src/domain/pillar-theme.ts` (P0)

### Modified files
- `src/shared/components/Layout.tsx` — context-aware navbar, search trigger, advancement switcher (P0)
- `src/features/advancements/AdvancementDetailPage.tsx` — pillar-colored section containers, section headers, onramp banner (P0/P1)
- `src/features/home/HomePage.tsx` — conditional dashboard rendering (P2)
- All pillar components (TreeView, DiscussionForum, LibraryTab, etc.) — pillar identity styling (P0)
