# The Bounty Board — Design Document

> **Created**: 2026-03-20
> **Status**: Design document — no code changes yet
> **Depends on**: Reputation System Revision (`plans/reputation-system-revision.md`)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Design Principles](#2-design-principles)
3. [Core Concepts](#3-core-concepts)
4. [The Bounty Lifecycle](#4-the-bounty-lifecycle)
5. [Rep Economics](#5-rep-economics)
6. [The Bounty Board UI](#6-the-bounty-board-ui)
7. [Bounty Types](#7-bounty-types)
8. [Difficulty & Sizing](#8-difficulty--sizing)
9. [Claiming & Working](#9-claiming--working)
10. [Review & Completion](#10-review--completion)
11. [Disputes & Expiration](#11-disputes--expiration)
12. [Anti-Gaming & Abuse Prevention](#12-anti-gaming--abuse-prevention)
13. [Admin & System Bounties](#13-admin--system-bounties)
14. [Integration with Existing Systems](#14-integration-with-existing-systems)
15. [Data Model](#15-data-model)
16. [Implementation Considerations](#16-implementation-considerations)

---

## 1. Problem Statement

### What's Missing Today

The Guild's rep economy is entirely **self-directed**: you earn rep by creating content, reviewing it, and getting supports. There is no mechanism for one contributor to direct work toward another. This creates three gaps:

**Gap 1 — No way to ask for help.** A Scholar writing a Library entry on CRISPR-Cas9 delivery mechanisms needs someone to review the existing literature. They can't post this need anywhere. The work either doesn't happen or they do it alone.

**Gap 2 — Newcomers have no guided path.** An Apprentice arrives, completes onboarding, and faces a blank canvas. They know they need rep to advance, but the only guidance is "create something." Bounties create a curated list of "here's what the community actually needs" with clear scope and guaranteed rep reward.

**Gap 3 — No way to direct the community's attention.** A Curator who spots a gap in the Tree can't do anything about it except write the content themselves. Bounties let experienced members say "this work matters" and back that claim with a structured, reviewable task — turning implicit needs into explicit, actionable requests.

### Why This Matters

Collaboration is the platform's reason for existing. The Tree, Library, Discussions, and Peer Review all assume contributors will organically find work that matters. But organic discovery doesn't scale — especially on a young platform. The Bounty Board turns implicit "someone should do this" into explicit, incentivized, trackable tasks.

---

## 2. Design Principles

### 2.1 Rep Is Trust, Not Currency

Rep measures how much the community trusts you. It is **not** a spendable resource. Posting a bounty doesn't cost the poster rep — it's a positive community action (identifying work, mentoring newcomers, directing effort toward gaps). The hunter earns system-minted rep for completing real work, the same way they'd earn rep for creating a node or writing a Library entry. Nobody's rep goes down when good work happens.

### 2.2 The Board Is a Public Good

The Bounty Board is visible to everyone (even Newcomers in read-only). It serves as a live map of what the community needs. Even if you can't claim a bounty yet, browsing it teaches you what kinds of work are valued.

### 2.3 Quality Over Speed

Bounties reward completion, not first-come-first-served. A claim gives you a time window to work, but the poster reviews the result. Bad work gets rejected, not rewarded. This prevents race-to-the-bottom rushing.

### 2.4 Bounties Complement, Not Replace

Bounties are an additional rep source, not the primary one. The earning matrix from the rep system revision remains the backbone. A user who only completes bounties should progress slower than one who also creates original content, reviews, and discusses.

### 2.5 Low Barrier to Claim, High Barrier to Collect

Any eligible user can claim a bounty. But collecting the rep requires the poster (and sometimes a reviewer) to accept the work. This asymmetry keeps the board accessible while maintaining quality.

---

## 3. Core Concepts

### The Bounty

A bounty is a public request for work, posted by a contributor, with a rep reward attached. It has:

- A **title** and **description** (what needs doing)
- An **advancement** scope (which advancement it relates to, or "platform-wide")
- A **bounty type** (research, writing, review, data, discussion, translation — see section 7)
- A **difficulty tier** (newcomer, standard, advanced, expert — see section 8)
- A **rep reward** (the amount the hunter will earn on completion — system-minted)
- A **deadline** (optional — when the work needs to be done by)
- A **claim window** (how long a claimant has to submit work after claiming)

### The Poster

The user who creates the bounty. They define the work, set the reward tier, and review submissions. Posting requires reaching the **Core** phase — **Contributor (1,333+)** — which unlocks posting of bounties at **any** difficulty level. This ensures posters have graduated from supervision and have enough platform experience to scope work and review submissions.

### The Hunter

The user who claims and completes a bounty. Minimum tier to claim depends on the bounty's difficulty (see section 8). Hunters submit their work for the poster's review.

### The Reward

When a bounty is completed, the platform **mints** new rep for the hunter — the same way rep is minted when someone creates a node or receives a support. The poster's rep is unaffected. The reward amount is set by the poster within difficulty-based ranges (see section 5), reflecting the scope of work rather than the poster's personal rep balance.

---

## 4. The Bounty Lifecycle

```
                          ┌─────────────────────────────────┐
                          │                                 │
  ┌──────────┐    ┌───────▼──────┐    ┌──────────┐    ┌────┴───────┐
  │  DRAFT   │───▶│    OPEN      │───▶│ CLAIMED  │───▶│ SUBMITTED  │
  └──────────┘    └───────┬──────┘    └────┬─────┘    └────┬───────┘
                          │                │               │
                          │           ┌────▼─────┐    ┌────▼───────┐
                          │           │ ABANDONED│    │  ACCEPTED  │
                          │           └────┬─────┘    └────────────┘
                          │                │
                          │           (→ re-opens)    ┌────────────┐
                     ┌────▼─────┐                     │  REJECTED  │
                     │ EXPIRED  │                     └────┬───────┘
                     └──────────┘                          │
                                                      (hunter may
                                                       revise or
                                                       dispute)
                     ┌──────────┐
                     │ CANCELLED│
                     └──────────┘
```

### States

| State | Description |
|-------|-------------|
| **Draft** | Poster is composing the bounty. Not yet visible on the board. |
| **Open** | Published on the board. Anyone eligible can claim it. |
| **Claimed** | A hunter has claimed the bounty. Claim window timer starts. Other users cannot claim until the claim expires or the hunter abandons. |
| **Submitted** | Hunter has submitted their work. Poster reviews it. |
| **Accepted** | Poster approved the submission. Hunter earns the rep reward. Bounty is complete. |
| **Rejected** | Poster rejected the submission with feedback. Hunter may revise and resubmit (up to 2 times) or dispute. |
| **Abandoned** | Hunter gave up or the claim window expired. Bounty returns to Open. |
| **Expired** | The bounty's deadline passed with no accepted submission. No rep changes. |
| **Cancelled** | Poster withdrew the bounty. No rep changes (but posting privileges may be affected — see section 12). |

### Transition Rules

- **Draft → Open**: Poster publishes. Bounty appears on the board.
- **Open → Claimed**: Hunter claims. Only one active claim at a time.
- **Claimed → Submitted**: Hunter submits work (a text description + optional links to content they created).
- **Submitted → Accepted**: Poster approves. Hunter earns the rep reward. Poster earns a token bonus (see section 5.4).
- **Submitted → Rejected**: Poster rejects with written feedback (minimum 50 characters). Hunter may revise.
- **Rejected → Submitted**: Hunter revises and resubmits (max 2 revision rounds).
- **Claimed → Abandoned**: Hunter explicitly abandons, or claim window expires.
- **Abandoned → Open**: Bounty returns to the board. Previous hunter's claim count increments (see section 12.4).
- **Open → Expired**: Deadline passes. No rep changes.
- **Open → Cancelled**: Poster withdraws the bounty.

---

## 5. Rep Economics

### 5.1 Core Model: Trust Minting, Not Currency Transfer

Rep is a trust score. It goes up when you do valuable work, and it goes down when you violate community norms. It is **never spent**.

When a bounty is completed:
- The **hunter** earns system-minted rep — the same way they'd earn rep for any other contribution
- The **poster's** rep is unchanged — posting bounties is a community service, not a cost
- The **poster** earns a small bonus for creating valuable work for others (see 5.4)

There is no escrow, no transfer, no spending. The poster sets a reward amount within difficulty-based ranges, and the platform mints that rep for the hunter upon completion. This is economically identical to how supporting a node mints +30 rep for the author — the supporter doesn't "pay" anything either.

### 5.2 Reward Ranges

Bounties have minimum and maximum rep rewards based on difficulty tier. Any Contributor (1,333+) can post bounties at **any** difficulty — the trust ladder gates posting ability, not which difficulties you can use:

| Difficulty | Min Reward | Max Reward | Hunter Min Tier |
|------------|-----------|-----------|-----------------|
| Newcomer | 15 | 75 | Apprentice (33+) |
| Standard | 30 | 150 | Apprentice (33+) |
| Advanced | 75 | 333 | Apprentice (33+) |
| Expert | 150 | 666 | Apprentice (33+) |

**Why no tier-gating on claiming?** Any Apprentice can claim any bounty. Difficulty tiers describe the expected effort and reward range — they're guidance for the hunter, not access gates. An Apprentice who thinks they can tackle an Expert bounty should be free to try. The poster reviews the submission; if the work isn't good enough, it gets rejected. The quality gate is the review, not the tier check.

**Why these ranges?** The rewards are intentionally modest — comparable to a few days of normal contribution, not a shortcut. A Newcomer bounty at max (75 rep) is roughly what an active Apprentice earns in a week through regular contributions. An Expert bounty at max (666 rep) represents a significant but bounded reward for what should be days of specialized work. The numbers use the project's thematic 33-based system.

### 5.2.1 Pre-Core Access (Rate-Limited Claiming)

Users below Contributor (the Onboarding and Supervised phases) can use the Bounty Board, but with tighter rate limits reflecting their early-stage status:

| Phase | Browse | Claim | Post | Claim Rate Limit |
|-------|--------|-------|------|-----------------|
| Newcomer (0) | All bounties | No | No | — |
| Apprentice (33+) | All bounties | Yes | No | 1 active claim, max 2 completed/week |
| Initiate (333+) | All bounties | Yes | No | 1 active claim, max 3 completed/week |
| **Contributor (1,333+)** | All bounties | Yes | **Yes (all difficulties)** | 2 active claims, max 5 completed/week |
| Established+ | All bounties | Yes | Yes | 2 active claims, no weekly completion cap |

**Why rate-limit pre-Core hunters?** Bounties are an additional path, not the primary one. An Apprentice should be earning rep through supervised contributions, discussions, and supports — bounties supplement that, not replace it. The rate limit (1 active claim, 2 completed/week) keeps bounties available from day one without letting newcomers bypass the normal trust-building process.

**Why does the completion cap lift at Established?** By the time you reach Established (6,333+), you've spent months on the platform. You've proven you contribute quality work. Capping how many bounties you can complete would just get in the way.

### 5.3 Inflation Control

Since bounty rewards are system-minted (new rep entering the economy), the system needs controls to prevent bounties from becoming a rep-printing machine:

| Control | Mechanism |
|---------|-----------|
| **Poster posting cap** | Max 3 open bounties at a time, 5 posted per week |
| **Reward ranges** | Difficulty-gated ranges (section 5.2) cap the max reward per bounty |
| **Daily cap interaction** | Bounty rewards count toward the hunter's 500 rep/day cap |
| **Completion gate** | Rep is only minted when the poster actually accepts the work — there's a human quality check on every mint |
| **Platform-wide weekly cap** | Total system-minted bounty rep across the entire platform is capped at **5,000 rep/week** (adjustable by admins). Once hit, new bounties can still be posted but won't be completable until the next week. This prevents runaway inflation during high-activity periods. |

**Why is the completion gate sufficient?** Every bounty rep mint requires a poster to review and accept real work. Unlike node supports (where anyone can click a button), bounties have a built-in quality checkpoint. A poster who accepts garbage work is harming their own reputation (via the rating system in section 10.3) and eventually loses posting privileges if abuse is detected (section 12).

### 5.4 Poster Bonus

The poster earns a token acknowledgment for creating and reviewing bounties — enough to say "the platform noticed your effort," but far too small to be a farming strategy:

| Bounty Difficulty | Poster Bonus |
|-------------------|-------------|
| Newcomer | +3 |
| Standard | +5 |
| Advanced | +7 |
| Expert | +10 |

A poster who creates and reviews 5 bounties per week earns 15–50 rep — a rounding error compared to actual contribution. The motivation to post bounties should be intrinsic (you need the work done, you want to help newcomers, you're filling a gap you care about), not rep farming. If someone is posting bounties purely for the +3 bonus, the system is working — they're still creating useful work for others.

### 5.5 Daily Cap Interaction

Bounty rewards count toward the **500 rep/day cap** from the rep system revision. A hunter who completes a 500-rep Expert bounty on the same day they earned 300 rep from other activities would only receive 200 rep from the bounty — the remaining 300 is not lost but deferred to the next day.

**Deferred bounty rep**: If a bounty completion would exceed the daily cap, the excess is banked and dripped at the start of subsequent days (up to the daily cap) until fully paid. This ensures hunters always receive their full reward, just spread across days. The hunter sees "250 of 500 rep awarded — remainder will be credited over the following days."

---

## 6. The Bounty Board UI

### 6.1 Public Wall

The Bounty Board is a top-level page at `/bounties`, accessible from the main navigation. It displays all **Open** bounties in a filterable, sortable list.

### 6.2 Board Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  THE BOUNTY BOARD                                    [Post Bounty] │
│                                                                    │
│  ┌─ Filters ────────────────────────────────────────────────────┐  │
│  │ Advancement: [All ▼]  Type: [All ▼]  Difficulty: [All ▼]    │  │
│  │ Sort: [Newest ▼]  Min Reward: [___]  Status: [Open ▼]       │  │
│  │ [🔍 Search bounties...]                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ Bounty Card ────────────────────────────────────────────────┐  │
│  │ [NEWCOMER]  [RESEARCH]  [TELOMERASE]                         │  │
│  │                                                               │  │
│  │ Summarize 3 recent papers on telomere extension               │  │
│  │ in human cell lines                                           │  │
│  │                                                               │  │
│  │ Read three 2025-2026 papers on telomere extension using       │  │
│  │ TERT activation and write a 500-word summary comparing...     │  │
│  │                                                               │  │
│  │ ┌──────┐  Posted by Dr. Chen  ·  3 days ago  ·  Expires in   │  │
│  │ │+75 RP│  12 days  ·  Claim window: 7 days  ·  0 claims      │  │
│  │ └──────┘                                                [Claim]│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ Bounty Card ────────────────────────────────────────────────┐  │
│  │ [ADVANCED]  [WRITING]  [FUSION]                               │  │
│  │                                                               │  │
│  │ Write a Library entry on stellarator vs tokamak               │  │
│  │ confinement trade-offs                                        │  │
│  │                                                               │  │
│  │ ┌───────┐  Posted by FusionFan42  ·  1 day ago  ·  No        │  │
│  │ │+350 RP│  expiry  ·  Claim window: 14 days  ·  0 claims     │  │
│  │ └───────┘                                               [Claim]│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ─── My Bounties ───────────────────────────────────────────────── │
│  [Active Claims: 2]  [Posted: 5]  [Completed: 12]                 │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Bounty Detail Page

At `/bounties/:id`. Shows:

- Full description with markdown rendering
- Poster profile (avatar, name, tier, rep)
- Reward amount (prominent)
- Difficulty and type badges
- Advancement scope
- Deadline and claim window
- Claim history (how many times claimed, abandoned)
- Related content links (if the bounty references specific nodes, entries, or threads)
- **Claim button** (if eligible and no active claim)
- **Submission panel** (if you're the current claimant)
- **Review panel** (if you're the poster and a submission is pending)

### 6.4 Dashboard Integration

The user's Dashboard shows:

- **"Bounties for you"** — open bounties matching the user's followed advancements and eligible difficulty tier
- **Active claims** — bounties the user is currently working on with time remaining
- **Posted bounties** — bounties the user created with status indicators

---

## 7. Bounty Types

Each bounty has a type that indicates the kind of work needed. Types help hunters find bounties that match their skills.

| Type | Description | Example |
|------|-------------|---------|
| **Research** | Find, read, and synthesize information from papers or sources | "Summarize 3 papers on X" |
| **Writing** | Create or improve written content (Library entries, node descriptions) | "Write a Library entry on Y" |
| **Review** | Review existing content for accuracy, completeness, or clarity | "Fact-check this node's citations" |
| **Data** | Collect, organize, or analyze data | "Compile a dataset of Z experiments" |
| **Discussion** | Start or facilitate a substantive discussion | "Write a discussion thread comparing approaches A and B" |
| **Translation** | Translate technical content to plain language (or between natural languages, future) | "Write a plain-language explainer of this paper" |
| **Curation** | Organize, tag, or improve existing content | "Add citations to these 5 Library entries" |

Types are soft categories for filtering — they don't affect mechanics. A bounty can only have one type.

---

## 8. Difficulty & Sizing

### 8.1 Four Tiers

Difficulty tiers describe the expected scope and effort. They set the reward range and claim window but do **not** gate who can claim — any Apprentice (33+) can claim any difficulty. The poster selects the difficulty when creating the bounty.

| Tier | Reward Range | Expected Effort | Claim Window | Min Claim-to-Submit |
|------|-------------|----------------|--------------|---------------------|
| **Newcomer** | 15–75 | 30 min – 2 hours | 3 days | 1 hour |
| **Standard** | 30–150 | 2 – 8 hours | 7 days | 4 hours |
| **Advanced** | 75–333 | 1 – 3 days | 14 days | 24 hours |
| **Expert** | 150–666 | 3+ days | 21 days | 72 hours |

### 8.2 Difficulty Guides

The poster selects difficulty when creating the bounty. To help posters choose correctly, the creation form shows guidelines:

**Newcomer** — Simple, well-scoped tasks with clear completion criteria. A first-time contributor should be able to complete this without deep domain expertise. Examples: summarize a paper, fix formatting in a Library entry, find 3 news articles about an advancement.

**Standard** — Moderate tasks requiring some domain knowledge and platform familiarity. The contributor should understand the advancement area and be comfortable writing substantive content. Examples: write a discussion thread analyzing a research direction, improve a node's description with citations, review a Library entry for accuracy.

**Advanced** — Complex tasks requiring significant expertise and effort. The contributor should have deep knowledge in the relevant field. Examples: write a comprehensive Library entry, create a node tree branch covering a subtopic, compile and analyze a dataset.

**Expert** — Major undertakings requiring deep specialization. These are the kind of work that advances the platform's knowledge frontier. Examples: write a multi-section literature review, build a curated dataset with analysis, create an interconnected set of nodes covering an entire research area.

### 8.3 Why Not Gate Claiming by Difficulty?

An Apprentice who wants to tackle an Expert bounty should be free to try. The poster reviews the submission — if it's not good enough, it gets rejected. The quality gate is the **review**, not a tier check. Artificially preventing someone from attempting hard work punishes ambitious newcomers and removes opportunities that might surface unexpected talent.

The difficulty tier tells the hunter what to expect (scope, effort, time), not whether they're "allowed." Pre-Core users are rate-limited on how many bounties they can complete per week (see section 5.2.1), which naturally throttles how much rep they can earn from bounties without blocking access to any specific bounty.

---

## 9. Claiming & Working

### 9.1 Claiming Rules

- Active claim limit depends on tier: **1 active claim** for pre-Core users (Apprentice/Initiate), **2 active claims** for Contributor+. See section 5.2.1 for full rate limits.
- Claiming sets the bounty status to **Claimed** and starts the claim window timer.
- Only one user can claim a bounty at a time. Others see "Claimed by [user] — [time] remaining."
- The poster cannot claim their own bounty.

### 9.2 The Claim Window

The claim window is the time a hunter has to submit work after claiming. It varies by difficulty (see section 8.1).

- The hunter can **request a single extension** of 50% of the original window (e.g., 7-day window → +3.5 days). The poster must approve extensions.
- If the claim window expires without a submission, the claim is automatically abandoned.

### 9.3 Working on a Bounty

While claimed, the hunter works on the task. The bounty detail page shows:

- The full bounty description
- A **work log** — the hunter can post progress updates (visible to the poster)
- A **submission form** — when ready, the hunter submits their work

Work logs are optional but encouraged. They let the poster see progress and provide early feedback, reducing the chance of rejection at submission.

### 9.4 Submission Format

A submission includes:

- **Summary** (required, 100–2,000 characters) — what the hunter did
- **Content links** (optional) — links to content created on the platform (nodes, Library entries, discussion threads) as a result of the bounty
- **External links** (optional) — links to external resources referenced or used
- **Attachments** (optional, future) — uploaded files

The poster reviews this submission against the bounty's requirements.

---

## 10. Review & Completion

### 10.1 Poster Review

When a submission arrives, the poster has **7 days** to review it. The poster can:

**Accept** — The work meets the bounty requirements.
- Hunter earns the full rep reward (system-minted, subject to daily cap with deferral)
- Poster earns their token bonus (see section 5.4)
- Bounty moves to **Accepted** (terminal state)
- Both parties earn a "Bounty Completed" notification

**Reject** — The work doesn't meet requirements. Rejection requires:
- Written feedback (minimum 100 characters) explaining what's missing or wrong
- The hunter may revise and resubmit (up to 2 revision rounds)

**No response within 7 days** — auto-accepts. This prevents posters from sitting on submissions indefinitely. The hunter gets their rep. (See section 12.6 for abuse prevention.)

### 10.2 Revision Rounds

After a rejection, the hunter has **50% of the original claim window** to revise and resubmit. Maximum 2 revision rounds per bounty.

| Round | Hunter Gets | Poster Must |
|-------|------------|-------------|
| First submission | Full claim window | Review within 7 days |
| First revision | 50% of claim window | Review within 5 days |
| Second revision (final) | 50% of claim window | Review within 5 days |

After 2 rejections with no successful revision, the bounty returns to **Open** (the claim is abandoned). The hunter is locked out from re-claiming this specific bounty.

### 10.3 Mutual Completion Rating

After a bounty is accepted, both parties can leave a brief rating (optional):

- **Hunter rates poster**: "Clear requirements" / "Responsive" / "Fair reviewer" (positive tags) or "Vague requirements" / "Unresponsive" / "Unfair rejection" (negative tags)
- **Poster rates hunter**: "Quality work" / "On time" / "Good communication" (positive) or "Incomplete" / "Rushed" / "No communication" (negative)

Ratings are visible on public profiles. Users with consistently negative bounty ratings may have their bounty privileges reviewed. Ratings are **not** tied to rep — they're social signals, not economic ones.

---

## 11. Disputes & Expiration

### 11.1 Dispute Process

If a hunter believes their submission was unfairly rejected, they can open a **dispute** after the second rejection (or after 1 rejection if they believe the rejection feedback is in bad faith).

Dispute flow:

1. Hunter opens a dispute with a written explanation (200–2,000 characters)
2. The dispute is assigned to a **Reviewer (25,333+)** who is not the poster and has not interacted with either party on this bounty
3. The reviewer examines the bounty description, submission, rejection feedback, and dispute text
4. **Ruling options**:
   - **Hunter wins**: Hunter earns the full rep reward. Poster receives a "dispute lost" mark on their bounty profile.
   - **Poster wins**: Bounty returns to Open. Hunter's claim is terminated.
   - **Split**: Reviewer determines partial completion. Hunter earns a percentage of the reward (e.g., 50% for half-completed work).
5. The reviewer earns +30 rep for adjudicating a dispute (standard peer review compensation, slightly reduced because disputes are less effort than full content review)

### 11.2 Dispute Limits

- A user can open at most **2 disputes per 30 days** (as either hunter or poster). This prevents serial disputers.
- If a poster loses 3+ disputes within 90 days, their bounty posting privileges are suspended for 30 days.
- If a hunter loses 3+ disputes within 90 days, their claiming privileges are suspended for 30 days.

### 11.3 Expiration

Bounties can have an optional deadline. If set:

- The bounty expires at the deadline if still in **Open** state (no active claim)
- If a claim is active at the deadline, the claim window takes precedence — the hunter keeps their remaining time
- Expired bounties simply close — no rep changes since nothing was spent

Bounties without a deadline remain open indefinitely until claimed, completed, or cancelled.

---

## 12. Anti-Gaming & Abuse Prevention

### 12.1 Self-Dealing & Reciprocal Farming

**Threat**: User A posts a bounty, User B (A's alt account or colluding friend) claims and submits minimal work, A accepts, B gets free system-minted rep. Since the poster pays nothing, this is essentially a rep-printing scheme. The reverse also works: B posts a bounty for A. They take turns printing rep for each other.

This is the **primary abuse vector** — posting bounties is free, so the only barrier is time and detection.

#### Layer 1: Rate Limiting (makes farming slow)

| Defense | Mechanism |
|---------|-----------|
| **Posting cap** | Max 3 open bounties at a time, 5 posted per week |
| **Platform-wide weekly cap** | Total system-minted bounty rep capped at 5,000/week across the entire platform. Even if abuse slips through, the total inflation is bounded. |
| **Modest rewards** | Max 75 rep for Newcomer, max 666 for Expert. Even unchecked farming yields far less rep than sustained organic contribution. |

#### Layer 2: Pair & Ring Detection (makes farming detectable)

| Defense | Mechanism |
|---------|-----------|
| **Reciprocal bounty block** | If A completes a bounty posted by B, **B cannot complete any bounty posted by A for 180 days** by default. This is the most obvious collusion pattern and is blocked automatically. However, this can be **overridden via moderator appeal** (see 12.7). |
| **Concentration limit** | A single hunter cannot complete more than **3 bounties from the same poster within 90 days**. This forces diversity — you can't have a dedicated "bounty buddy." Can also be overridden via moderator appeal. |
| **Network analysis** | Cross-reference bounty completion pairs with vouch relationships, support patterns, and account creation proximity (reuses existing sybil detection from rep system section 8.1). If A vouched B, or A and B have mutual support ratios >30%, flag bounty completions between them for review (not auto-blocked). |
| **Ring detection** | Scheduled Cloud Function checks for closed loops: A→B→C→A where each arrow is a bounty completion. If a loop of length ≤4 is found within 180 days, flag all participants for review. |

#### Layer 3: Content Verification (makes farming hard)

| Defense | Mechanism |
|---------|-----------|
| **Minimum content requirement** | Submissions must include at least one content link to a node, Library entry, or discussion thread created/edited as part of the bounty. Empty "I did the thing" submissions are auto-rejected. |
| **Content age check** | Linked content must have been created or substantially edited **after** the bounty was claimed. Linking pre-existing content to "complete" a bounty is rejected. |
| **Minimum claim-to-submit time** | Submissions cannot be made within **1 hour** of claiming for Newcomer bounties, **4 hours** for Standard, **24 hours** for Advanced, **72 hours** for Expert. Real work takes real time. |
| **Description quality gate** | Bounty descriptions must be ≥100 characters. Titles must be ≥15 characters. Submissions must be ≥100 characters. |

#### Layer 4: Accountability (makes farming costly)

| Defense | Mechanism |
|---------|-----------|
| **Poster accountability** | If a poster's accepted bounties are later flagged for low-quality completions (2+ in 90 days), posting privileges are suspended for 60 days and all bounties from that poster during the flagged period are reviewed. |
| **Collusion penalty** | If admin review confirms coordinated farming between two users: both lose **all rep earned from bounties between them**, plus a **-333 rep penalty** each, plus 90-day bounty privilege suspension for both accounts. Repeated confirmed collusion (2+ incidents) results in permanent bounty ban. |
| **Public audit trail** | Every bounty completion is visible on both parties' public profiles (poster and hunter). The community can see "X completed 4 bounties for Y this month" — social visibility is itself a deterrent. |

### 12.2 Bounty Farming (Trivial Bounties)

**Threat**: A user posts trivial bounties with maximum rewards to funnel rep to accomplices, or creates trivially-completable tasks that look legitimate but require no real effort.

| Defense | Mechanism |
|---------|-----------|
| **Reward-difficulty mismatch flag** | If a Newcomer bounty is posted at max reward (75) AND has fewer than 3 clear completion criteria in the description, flag for review |
| **Completion time floor** | Minimum claim-to-submit time enforced per difficulty (see Layer 3 above). Instant completions are impossible. |
| **Description quality gate** | Bounty descriptions must be ≥100 characters. Titles must be ≥15 characters. |
| **Community flagging** | Any user can flag a bounty as "trivial" or "poorly scoped." 3+ flags trigger admin review before the bounty can be completed. |

### 12.3 Rejection Abuse

**Threat**: A poster repeatedly rejects valid submissions to waste hunters' time, or to extract free work (reading the submissions) without paying.

| Defense | Mechanism |
|---------|-----------|
| **Rejection feedback quality** | Rejection requires 100+ character feedback. Generic rejections ("not good enough") are flaggable. |
| **Auto-accept timeout** | If the poster doesn't review within 7 days, the submission is auto-accepted. |
| **Dispute system** | Hunters can dispute rejections. 3+ lost disputes → posting suspension (section 11.2). |
| **Rejection ratio tracking** | If a poster rejects >60% of submissions across all their bounties, flag for review. |

### 12.4 Claim Squatting

**Threat**: A user claims bounties with no intention of completing them, blocking others from working on them.

| Defense | Mechanism |
|---------|-----------|
| **Active claim limit** | 1 for pre-Core users, 2 for Contributor+ (see section 5.2.1). |
| **Abandonment tracking** | Abandoned claims increment a counter. After 3 abandoned claims within 30 days, the user's max active claims drops to 1 for 30 days. After 5 in 30 days, claiming is suspended for 14 days. |
| **Abandonment penalty** | Abandoning a claim after >50% of the claim window has elapsed costs -10 rep. Early abandonment (<50% of window) has no penalty. |
| **Claim history visible** | The bounty card shows how many times it's been claimed and abandoned, helping hunters gauge if a bounty might be problematic. |

### 12.5 Description Bait-and-Switch

**Threat**: Poster writes a clear bounty, a hunter claims it, then the poster edits the description to add unreasonable requirements.

| Defense | Mechanism |
|---------|-----------|
| **Edit freeze on claim** | Once a bounty is claimed, the poster cannot edit the title, description, difficulty, or reward. They can post comments/clarifications in the work log. |
| **Edit history** | All edits to bounties while in Open state are versioned. The hunter sees the description as it was when they claimed. |

### 12.6 Auto-Accept Gaming

**Threat**: A hunter submits low-quality work knowing the poster's review window will expire and auto-accept.

| Defense | Mechanism |
|---------|-----------|
| **Poster notification escalation** | Poster receives a notification on submission, a reminder at day 3, and an urgent reminder at day 6. |
| **Post-acceptance flag** | Even after auto-acceptance, the poster can flag the submission within 7 days. If a moderator upholds the flag, the bounty is reversed: hunter loses the reward + a -25 rep penalty. |

### 12.7 Moderator Override Appeals

Automated restrictions (reciprocal blocks, concentration limits, suspensions) exist to catch the common case — but the common case isn't every case. Two researchers who genuinely collaborate on the same advancement shouldn't be permanently blocked from completing each other's bounties just because the system flagged a pattern.

**Any automated bounty restriction can be appealed to a Moderator.**

#### Appeal Flow

1. The restricted user sees a clear explanation of why they're blocked: "You cannot complete bounties posted by [User] because they recently completed one of yours. This restriction expires on [date], or you can request a moderator override."
2. User submits an appeal (200–1,000 characters) explaining why this is legitimate collaboration, not farming.
3. A **Moderator (33,333+)** who has no bounty relationship with either party reviews the appeal.
4. **Approved**: The specific restriction is lifted for this pair. The override is logged and visible in the admin audit trail. The pair is still monitored — if a subsequent review reveals the override was abused, the moderator who approved it receives a note in their moderation record.
5. **Denied**: Restriction stands. The user can re-appeal after 30 days with new context.

#### What Can Be Appealed

| Restriction | Default Duration | Appeal Available |
|-------------|-----------------|-----------------|
| Reciprocal bounty block | 180 days | Yes — moderator can lift for a specific pair |
| Concentration limit (3/pair/90 days) | Rolling | Yes — moderator can raise to 5 for a specific pair |
| Bounty suspension (post-collusion review) | 90 days | Yes — moderator can reduce or lift if review clears the user |
| Network analysis flag | Until reviewed | Yes — auto-cleared if moderator dismisses the flag |

#### Why This Matters

The platform is built for collaboration. Two experts on the same niche topic (e.g., stellarator plasma containment) may genuinely be the best people to post and complete each other's bounties — there might only be 3 people on the platform who understand the subject. Automated rules should catch abuse patterns, not punish legitimate expertise clusters. The moderator override ensures the system serves the community rather than the other way around.

#### Guardrails on Overrides

- A moderator cannot approve an override involving themselves, their vouchees, or their co-authors.
- Override approvals are logged in the audit trail with the moderator's ID and reasoning.
- If a pair that received an override is later confirmed as colluding, the approving moderator receives a warning (first time) or -83 rep (repeat). This keeps moderators accountable for their judgment without making them afraid to approve legitimate cases.

---

## 13. Admin & System Bounties

### 13.1 System Bounties

Admins can post **system bounties** — bounties that aren't funded by any user's rep. The reward is system-minted.

System bounties are for bootstrapping the platform and filling critical gaps:

| Use Case | Example |
|----------|---------|
| **Cold start** | "Write the first Library entry for Brain-Machine Interfaces" |
| **Quality gaps** | "Add citations to the 10 oldest uncited Library entries" |
| **Platform needs** | "Write a discussion thread explaining how peer review works" |
| **Events** | "Bounty Blitz: complete 3 newcomer bounties this week for +50 bonus" |

System bounties are visually distinct (different badge, "Posted by The Guild" attribution). They follow the same lifecycle but with no poster review timeout (an admin reviews).

### 13.2 Admin Bounty Limits

- Admins can post up to **10 system bounties per week** to prevent inflation
- System bounties follow the same reward ranges as user bounties
- System bounty rewards count toward the recipient's daily cap
- Total system-minted bounty rep is tracked and visible on the admin analytics dashboard

### 13.3 Community-Requested Bounties (Future)

A future extension: users below the posting tier can **request** a bounty by describing the work and suggesting a reward. Established+ users can then "sponsor" the request, funding it with their own rep. This creates a crowdfunding dynamic where the community collectively identifies and funds important work.

---

## 14. Integration with Existing Systems

### 14.1 Reputation System

- Bounty rewards are a new entry in the **earning matrix** (section 6 of rep system revision)
- New rep event types: `bounty_completed` (hunter earns reward), `bounty_poster_bonus` (poster earns bonus)
- Bounty completions count toward **breadth bonus** as a distinct content type
- Bounty completions count as **activity** for inactivity decay purposes

### 14.2 Achievements

New bounty-related achievements:

| Achievement | Trigger | Rep | Category |
|-------------|---------|-----|----------|
| First Bounty Claimed | Complete your first bounty | +33 | Milestone |
| Bounty Hunter | Complete 10 bounties | +66 | Milestone |
| Bounty Master | Complete 25 bounties | +133 | Special |
| Generous Patron | Post 10 bounties that get completed | +66 | Milestone |
| Across the Board | Complete bounties in 3+ different advancements | +66 | Special |

### 14.3 Notifications

New notification types:

| Event | Recipient | Message |
|-------|-----------|---------|
| Bounty claimed | Poster | "[User] claimed your bounty '[title]'" |
| Work submitted | Poster | "[User] submitted work on '[title]'" |
| Submission accepted | Hunter | "Your work on '[title]' was accepted! +[reward] rep" |
| Submission rejected | Hunter | "Your submission on '[title]' needs revision" |
| Claim window expiring | Hunter | "Your claim on '[title]' expires in 24h" |
| Review window expiring | Poster | "You have 24h to review the submission on '[title]'" |
| Bounty expired | Poster | "Your bounty '[title]' has expired with no completion." |
| Dispute opened | Poster/Hunter | "A dispute has been opened on '[title]'" |
| Dispute resolved | Both | "The dispute on '[title]' has been resolved" |

### 14.4 The Tree & Library

Bounties can reference specific platform content:

- "Improve this node: [link to node]" — bounty is scoped to a specific Tree node
- "Review this Library entry: [link to entry]" — bounty is scoped to a specific entry
- "Write a node about [topic] under [parent node]" — bounty specifies where the work should go

Content created as a result of a bounty is tagged with `bountyId` for traceability. This lets the community see which content was bounty-motivated vs. organically created.

### 14.5 Contribution Streaks

Completing a bounty counts as a contribution for streak purposes (same as creating a node, thread, or entry).

### 14.6 Analytics

New admin analytics for bounties:

- Total bounties posted / claimed / completed / expired / cancelled
- Average completion time by difficulty
- Top posters and hunters
- Rep flow: total minted via bounty completions, total poster bonuses, breakdown by difficulty
- Completion rate by advancement

---

## 15. Data Model

### 15.1 Firestore Collections

```
bounties/{id} {
  posterId: string
  posterName: string
  title: string                    // 15–200 chars
  description: string              // 100–5,000 chars
  advancementId: string | null     // null = platform-wide
  bountyType: 'research' | 'writing' | 'review' | 'data' | 'discussion' | 'translation' | 'curation'
  difficulty: 'newcomer' | 'standard' | 'advanced' | 'expert'
  rewardAmount: number             // rep hunter earns on completion (system-minted)
  status: 'draft' | 'open' | 'claimed' | 'submitted' | 'accepted' | 'rejected' | 'abandoned' | 'expired' | 'cancelled'
  deadline: Timestamp | null       // optional expiration
  claimWindowDays: number          // 3, 7, 14, or 21
  currentHunterId: string | null
  currentHunterName: string | null
  claimedAt: Timestamp | null
  claimCount: number               // total times claimed (including abandonments)
  relatedContentIds: string[]      // links to nodes, entries, threads
  isSystemBounty: boolean          // admin-posted, system-funded
  createdAt: Timestamp
  updatedAt: Timestamp
}

bountySubmissions/{id} {
  bountyId: string
  hunterId: string
  hunterName: string
  summary: string                  // 100–2,000 chars
  contentLinks: string[]           // platform content URLs
  externalLinks: string[]          // external reference URLs
  revisionNumber: number           // 0 = first submission, 1 = first revision, 2 = second
  status: 'pending' | 'accepted' | 'rejected'
  rejectionFeedback: string | null // poster's feedback on rejection (100+ chars)
  submittedAt: Timestamp
  reviewedAt: Timestamp | null
}

bountyWorkLogs/{id} {
  bountyId: string
  authorId: string                 // poster or hunter
  body: string                     // 10–2,000 chars
  createdAt: Timestamp
}

bountyDisputes/{id} {
  bountyId: string
  submissionId: string
  hunterId: string
  posterId: string
  hunterExplanation: string        // 200–2,000 chars
  reviewerId: string | null        // assigned Reviewer
  reviewerName: string | null
  ruling: 'hunter_wins' | 'poster_wins' | 'split' | null
  splitPercentage: number | null   // if split, % to hunter (0–100)
  rulingExplanation: string | null
  status: 'open' | 'resolved'
  createdAt: Timestamp
  resolvedAt: Timestamp | null
}

bountyRatings/{bountyId}_{raterId} {
  bountyId: string
  raterId: string
  ratedUserId: string
  role: 'poster' | 'hunter'       // role of the rater
  tags: string[]                   // positive/negative tags
  createdAt: Timestamp
}

```

### 15.2 Firestore Rules (Key Constraints)

```
bounties/{id}:
  create: auth != null && isEstablished(auth.uid) && validBountyCreate(request.resource.data)
  update: auth.uid == resource.data.posterId && validBountyUpdate(request.resource.data, resource.data)
  read: auth != null  // all authenticated users can read

bountySubmissions/{id}:
  create: auth != null && auth.uid == request.resource.data.hunterId
  update: auth.uid == resource.data.hunterId || auth.uid == get(bounties/$(resource.data.bountyId)).data.posterId
  read: auth != null

bountyDisputes/{id}:
  create: auth != null && auth.uid == request.resource.data.hunterId
  read: auth != null && (auth.uid == resource.data.hunterId || auth.uid == resource.data.posterId || auth.uid == resource.data.reviewerId || isAdmin(auth))
```

### 15.3 Domain Types

```typescript
type BountyType = 'research' | 'writing' | 'review' | 'data' | 'discussion' | 'translation' | 'curation'

type BountyDifficulty = 'newcomer' | 'standard' | 'advanced' | 'expert'

type BountyStatus = 'draft' | 'open' | 'claimed' | 'submitted' | 'accepted' | 'rejected' | 'abandoned' | 'expired' | 'cancelled'

type SubmissionStatus = 'pending' | 'accepted' | 'rejected'

type DisputeRuling = 'hunter_wins' | 'poster_wins' | 'split'

type BountyRatingTag =
  | 'clear_requirements' | 'responsive' | 'fair_reviewer'
  | 'vague_requirements' | 'unresponsive' | 'unfair_rejection'
  | 'quality_work' | 'on_time' | 'good_communication'
  | 'incomplete' | 'rushed' | 'no_communication'
```

---

## 16. Implementation Considerations

### 16.1 Phase 1 — Core (MVP)

The minimum viable bounty system:

- Bounty CRUD (create, read, update, cancel)
- Reward minting on completion (Cloud Function)
- Claiming and submission flow
- Poster review (accept/reject with feedback)
- Bounty Board page with filters
- Basic notifications (claimed, submitted, accepted, rejected)

**Not in Phase 1**: Disputes, ratings, work logs, system bounties, analytics, achievements.

### 16.2 Phase 2 — Quality & Safety

- Dispute system with Reviewer adjudication
- Anti-gaming detection (self-dealing, claim squatting)
- Cancellation fees
- Auto-accept timeout
- Edit freeze on claim

### 16.3 Phase 3 — Engagement

- Mutual ratings
- Work logs
- Bounty-related achievements
- System bounties
- Analytics dashboard integration
- Dashboard recommendations ("Bounties for you")
- Community-requested bounties

### 16.4 New Collections Summary

| Collection | Documents Per | Estimated Volume |
|------------|--------------|-----------------|
| `bounties` | 1 per bounty | Moderate — 10–50/week at scale |
| `bountySubmissions` | 1–3 per bounty (revisions) | Low — 1–2x bounty count |
| `bountyWorkLogs` | 0–10 per bounty | Low–moderate |
| `bountyDisputes` | Rare — <5% of bounties | Very low |
| `bountyRatings` | 0–2 per completed bounty | Low |

### 16.5 Cloud Functions Needed

| Function | Purpose |
|----------|---------|
| `completeBounty` | Atomically mint rep for hunter + poster bonus on acceptance, respecting daily cap (defers excess) |
| `autoAcceptSubmission` | Scheduled — find submissions past 7-day review window, auto-accept |
| `expireBounties` | Scheduled — find open bounties past deadline, set status to expired |
| `expireClaims` | Scheduled — find claims past claim window, abandon and reopen |
| `detectBountyAbuse` | Scheduled — run mutual-completion and farming pattern detection |
