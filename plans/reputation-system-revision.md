# Reputation System — Complete Design

> **Created**: 2026-03-18
> **Last revised**: 2026-03-19
> **Status**: Design document — no code changes yet

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Problems & Vulnerabilities](#2-problems--vulnerabilities)
3. [Design Principles](#3-design-principles)
4. [The Rep Economy](#4-the-rep-economy)
5. [The Trust Ladder](#5-the-trust-ladder)
   - 5.1 [Eleven Tiers](#51-eleven-tiers)
   - 5.2 [Tier Roles — What Each Level Means](#52-tier-roles--what-each-level-means)
   - 5.3 [Tier Demotion](#53-tier-demotion)
   - 5.4 [Vouch System](#54-vouch-system)
6. [Earning Rep](#6-earning-rep)
7. [Losing Rep](#7-losing-rep)
8. [Anti-Gaming & Abuse Prevention](#8-anti-gaming--abuse-prevention)
   - 8.6 [Supervised Queue Flooding](#86-supervised-queue-flooding)
   - 8.7 [Distributed Flag Attack](#87-distributed-flag-attack-griefing)
   - 8.8 [Content Deletion After Farming](#88-content-deletion-after-farming)
   - 8.9 [Vouch Chain Laundering](#89-vouch-chain-laundering)
   - 8.10 [Vouch Liability Cascade Weaponization](#810-vouch-liability-cascade-weaponization)
   - 8.11 [Moderator Power Abuse — Proven Status](#811-moderator-power-abuse--proven-status-farming)
   - 8.12 [Breakthrough Vote Manipulation](#812-breakthrough-vote-manipulation)
   - 8.13 [Appeal System Abuse](#813-appeal-system-abuse)
9. [The Newcomer Funnel](#9-the-newcomer-funnel)
10. [Breakthrough System](#10-breakthrough-system)
11. [Rep History & Transparency](#11-rep-history--transparency)
12. [Admin Separation](#12-admin-separation)
13. [Moderation Escalation](#13-moderation-escalation)
14. [Governance at Scale](#14-governance-at-scale)
15. [Early-Stage Considerations](#15-early-stage-considerations)
16. [Implementation Sprints](#16-implementation-sprints)

---

## 1. Current State Analysis

### How Rep Works Today

Users start at **0 rep**. There are exactly **four** ways to earn rep:

| Source | Amount | Frequency | Mechanism |
|--------|--------|-----------|-----------|
| School email verification | +100 | One-time | Cloud Function (`claimSchoolEmailBonus`) |
| Vouch from a contributor | +100 | One-time | Service layer + Firestore transaction |
| Node support received | +10 | Per support | Service layer + Firestore transaction |
| Admin manual award | Variable | Admin action | Cloud Function (`adminUpdateUserRep`) |

There is **no automated mechanism to lose rep**. Only admins can manually set rep to a lower value.

### Current Access Gates

| Rep | Tier | Access |
|-----|------|--------|
| 0–99 | Observer | Read-only |
| 100–2,999 | Contributor | Create nodes, discussions, news, vouch others |
| 1,500+ | Library Contributor | Add entries to Grand Library |
| 3,000+ | Moderator | Change node status, edit others' content, moderation |
| -1 | Admin | Full access (magic sentinel) |

### What's Protected

- Firestore rules block client-side rep writes (`request.resource.data.repPoints == resource.data.repPoints`)
- Rep mutations only happen through Cloud Functions or Firestore transactions
- Rate limiting: 10s minimum interval between writes, hourly/daily caps per collection
- Zod schemas validate rep on read boundaries

---

## 2. Problems & Vulnerabilities

### P1: Progression Arithmetic Doesn't Work

A best-case user (school email + vouch) starts at 200 rep. The only repeatable source is node supports at +10 each. Reaching Moderator (3,000) requires **280 supports on their nodes**. Reaching Library Contributor (1,500) requires **130 supports**. On a young platform with limited users, this could take years.

The system rewards popularity, not expertise. A mediocre idea with social traction earns more rep than a brilliant peer review.

### P2: 10+ Content Types, 1 Earns Rep

| Content Type | Earns Rep? |
|-------------|-----------|
| Tree nodes (via supports) | Yes |
| Peer reviews | **No** |
| Library entries | **No** |
| Discussion threads | **No** |
| Discussion replies | **No** |
| News link submissions | **No** |
| Spotlight wins | **No** |
| Achievements | **No** |
| Contribution streaks | **No** |
| Successful flags | **No** |

Rational users will only create Tree nodes. Everything else is uncompensated labor.

### P3: No Automated Consequences

Moderation flags exist but carry zero automated penalty. Content can be removed, but the creator's rep is untouched. The documented "negative rep = temp ban" is not implemented. Bad actors can create low-quality content, get flagged, and continue without consequence.

### P4: Admin Sentinel (-1) is a Latent Bug

`rep === -1` is checked in 8+ domain functions. Any arithmetic applied to an admin's rep would silently remove admin status. No guard prevents an admin from receiving a vouch or support bonus that would change their rep from -1 to something else.

### P5: Cold Start Problem

Non-academic users start at 0 rep. The only way to reach Contributor (100) is a vouch, which requires knowing an existing contributor. For a new user who discovers the platform independently, there is **no path forward**. The README promises "supervised small contributions" for Observers, but this is not implemented.

### P6: Sybil Attack Surface

Nothing prevents coordinated multi-account abuse:
- Sockpuppets can vouch each other in chains
- One person can support their own nodes from alternate accounts
- Vote rings can inflate Spotlight nominations
- The `voucherHasVouchedBefore` guard limits individual accounts but not coordinated groups

### P7: No Diminishing Returns

A node with 500 supports gives its author 5,000 rep. No curve, no cap. First-mover advantage compounds: early users accumulate rep faster than later users in a larger pool.

### P8: Vouch System is Dead After Use

A contributor can vouch exactly one person, ever. The feature becomes permanently irrelevant after a single use.

### P9: Peer Review is Gated But Unrewarded

Only Moderators (3,000+ rep) can perform peer reviews. Reviewers earn zero rep. The highest-value activity on the platform has zero incentive and maximum gatekeeping.

### P10: No Rep for Flag Accuracy

Accurate flaggers get nothing. Frivolous flaggers face no penalty. The flagging system has no feedback loop.

---

## 3. Design Principles

### 3.1 Rep Measures Trust, Not Popularity

A researcher who writes 5 thoroughly peer-reviewed nodes should outrank someone who posts 50 low-effort ideas that get casual support from friends. Quality-validated content should earn more than unvalidated content.

### 3.2 Every Meaningful Action Earns or Costs Something

If the platform asks users to do something — review content, flag violations, contribute knowledge — that action must move their rep. Unrewarded actions are actions the system doesn't value, and users will eventually stop doing them.

### 3.3 Abuse Should Be Expensive and Detectable

A troll must invest significant time mimicking legitimate behavior before accumulating enough rep to cause damage. When caught, the consequences must outweigh the investment.

### 3.4 Progression Should Be Achievable But Not Trivial

A consistently active, diverse contributor should reach Moderator status in approximately **2.5–3 years**. A single-action grinder should take 4–5+ years. It should not be possible to reach Moderator in under a year through any strategy.

### 3.5 No Single Action Should Dominate

The system must reward breadth. A user who only creates nodes should progress measurably slower than one who also reviews, discusses, and curates. Monoculture farming should hit diminishing returns and miss out on breadth bonuses.

### 3.6 Trust is Harder to Build Than to Destroy

Earning rep should be gradual and distributed across many small actions. Losing rep for rule violations should be swift and disproportionately painful. The cost of trolling must always exceed the cost of legitimate participation.

---

## 4. The Rep Economy

### 4.1 Sources and Sinks

The current system is source-only: rep inflates indefinitely. A healthy rep economy needs both inflows and outflows.

**Sources** (rep enters the system):
- Contribution rewards (supports, reviews, entries, discussions, news)
- Quality bonuses (peer review approval, proven status, breakthroughs)
- Onboarding bonuses (school email, vouches, profile)
- Recognition bonuses (achievements, spotlights, streaks)

**Sinks** (rep exits the system):
- Moderation penalties (flag upheld → rep deducted)
- Inactivity decay (slow, with a floor)
- Vouch liability (vouchee banned → voucher penalized)
- Frivolous flag penalties

### 4.2 Unified Daily Cap

No user can earn more than **500 rep in a single day** from all sources combined. This prevents bot-speed grinding and ensures rep accumulates at a human pace.

**Why 500**: A normal productive day for a serious contributor earns 100–250 rep. An exceptionally productive day (multiple contributions, reviews, and supports received) might reach 350–450. Only theoretical max-activity scenarios approach 500. The cap exists as a safety valve, not a routine constraint.

**Exemptions**: One-time bonuses (school email verification, vouch received, achievement earned) are not counted toward the daily cap. These are naturally rate-limited and can't be farmed.

**Day boundary**: Days are defined in **UTC** and reset at midnight UTC. All daily caps, rate limits, and daily counters use UTC consistently. This prevents timezone exploitation where a user earns 500 rep at 11:59pm in one timezone and another 500 at 12:01am by switching timezone context.

### 4.3 Diminishing Returns Per Content Item

Rep earned from a single piece of content follows a decay curve. This forces breadth — create multiple quality contributions rather than riding one viral hit.

**Node supports received:**

| Supports on a Single Node | Rep per Support to Author |
|--------------------------|--------------------------|
| 1–10 | +30 |
| 11–25 | +15 |
| 26–50 | +5 |
| 51+ | +0 (capped) |

**Max rep from one unreviewed node**: 300 + 225 + 125 = **650 rep**

**Quality multiplier** (see 6.2): nodes that pass peer review earn 1.5x support rep. Proven nodes earn 2x. This means a reviewed node can generate more than an unreviewed one — directly rewarding quality over quantity.

**News link upvotes:**

| Upvotes on a Single Link | Rep per 5 Upvotes |
|--------------------------|-------------------|
| 1–25 | +7 |
| 26–50 | +3 |
| 51+ | +0 (capped) |

**Max rep from one news link**: 35 + 15 = **50 rep**

### 4.4 Inactivity Decay

Users who stop contributing should not retain high-tier privileges indefinitely. A moderator who hasn't participated in 9 months cannot be trusted to moderate effectively — community norms evolve.

| Inactivity Period | Monthly Decay |
|------------------|---------------|
| 0–3 months | None |
| 3–6 months | 5% of rep above 100 |
| 6+ months | 15% of rep above 100 |

**Floor**: Rep never decays below 100 (well into Apprentice range). A returning user always retains basic participation rights — replies, supports, and supervised content. They re-earn higher-tier privileges through fresh activity.

**What counts as activity**: Creating any content (node, entry, thread, reply, news link), completing a peer review, or voting in a governance poll. Passive actions (reading, receiving supports) do not reset the timer.

**Example — 33,333-rep Moderator goes completely inactive**:
- Month 4: −1,662 → 31,671
- Month 5: −1,579 → 30,092
- Month 6: −1,500 → 28,592
- Month 7 (15%): −4,274 → 24,318 (loses Moderator, Senior, and Reviewer)
- Month 8: −3,633 → 20,685 (loses Mentor)
- Month 9: −3,088 → 17,597
- Month 10: −2,625 → 14,972
- Month 11: −2,231 → 12,741 (loses Curator)
- Month 13: rep approaches Scholar range
- Month 18+: rep approaches 100 floor

A moderator who takes a 3-month break loses nothing. After 7 months of total inactivity they lose Moderator status. Any single contribution at any point resets the clock.

**Implementation**: Monthly scheduled Cloud Function queries users with no activity in the decay window and applies percentage reduction. Each decay event is logged in `repHistory` with reason `inactivity_decay`.

---

## 5. The Trust Ladder

### 5.1 Eleven Tiers

The ladder is organized into **four logical phases**, with large gaps between phases to create natural plateaus. Within a phase, tiers come relatively quickly. Crossing into the next phase is a significant achievement.

| | Rep | Level | Tier | What Unlocks |
|-|-----|-------|------|-------------|
| **Onboarding** | 0 | 1 | **Newcomer** | Read everything. That's it. Complete onboarding to advance. No contributions, no interactions, no voting. A pure "you just got here" state. |
| | 33 | 2 | **Apprentice** | Post discussion replies directly. Submit **supervised** discussion replies and news links. **Support nodes** (+3/support, 75/month cap). Vote on news. |
| | | | | |
| **Supervised** | 333 | 3 | **Initiate** | Submit **supervised** nodes and discussion threads. Flag content (3/day). Submit news links directly. |
| | | | | *── ~2 months of supervised contribution ──* |
| **Core** | 1,333 | 4 | **Contributor** | All content creation (nodes, threads) **without supervision**. The big unlock — you've proven yourself. |
| | 6,333 | 5 | **Established** | Vouch 1 user. Send co-authorship invitations. |
| | 9,333 | 6 | **Scholar** | Create Library entries. Unlimited flags. |
| | 13,333 | 7 | **Curator** | Nominate content for Spotlight. |
| | | | | *── gap of 8,000 ──* |
| **Leadership** | 21,333 | 8 | **Mentor** | Vouch 3 users total. Review supervised content queue. |
| | 25,333 | 9 | **Reviewer** | Claim and complete peer reviews. Vouch 5 total. |
| | 29,333 | 10 | **Senior** | Vote in governance polls. Vouch 7 total. Access moderation analytics (read-only). |
| | 33,333 | 11 | **Moderator** | Change node status (proven/disproved). Edit any user's content. Resolve flags. Manage moderation queue. Full admin analytics. Vouch 10 total. |

**Why four phases?**

The phases represent fundamentally different relationships with the platform. Each phase transition marks a real shift in what you are to the community:

- **Onboarding** (Day 1): Newcomer → Apprentice. Takes 20 minutes. You're oriented and can do basic participation (replies, supports, voting).
- **Supervised** (Weeks 1–8): Initiate. You're proving yourself. Every node and thread you submit is reviewed by a Mentor before it reaches the platform. ~2–2.5 months of supervised contribution earns enough trust to graduate.
- **Core** (Months 3–12): Contributor → Established → Scholar → Curator. You've graduated from supervision. You can freely create content, then progressively unlock vouching, co-authorship, Library access, and Spotlight nominations. This is where most active users spend the majority of their time — growing from a free contributor into a trusted community member.
- *8,000-rep wall* — You've been a core contributor for the better part of a year. The community knows you.
- **Leadership** (Months 18–33): Mentor → Reviewer → Senior → Moderator. You're guiding and governing the platform. Reviewing newcomer content, conducting peer reviews, voting on governance, moderating. These are earned responsibilities, not rewards.

**Key design decisions:**

**Why is Newcomer a pure read-only level?** Newcomer is a "you just got here" state. You haven't proven anything — not even that you've read the Code of Conduct. The onboarding steps (tutorial, CoC, profile, follow advancements, read Library) are the absolute minimum investment to show you're a real person who intends to participate. Until you complete them, you're a spectator.

**Why is Apprentice at 33?** The onboarding steps earn exactly 33 rep — a quick ~20-minute process. It's deliberately small: onboarding is not a contribution, it's orientation. The low threshold means you start participating almost immediately, but the huge distance from Apprentice (33) to Initiate (333) means you need real contributions to progress.

**Why does supporting unlock at Apprentice (33) with a 75/month cap?** Supporting is a read-evaluate-endorse action — low risk, high engagement value. At +3 per support with a **75 rep/month cap**, it's a healthy ongoing supplement that motivates community participation without being a viable primary path. At maximum, support-giving contributes 900 rep/year — reaching Moderator (33,333) from supporting alone would take 37 years. It's a reward for being an engaged community member, not a leveling strategy.

**Why is Contributor the entry to the Core phase?** Contributor (1,333) is the moment supervision ends. You've spent ~2 months having every node and thread reviewed by established members. The community has concrete evidence of your quality. From here, you contribute freely — and the next 12,000 rep to Curator is about deepening trust, not proving basic competence.

**Why is the Core → Leadership gap 8,000 rep?** Moving from Curator (13,333) to Mentor (21,333) requires 8,000 rep — roughly 6–8 months of sustained contribution with no new unlock. Leadership roles carry real responsibility (reviewing newcomer content, conducting peer reviews, moderating). The gap ensures that only users who've spent a full year+ as core contributors can reach leadership positions.

**Why does Moderator require 33,333?** Moderation powers are the most impactful and hardest to reverse (changing node status, editing others' content, resolving flags). 33,333 rep represents **2.5–3 years** of sustained, diverse contribution — enough time to deeply understand community norms, build relationships, and demonstrate consistently trustworthy judgment. A moderator at this level has a genuine stake in the community.

### 5.2 Tier Roles — What Each Level Means

**Level 1 — Newcomer (0 rep)**

A dummy level. You just created an account. You can read everything on the platform — browse the Tree, read Library entries, scroll the Newsroom, read discussions — but you cannot do anything. No replies, no votes, no supports, no flags. You're a spectator. The only way forward is completing the onboarding steps (tutorial, Code of Conduct, profile, follow advancements, read Library entries), which earns exactly 33 rep and promotes you to Apprentice. This exists because the platform doesn't trust you yet — you haven't even proven you've read the rules.

**Level 2 — Apprentice (33 rep)**

Your first real level. You've completed onboarding, so the platform knows you've at least oriented yourself. You can post discussion replies directly (+3 rep each), support nodes in the Tree (+3 rep each, 75/month cap), vote on news links, and submit supervised discussion replies and news links (+10/+15 rep on approval). This is the "training wheels" level — you can participate in conversations and signal agreement, but you can't create original content (nodes, threads) yet. Everything high-impact goes through the supervised queue. The distance from here to Initiate (333) is 300 rep — several weeks of genuine engagement. This is where the platform starts to learn who you are.

**Level 3 — Initiate (333 rep)**

You've been active for a few weeks with supervised content approved, replies written, and ideas supported. Now you can submit supervised nodes and discussion threads (+25/+20 rep on approval), flag content (3/day, +15 rep if accurate), and submit news links directly (+7 rep). This is the final supervised level. You're doing real work — proposing ideas, starting conversations, flagging bad content — but your nodes and threads are still reviewed before publishing. You're roughly 2–2.5 months away from Contributor if you stay active daily.

**Level 4 — Contributor (1,333 rep)**

The single most important tier transition. **Supervision ends.** All content creation is unsupervised at standard rates — your ideas go directly onto the Tree, your threads go live immediately. You've spent ~2–3 months having content reviewed by the community, with 15–20+ pieces of supervised content approved. The platform has months of evidence that you contribute constructively. From here, rep comes from the quality and impact of your work — supports received, peer-reviewed content, breadth of contributions — not from passing a human review gate. The role of a Contributor is straightforward: create knowledge.

**Level 5 — Established (6,333 rep)**

You've been a free contributor for several months. The community recognizes your name. Now you can vouch for 1 user (+250 rep to them) and send co-authorship invitations on nodes and Library entries. This is about **social trust** — you've earned enough credibility to extend trust to others. But vouching carries severe consequences: if your vouchee gets banned, you lose -1,000 rep, 2 vouch slots, and a 90-day vouch freeze. For an Established user with 1 slot, a bad vouch is devastating — you lose the slot, drop well below Established, and can't vouch again for months even after re-earning the rep. Vouching is a genuine risk assessment, not a casual favor.

**Level 6 — Scholar (9,333 rep)**

You've been active for 8–10 months with deep advancement expertise. Now you can create Library entries (+30 rep each, +125 if approved via peer review) — curated learning resources with difficulty levels, citations, and version history. The Library is the platform's educational backbone; writing a good entry requires deep subject knowledge. Your flag limit is also lifted (unlimited). The Scholar role is about **curation and education** — you're organizing knowledge for others to learn from.

**Level 7 — Curator (13,333 rep)**

Roughly a year on the platform. Now you can nominate content for Spotlight ("Idea of the Week", +250 rep to winners). The Curator role is about **recognition and taste** — you're helping the community decide what its best work is. This requires judgment: understanding not just your own advancement area, but what constitutes genuinely significant thinking. This is the last Core tier. The next unlock (Mentor at 21,333) is 8,000 rep away — the largest gap in the system, intentionally filtering for sustained commitment before granting leadership responsibilities.

**Level 8 — Mentor (21,333 rep)**

The first Leadership tier. 1.5+ years of active membership, and you've crossed the 8,000-rep wall. Now you can vouch for 3 users total and review the supervised content queue — approving or rejecting newcomer submissions (+7 rep per review). The Mentor role is about **gatekeeping and guidance**. Every newcomer's experience depends on how Mentors run the queue: approve quality content quickly, reject bad content with constructive feedback, spot patterns of trolling or farming. This is the most directly impactful leadership role.

**Level 9 — Reviewer (25,333 rep)**

~2 years of active membership. Now you can claim and complete peer reviews (+75 rep each — the highest per-action reward) and vouch 5 users total. Peer review is formal, structured evaluation: accuracy, clarity, novelty, evidence quality. Your review determines whether content gets the "peer reviewed" badge, which unlocks quality multipliers (1.5x for reviewed, 2.0x for proven). The Reviewer role is about **quality assurance** — the platform's quality engine that separates The Guild from a random wiki. A thorough review takes 15–30 minutes and requires genuine expertise.

**Level 10 — Senior (29,333 rep)**

2+ years of active membership. Now you can vote in governance polls (adding advancement areas, changing rep thresholds, electing/removing moderators, changing content policy), vouch 7 users total, and access moderation analytics in read-only mode. The Senior role is about **governance** — you're helping steer the platform's direction. Governance votes are binding. Read-only analytics access means you can make informed decisions about proposals.

**Level 11 — Moderator (33,333 rep)**

The highest tier. 2.5–3 years of sustained, diverse contribution through every phase. Now you can change node status (theoretical → proven → disproved), edit any user's content, resolve flags (dismiss, action, or escalate), manage the moderation queue, access full admin analytics, and vouch 10 users total. Marking a node "proven" triggers +250 rep for the author and 2.0x support multipliers — getting it wrong damages scientific credibility. Flag resolutions can be appealed; 3+ overturned actions in 60 days triggers accountability consequences. The Moderator role is about **stewardship** — you're not above the system, you're accountable to it. Your rep still decays from inactivity, you can still be penalized, and the community can vote to remove you. If your rep drops below 33,333 for any reason, you immediately lose all moderator powers. A Moderator who recklessly vouches 3 bad actors would lose 3,000 rep, 6 vouch slots, and face a 90-day freeze — potentially dropping below the threshold entirely.

### 5.3 Tier Demotion

If a user's rep drops below a tier threshold (via penalties or decay), they lose that tier's privileges immediately. Access is always computed from current rep, never cached.

**Protected rights** (never lost regardless of rep):
- View all public content
- View and edit own profile
- View own content
- Respond to discussions about their own nodes

### 5.4 Vouch System

Vouching is a trust endorsement: "I believe this person will be a constructive member of this community." It carries real weight because it has real consequences.

**Receiving vouches:**
- Each vouch gives the recipient **+250 rep**
- A user can receive a maximum of **2 vouches** total (across all vouchers)
- Maximum rep from vouches: 500

**Giving vouches:**

| Tier | Lifetime Vouch Slots |
|------|---------------------|
| Established (6,333+) | 1 |
| Mentor (21,333+) | 3 |
| Reviewer (25,333+) | 5 |
| Senior (29,333+) | 7 |
| Moderator (33,333+) | 10 |

**Vouch cooldown**: Minimum **30 days** between vouches from the same user. You should be observing someone for at least a month before endorsing them.

**Vouch liability — harsh by design**: The vouch system is a known vulnerability. If someone you vouched for is banned (temp or permanent):

| Consequence | Effect |
|-------------|--------|
| **Rep penalty** | **-1,000 rep** per bad vouch |
| **Slot loss** | Lose **2 vouch slots** permanently (not 1 — you misjudged badly enough that your judgment itself is in question) |
| **Vouch freeze** | Cannot vouch anyone for **90 days** after a bad vouch |
| **Repeat offense** | If 2+ of your vouchees are banned within 12 months: additional **-2,000 rep** and **all remaining vouch slots permanently revoked** |

**Why this harsh?** Vouching is the single most exploitable path in the system. Without severe consequences:
- Users vouch anyone who asks, turning it into a rubber stamp
- Coordinated groups use vouch chains to fast-track sockpuppets (A vouches B, B reaches Established and vouches C, etc.)
- A bad actor who receives a vouch gets +250 rep — enough to skip weeks of supervised contribution

The -1,000 penalty means a single bad vouch costs roughly a month of active contribution. Losing 2 slots (not 1) means your vouching capacity is permanently degraded — an Established user with 1 slot who makes a bad vouch loses both their slot and drops well below the Established threshold, meaning they can't vouch again until they re-earn thousands of rep. A Moderator who recklessly endorses 3 bad actors would lose 3,000 rep, 6 slots, and face a 90-day freeze — potentially dropping below Moderator threshold entirely.

The 90-day freeze after a bad vouch ensures you can't immediately "try again" with a different person. You're forced to sit with the consequences and be more careful next time.

**The repeat offense clause** is the nuclear option: if you've vouched 2+ people who got banned within a year, your judgment about people is demonstrably broken. All remaining slots are permanently revoked — you can never vouch again regardless of how high your rep climbs. This completely shuts down vouch chain attacks where a compromised account keeps endorsing bad actors.

**Why vouching still exists despite the risk**: Because organic trust endorsement is valuable. A genuine vouch from someone who knows a newcomer in real life (a colleague, classmate, fellow researcher) is one of the strongest trust signals possible. The harsh penalties don't discourage legitimate vouching — they discourage casual, thoughtless vouching. If you truly know someone is a good contributor, -1,000 risk shouldn't scare you. If you're not sure, that hesitation is the system working as intended.

---

## 6. Earning Rep

### 6.1 Complete Earning Matrix

#### Knowledge Creation

| Action | Rep | Daily Rate Limit | Notes |
|--------|-----|-----------------|-------|
| Create a Tree node | +10 | 10 nodes | Small upfront reward. Real rep comes from supports. |
| Receive support on your node | +30 → +15 → +5 → +0 | — | Diminishing per node (see 4.3). Subject to quality multiplier (see 6.2). |
| Node status changed to "proven" | +250 | — | One-time per node. Requires moderator action. |
| Create a Library entry | +30 | 5 entries | Rewards curation effort. |
| Library entry approved via peer review | +125 | — | One-time per entry. Quality bonus. |
| Create a discussion thread | +10 | 5 threads | Low, encourages engagement. |
| Post a discussion reply | +3 | 15 replies | Very low. Prevents reply-farming. |
| Submit a news link | +7 | 5 links | Rewards curation. |
| Support another user's node | +3 | 10/day, **75/rolling 30-day cap** | Available from Apprentice (33+). Healthy supplement, not a primary path. Rolling window prevents month-boundary stacking. |

**Why is support-giving capped at 75 rep/month?** Supporting is a genuinely valuable community action — it signals agreement, motivates authors, and surfaces quality content. A 75/month cap keeps this motivation alive permanently: you always have a reason to support good work. At maximum, support-giving contributes 900 rep/year — reaching Moderator (33,333) from support alone would take 37 years. It's a reward for being an engaged community member, not a leveling strategy. Unlike a lifetime cap, the monthly cap never "runs out" — a 5-year veteran still has a small incentive to support new ideas every month.

#### Supervised Content (Apprentices and Initiates)

Supervised content earns rep **only on approval** — if rejected, the author earns nothing. The rates are higher than unsupervised equivalents because community-reviewed content is quality-verified.

| Supervised Action | Rep (on approval) | Available From | Notes |
|-------------------|-------------------|----------------|-------|
| Discussion reply approved | +10 | Apprentice (33+) | vs. +3 unsupervised. Reviewer verified it adds value. |
| News link approved | +15 | Apprentice (33+) | vs. +7 unsupervised. Reviewer verified relevance. |
| Discussion thread approved | +20 | Initiate (333+) | vs. +10 unsupervised. Higher-value content. |
| Tree node approved | +25 | Initiate (333+) | vs. +10 unsupervised. Ideas enter the Tree only after endorsement. |

**Why are supervised rates higher than unsupervised?** Because the supervised queue is a quality gate. A supervised reply at +10 was reviewed and endorsed by a Mentor — that's a stronger signal than an unsupervised reply at +3. The higher rates also mean newcomers reach milestones through fewer, higher-quality contributions rather than mass-producing low-effort content.

**After reaching Contributor (1,333+)**: All content is unsupervised at the standard rates. Supervised rates no longer apply.

**Why +10 for node creation, not +20 or +30?** Node creation is the most farmable action — a user controls it entirely without community validation. At +10, creating 10 nodes/day (the rate limit) generates only 100 rep. The real signal of value is whether other users support the node. This design separates effort (creation) from impact (support), preventing low-effort grinding.

**Why +3 for replies?** Discussion replies are important for community health but trivially easy to produce. At +3 with a 15/day limit, the maximum daily rep from replies is 45 — meaningful over months for an active participant but impossible to grind into significance.

#### Quality Validation

| Action | Rep | Daily Rate Limit | Notes |
|--------|-----|-----------------|-------|
| Complete a peer review | +75 | 5 reviews | High reward — this is the platform's quality engine. |
| Review supervised content (approve or reject) | +7 | 15 reviews | Keeps the newcomer queue flowing. Mentor+ only. |
| Your content passes peer review | +60 | — | Rewards submitting work for validation. |
| Accurate flag (flag upheld by moderator) | +15 | 10 flags | Rewards community policing. |
| Inaccurate flag (flag dismissed by moderator) | -10 | — | Discourages frivolous flags. |
| 5+ flags dismissed within 30 days | -75 + 7-day flag ban | — | Escalating consequence for flag abuse. |

**Why +75 for peer review?** Reviews are high-effort, high-value work. A thorough review takes 15–30 minutes. At +75, completing 2 reviews per week generates 600 rep/month from reviews alone — a substantial earning path that rewards the most important contribution type. This is deliberately the highest per-action reward after breakthroughs and proven status.

#### Onboarding (one-time, 0 → 33)

| Action | Rep | Notes |
|--------|-----|-------|
| Complete interactive tutorial | +10 | Platform orientation. |
| Acknowledge Code of Conduct | +5 | Behavioral expectations. |
| Complete profile (name, bio, avatar) | +8 | Identity investment. |
| Follow at least 2 advancements | +5 | Interest signaling. |
| Read 3 Library entries | +5 | Content familiarization. |
| **Total** | **33** | **→ Apprentice** |

#### Social & Recognition

| Action | Rep | Limits | Notes |
|--------|-----|--------|-------|
| School email verified | +333 | One-time | Identity verification. Thematic number. |
| Vouched by another user | +250 | Max 2 received | Trust endorsement. See section 5.4. |
| Win Spotlight ("Idea of the Week") | +250 | 1/week | Community recognition of excellence. |
| Earn a milestone achievement | +33 | Per achievement | First Node, First Thread, 100 Supports, etc. |
| Earn an advancement achievement | +66 | Per achievement | Created node in a specific advancement area. |
| Earn a special achievement | +133 | Per achievement | Verified Contributor, Peer Reviewer, Library Scholar. |
| 7-day contribution streak | +33 | Per milestone | |
| 30-day contribution streak | +66 | Per milestone | |
| 100-day contribution streak | +166 | Per milestone | |

**Why +250 for Spotlight wins, not +333?** Spotlights are weekly. At +333, a user who wins Spotlight every month for a year would earn 4,000 rep from Spotlights alone — more than 10% of the path to Moderator from a single passive honor. At +250, it's still significant recognition without dominating progression.

#### Breakthrough Bonus (see section 10)

| Recipient | Rep |
|-----------|-----|
| Node author | +1,666 |
| Co-author of the node | +833 each |
| Peer reviewer who approved the node | +250 |
| User who nominated the breakthrough | +83 |
| Each breakthrough voter (yes or no) | +10 |

### 6.2 Quality Multiplier on Supports

Not all content is equal. Nodes that have been validated through peer review should earn more from subsequent supports — this directly implements the principle that rep measures trust, not popularity.

| Node Validation Status | Support Rep Multiplier |
|-----------------------|-----------------------|
| Unreviewed (default) | 1.0x (standard rate) |
| Passed peer review ("approved") | 1.5x |
| Status changed to "proven" | 2.0x |

**What this means in practice:**

| Supports on a Node | Unreviewed (1.0x) | Reviewed (1.5x) | Proven (2.0x) |
|--------------------|--------------------|------------------|----------------|
| 1–10 | +30 each | +45 each | +60 each |
| 11–25 | +15 each | +23 each | +30 each |
| 26–50 | +5 each | +8 each | +10 each |
| **Max total rep** | **650** | **995** | **1,300** |

A single proven node can earn 1,300 rep for its author — roughly equivalent to a month of active contribution. But achieving "proven" status requires passing peer review, earning 25+ supports, and having a moderator confirm the science. This is the system working as intended: exceptional validated work earns exceptional rewards.

### 6.3 Breadth Bonus

Users who contribute across multiple content types earn a weekly bonus. This explicitly rewards the multi-faceted contributors the platform values most.

Content types that count: nodes, library entries, discussions (threads or replies), news links, peer reviews, flags.

| Distinct Types Contributed (per week) | Bonus |
|--------------------------------------|-------|
| 1 type | None |
| 2 types | +5% of base rep earned that week |
| 3 types | +10% |
| 4+ types | +15% |

**Weekly cap on breadth bonus**: +75 rep. This prevents gaming by doing one minimal action in each category.

**Example**: A contributor earns 400 base rep in a week from nodes, reviews, and discussions (3 types). Their breadth bonus is 10% × 400 = 40 rep, for a total of 440.

### 6.4 Progression Model

With the full earning matrix, here's a realistic timeline for a consistently active, diverse academic contributor:

**Day 1 — Onboarding + School Email (academic user)**:

| Source | Rep |
|--------|-----|
| Onboarding (tutorial, CoC, profile, follow, read) | +33 |
| School email verification | +333 |
| **Day 1 total** | **366** (Apprentice → past Initiate) |

**Weeks 1–3 — Initiate → Contributor (supervised phase)**:

| Source | Rep |
|--------|-----|
| Day 1 total | 366 |
| 6 supervised nodes — approved | +150 |
| 10 discussion replies | +30 |
| 3 news links | +21 |
| 10 supports received across nodes | +300 |
| Support 20 nodes | +60 |
| First Node achievement | +33 |
| 1 advancement achievement | +66 |
| Breadth bonus (4 types) | +30 |
| **End of week 3** | **~1,056** |
| Week 4–5: continued contributions | +300 |
| **Contributor (1,333)** | **~1,356** |

**Months 2–6 — Contributor → Established (core phase begins)**:

| Source (per month avg) | Rep |
|-----------------------|-----|
| 10 nodes created | +100 |
| ~20 supports received across nodes | +500 |
| 2 discussion threads | +20 |
| 15 discussion replies | +45 |
| 3 news links | +21 |
| Support 25 nodes/month (cap) | +75 |
| 1 vouch received | +250 (month 2 only) |
| 1–2 achievements | +80 |
| 7-day streak | +33 (month 1 only) |
| Breadth bonus | +60 |
| **Monthly total** | **~1,000–1,100** |
| **Running total (end of month 6)** | **~6,400** (Established) |

**Months 7–12 — Established → Scholar → Curator (core phase continues)**:

| Source (per month avg) | Rep |
|-----------------------|-----|
| Previous base rate | +1,000 |
| 2nd vouch received | +250 (once) |
| 30-day streak | +66 (once) |
| Spotlight win | +250 (once) |
| **Monthly total** | **~1,000–1,200** |
| **Running total (end of month 12)** | **~13,500** (Curator) |

**Months 13–20 — crossing the 8,000-rep wall → Mentor → Reviewer**:

| Source (per month avg) | Rep |
|-----------------------|-----|
| Previous base rate | +1,000 |
| Library entries (unlocked at Scholar/9,333): 3 created, 1 approved | +215 |
| Supervised queue reviewing (unlocked at Mentor/21,333): 10/month | +70 |
| 100-day streak | +166 (once) |
| **Monthly total** | **~1,100–1,300** |
| **Running total (end of month 20)** | **~23,500** (approaching Reviewer) |

**Months 21–28 — Reviewer → Senior → Moderator (leadership phase)**:

| Source (per month avg) | Rep |
|-----------------------|-----|
| Previous base rate | +1,100 |
| Peer reviews (unlocked at Reviewer/25,333): 6/month completed | +450 |
| Content passing review: 2/month | +120 |
| Quality multiplier on reviewed nodes | +100 |
| Governance votes (unlocked at Senior/29,333) | +21 |
| **Monthly total** | **~1,500–1,800** |
| **Running total (end of month 28)** | **~33,500** (Moderator) |

**Total time for an active academic user: ~2.5 years.**

**Non-academic user**: ~3 months to reach Contributor through onboarding + supervised content path (section 9.5). After that, progression matches the academic path but offset by ~2 months and minus the school email bonus (-333 rep). A vouch (+250) closes most of that gap. Expect **3–3.5 years to Moderator**.

**Single-action grinder (nodes only)**: No breadth bonus, no review rep, no library rep, limited achievements. Earns ~700/month. Would take **4+ years** to Moderator — and the anti-gaming system (section 8) would likely flag them long before that.

**Casual contributor (2–3 actions per week)**: Earns ~300–500/month. Senior in ~5 years, Moderator in ~7+ years if they sustain it. Moderator status is not meant for casual participants.

---

## 7. Losing Rep

### 7.1 Moderation Penalties

When a flag is resolved as "actioned" (upheld) by a moderator, the content creator loses rep. First offenses are lighter for minor violations — people make genuine mistakes. Escalation is steep for repeat offenses.

| Flag Reason | First Offense | Second Offense | Third+ Offense |
|-------------|--------------|----------------|----------------|
| Off-topic | **Warning** (no rep loss) | -50 | -150 |
| Spam | -100 | -300 | -666 |
| Misinformation | -100 | -333 | -833 |
| Plagiarism | -250 | -666 | -1,666 |
| Harassment | -333 | -1,000 | Permanent ban |
| Falsified data (future) | -666 | Permanent ban | — |

**Why warnings for first off-topic?** New users may genuinely not understand which advancement their idea belongs in, or what constitutes on-topic content. A warning educates without punishing. If they repeat the behavior after being warned, then penalties apply.

**Why -666 for first falsified-data offense?** Scientific integrity is the platform's foundation. Fabricating data is the most destructive possible act on a research collaboration platform. The first offense penalty equals roughly 2–3 weeks of active contribution — enough to make fabrication never worth the risk, even for established users.

**Offense tracking**: Per-user offense count is stored in a `moderationHistory` subcollection with timestamps and flag reasons. Offenses older than **12 months** decay from the escalation count (they remain in history for auditing but don't trigger higher-tier penalties). This means a user who had one spam offense 2 years ago is treated as a first-time offender if it happens again.

### 7.2 Automatic Temporary Ban

A user whose rep drops below **-166** is automatically temp-banned.

| Ban Instance | Duration |
|-------------|----------|
| First temp ban | 7 days |
| Second temp ban | 30 days |
| Third temp ban | Permanent (requires admin appeal to reverse) |

**Why -166 and not 0?** With lighter first-offense penalties, a user at 0 rep who gets one spam flag (-100) drops to -100 but is not banned. They get a chance to recover. A second offense (-300) drops them to -400 — clearly below -166, triggering a ban. This gives first-time offenders one chance while ensuring repeat offenders are caught quickly.

For serious violations like harassment (-333 first offense), a user at 0 rep immediately drops to -333 and is banned. The system has zero tolerance for harassment, even on a first offense at zero rep. Users who've earned rep get more rope: a 1,500-rep user with a harassment flag drops to 1,167, still far from -166.

**During temp ban**: User can read content and view their profile. They cannot create, edit, vote, flag, support, or vouch. A `bannedUntil` timestamp on the user document controls this, checked by Firestore rules.

### 7.3 Cascading Consequences

When a user is banned (temp or permanent):

- All their pending peer reviews are released back to the queue
- All their pending Spotlight nominations are withdrawn
- Active co-authorship invitations are cancelled
- Vouchers who endorsed them lose -1,000 rep, 2 vouch slots, and a 90-day vouch freeze per vouch (see 5.4)
- Their content remains visible but flagged with a "suspended author" indicator
- They cannot be vouched while banned
- Their ban is logged in the admin audit trail

### 7.4 Penalty Appeals

Users who receive a moderation penalty can appeal within **14 days**:

1. User submits an appeal (text explanation, max 2,000 characters)
2. Appeal is assigned to a **different moderator** than the one who actioned the original flag
3. **Appeal upheld** (user was right): Penalty reversed, rep restored, flag marked as "overturned"
4. **Appeal denied**: Penalty stands, no further appeal for that specific flag
5. **Moderator accountability**: If a moderator has 3+ actions overturned on appeal within 60 days, they receive a -83 rep penalty per overturned action (see section 13.2)

---

## 8. Anti-Gaming & Abuse Prevention

### 8.1 Sybil Attack Defense

**Threat**: A user creates multiple accounts to inflate their own rep through mutual vouching, self-support, or vote rings.

| Defense Layer | Mechanism | What It Catches |
|--------------|-----------|----------------|
| **Rate limiting** | 10s min between writes; hourly/daily caps per collection | Scripted bot attacks |
| **Vouch graph analysis** | Detect closed vouch loops: A → B → C → A | Coordinated multi-account onboarding |
| **Support source diversity** | Track unique supporters per author. If >50% of an author's supports come from ≤3 accounts, flag for review | Vote ring farming |
| **Creation correlation** | Flag accounts created from the same IP within 48h (hashed IP, stored ≤30 days) | Same-device sockpuppets |
| **Behavioral clustering** | If two accounts mutually support each other with >5 reciprocal supports AND were created within 7 days of each other, flag for review | Sophisticated sockpuppet pairs |
| **New account throttle** | Accounts <7 days old: reduced rate limits (see 8.5) | Drive-by spam accounts |

### 8.2 Content Quality Gates

**Threat**: A user creates many low-effort nodes to farm creation rep or attract undiscriminating support.

| Quality Signal | Effect |
|---------------|--------|
| Node description < 50 characters | Support rep disabled for this node (author gets +10 creation rep but no support rep) |
| Node title < 10 characters | Rejected at validation |
| Node description identical to existing node (>90% text overlap) | Rejected with "duplicate content" |
| User creates 5+ nodes with same first 20 title characters | Flag for review; reduced to 1 node/day until reviewed |
| Node receives an upheld flag within 48h of creation | All support rep from that node is retroactively reversed |
| Library entry has zero citations/references | Cannot pass peer review |

### 8.3 Vote Ring Detection

A scheduled Cloud Function runs daily:

```
For each user U with > 15 supports given:
  1. Group U's supports by recipient author
  2. If any single author received > 40% of U's total supports → flag both accounts
  3. If U gave > 5 supports in a single hour → flag U
  4. If U supports a cluster of authors who all also support each other → flag entire cluster

For each pair (A, B) where A supported B AND B supported A:
  5. If mutual support count > 4 → flag both accounts
```

**When flagged**: Admins see a "suspicious activity" alert. Options:
- **Dismiss**: False positive (common in small communities with few users)
- **Freeze**: Lock flagged accounts' rep pending investigation
- **Action**: Reverse fraudulent rep gains, apply -166 to -666 penalty per account, potential ban

### 8.4 Farming Pattern Detection

| Pattern | Detection Method | Response |
|---------|-----------------|----------|
| **Support cycling**: Two users alternate supporting each other's nodes | Query for reciprocal pairs with >4 mutual supports | Freeze support rep for both; admin review |
| **Achievement grinding**: Creating and immediately deleting content | If deleted:created ratio > 30% in last 30 days, flag | Pause achievement rep; admin review |
| **Discussion spam**: Posting minimal replies to farm +1 rep | If >80% of replies are <15 characters in last 30 days, flag | Reply rep set to 0 until ratio drops below 50% |
| **Vouch laundering**: Creating new accounts to get fresh vouch slots | Detect accounts with similar email patterns or same IP | Admin review; potential ban of all linked accounts |
| **Flag weaponization**: Filing mass flags against a specific user to trigger their penalty escalation | If >3 of a flagger's flags against the same target are dismissed, flag the flagger | -83 rep for the flagger; 14-day flag ban |

### 8.5 Rate Limits

| Action | Per Hour | Per Day | Minimum Interval | Account Age < 7 Days |
|--------|----------|---------|-------------------|---------------------|
| Create node | 5 | 10 | 10s | 2/day |
| Create library entry | 2 | 5 | 30s | 1/day |
| Create discussion thread | 3 | 10 | 30s | 2/day |
| Create discussion reply | 10 | 30 | 10s | 5/day |
| Submit news link | 3 | 10 | 30s | 1/day |
| Support a node | 20 | 50 | 5s | 10/day, Apprentice+ only, **75 rep/rolling 30-day cap** |
| Vote on news | 20 | 50 | 5s | 10/day |
| Flag content | 5 | 15 | 60s | 3/day |
| Submit peer review | 3 | 5 | 120s | N/A (requires 25,333+ rep) |
| Vouch a user | — | 1 | 30 days | N/A (requires 6,333+ rep) |
| Submit supervised content | 5 | 10 | 30s | 5/day |

### 8.6 Supervised Queue Flooding

**Threat**: A coordinated group of Apprentices/Initiates floods the supervised queue with junk submissions. Reviewers can't keep up. After 48h, the unreviewed content auto-publishes — including harmful material buried in the flood.

| Defense Layer | Mechanism |
|--------------|-----------|
| **Per-user submission cap** | Max 10 supervised submissions/day (5 for accounts <7 days). A single user can't flood the queue alone. |
| **Rejection rate throttle** | If >50% of a user's supervised submissions in the last 14 days were rejected, their submission rate drops to 2/day and minimum interval increases to 5 minutes. 3 consecutive rejections triggers a 48h submission cooldown. |
| **Queue depth circuit breaker** | If the queue exceeds **30 pending items** with <3 active reviewers, auto-publish timeout extends to **72h** (not shortens). The queue should slow down when overwhelmed, not speed up. The 24h adaptive timeout (section 15) only applies when there *are* active reviewers but the queue is moderately backed up. |
| **Auto-publish review** | Auto-published content is tagged "unreviewed" and enters a **priority review backlog**. If flagged within 7 days, it's treated as if it had been rejected — author earns no rep and the content is removed. |
| **Coordinated flood detection** | If 5+ accounts created within 7 days of each other all submit supervised content within the same 2h window, flag the entire group and pause their submissions pending admin review. |

### 8.7 Distributed Flag Attack (Griefing)

**Threat**: A coordinated group each files 1–2 flags against the same target user. Each individual is under the flag abuse threshold (>3 dismissed flags against the same target), but the target accumulates many flags and potentially loses rep from one being actioned.

| Defense Layer | Mechanism |
|--------------|-----------|
| **Target-side flag aggregation** | If a single piece of content receives 3+ flags from accounts created within 30 days of each other, escalate to admin review before actioning. Coordinated groups tend to have correlated account ages. |
| **Flag burst detection** | If a user receives 5+ flags across different content within 48h, freeze all pending flags for admin review. Legitimate moderation is distributed over time; coordinated attacks are bursty. |
| **Reversed flag accounting** | If 3+ flags against the same target are dismissed within 7 days, all flaggers receive the -83 penalty and 14-day flag ban — not just the individual who crossed the threshold. The system treats correlated dismissed flags as a coordinated attack. |

### 8.8 Content Deletion After Farming

**Threat**: A user creates a node, receives supports (+rep), then deletes the node. They keep the rep but the content is gone — the platform gets nothing.

**Mitigation**: When a user deletes their own content:
- **Support rep is retroactively reversed**: All `node_support_received` rep events for that node are reversed as `admin_adjustment` events with reason "source_content_deleted."
- **Creation rep is kept**: The +10 creation rep is not reversed — the user did create something, and deleting it is within their rights.
- **Deletion ratio tracking**: If a user's deleted:created ratio exceeds 30% in the last 30 days, their content creation rate limits are halved until the ratio drops below 20%. (Already partially covered in 8.4 for achievement grinding, but this extends to all rep, not just achievements.)

### 8.9 Vouch Chain Laundering

**Threat**: A coordinates with B. A vouches B (+250). B grinds to Established (6,333). B vouches C (+250). C grinds to Established. C vouches D. Each link is indirect — no closed loop for vouch graph analysis (8.1) to detect.

**Why the existing defenses are insufficient**: Vouch graph analysis (8.1) only catches *closed* loops (A → B → C → A). A linear chain (A → B → C → D) has no loop. Each person vouches exactly once, which is legitimate behavior. The chain is invisible to pair-wise analysis.

| Defense Layer | Mechanism |
|--------------|-----------|
| **Vouch depth tracking** | Every vouch records the "vouch lineage" — who vouched the voucher. If a chain reaches depth 4+ (A vouched B who vouched C who vouched D who vouches E), flag the entire chain for admin review. Legitimate trust networks branch (many people vouch many people); laundering chains are linear. |
| **Time correlation** | If B reaches Established and vouches C within 14 days of being vouched by A, flag both vouches. Legitimate users don't immediately vouch someone the day they unlock the ability — they've been building trust over months. |
| **Voucher age gate** | A user cannot vouch anyone until they have been at Established (6,333+) for at least **30 days**. This prevents rapid chain progression where each link grinds to threshold and immediately vouches the next person. |

### 8.10 Vouch Liability Cascade Weaponization

**Threat**: Attacker creates accounts B and C. Legitimate user A vouches B (believing B is genuine). B grinds to Established and vouches C. The attacker then intentionally gets C banned. B loses -1,000 rep and may drop enough to also get penalized. If B is temp-banned as a result, A loses -1,000 rep too — the attacker has caused A to lose 1,000 rep without A having any relationship to C.

**Mitigation**:
- **Cascade depth limit**: Vouch liability only triggers for the **direct voucher** of the banned user. If C is banned, B (who vouched C) pays the penalty. A (who vouched B) does **not** pay a penalty unless B themselves is banned through a separate moderation action — not merely from the rep drop caused by vouch liability. Vouch liability rep loss alone does not trigger cascading consequences for upstream vouchers.
- **Distinction between ban types**: Vouch liability (section 7.3) triggers only on **moderation bans** (temp or permanent bans issued via the flag/penalty system). A user who merely drops below 0 rep from vouch liability penalties is not "banned" for cascade purposes — they're just low on rep and can recover.

### 8.11 Moderator Power Abuse — "Proven" Status Farming

**Threat**: A compromised or colluding moderator marks friendly nodes as "proven" (+250 rep each) to inflate allies' rep. Proven status also enables the 2.0x quality multiplier on supports, compounding the inflation.

| Defense Layer | Mechanism |
|--------------|-----------|
| **Dual-moderator for proven status** | Changing a node to "proven" requires **2 Moderators** to independently agree (same as large penalties in 13.1). This is a high-impact action — it gates breakthrough eligibility and doubles support rep. |
| **Proven rate limit** | A single moderator can set at most **3 nodes to proven per week**. This prevents mass-stamping. |
| **Proven status audit trail** | Every proven status change logs the moderator(s) who approved it. If a moderator has 3+ proven nodes flagged or reverted within 90 days, they lose proven-status privileges for 60 days. |
| **Conflict of interest** | A moderator cannot set their own nodes, their vouchees' nodes, or their co-authored nodes to proven. (Extends section 13.3.) |

### 8.12 Breakthrough Vote Manipulation

**Threat**: In a small-to-medium community, 10 coordinated Contributors could push through a questionable Breakthrough (66% of 10 = 7 yes votes needed). The +1,666 author reward makes this highly attractive.

**Mitigation** (extends section 10.3):
- **Voter tier weighting**: Breakthrough votes from Scholar (9,333+) and above count as 1.0 vote. Votes from Contributors (1,333–9,332) count as **0.5 vote**. The 10-voter and 66% thresholds apply to weighted votes. This means you need more lower-tier voters to push something through, and higher-tier users have proportionally more influence on scientific validation decisions.
- **Breakthrough quorum scaling**: The minimum 10 voters applies only when >50 active Contributors exist. Below that, the early-stage override (section 15.2) applies — but with the additional constraint that at least **2 of the voters must be Reviewer (25,333+) or above**.
- **Nomination cooldown**: A user can nominate at most **1 Breakthrough per 30 days**. Prevents rapid-fire nomination attempts.

### 8.13 Appeal System Abuse

**Threat**: Users appeal every penalty as a matter of course, hoping for a lenient second reviewer. Appeals are free (no cost) and always assigned to a different moderator — creating an incentive to always roll the dice.

**Mitigation**:
- **Appeal rate limit**: A user may have at most **1 active appeal** at a time. They cannot appeal a new penalty while a previous appeal is pending.
- **Frivolous appeal tracking**: If 3+ of a user's appeals are denied within 6 months, their next appeal incurs a **-50 rep filing fee** (refunded if the appeal is upheld). This doesn't prevent legitimate appeals but adds friction to systematic abuse.
- **Appeal doesn't suspend penalty**: The rep penalty is applied immediately when the flag is actioned. If the appeal is upheld, the rep is restored. The user is not in a "pending" state during the appeal — they've already lost the rep and any tier access it would have given them.

---

## 9. The Newcomer Funnel

### 9.1 The Problem

Non-academic users currently have no path from 0 to 100 rep. The vouch system requires knowing an existing contributor. A user who discovers the platform independently hits an invisible wall: they can read everything but contribute nothing, with no way to change that.

### 9.2 Two Phases: Onboarding (0 → 33), Then Contribution (33+)

The newcomer journey has two distinct phases:

**Phase 1 — Onboarding (0 → 33 rep = Newcomer → Apprentice):** Newcomer is a dummy level — you can read everything but do nothing else. The onboarding steps (tutorial, CoC, profile, follow advancements, read Library) are the minimum investment to prove you're a real person who intends to participate. This phase takes 15–30 minutes and gets you to Apprentice, where real participation begins.

**Phase 2 — Contribution (33+ rep):** From Apprentice onward, every point of rep comes from actual content that passes community review. There are no tasks, checklists, or gamified quests — only contributions and their outcomes. The supervised content queue filters quality before it reaches the platform.

### 9.3 Onboarding Rep (Newcomer → Apprentice)

New users earn their first 33 rep through orientation actions. These are one-time, non-repeatable, and exist solely to get users out of the Newcomer dummy level into Apprentice where real participation begins.

| Onboarding Action | Rep | Notes |
|-------------------|-----|-------|
| Complete the interactive tutorial | +10 | Walk through the Tree, Library, Newsroom. Learn the platform. |
| Acknowledge Code of Conduct | +5 | Read and accept. Establishes behavioral expectations. |
| Complete profile (display name, bio, avatar) | +8 | Identity investment. Named accounts behave better than anonymous ones. |
| Follow at least 2 advancements | +5 | Signals interest areas. Personalizes the feed. |
| Read 3 Library entries (any advancement) | +5 | Engages with existing content before creating new content. |
| **Total** | **33** | **→ Apprentice** |

**Why onboarding rep exists:** Newcomer is a dummy level — read-only, no participation. The onboarding steps are the entry fee to become a real member. It's the platform saying "welcome, take 20 minutes to learn how things work, and then you can start participating." At 33 rep (Apprentice), you can post direct replies, support nodes, and vote on news — enough to participate meaningfully while your supervised content gets reviewed.

**Why it caps at 33:** Onboarding actions don't build trust — they build familiarity. You shouldn't be able to reach Contributor (1,333) just by clicking through tutorials. The 33-rep onboarding only gets you to Apprentice — 300 rep below Initiate, 1,300 below Contributor. The real trust-building begins through supervised contributions.

**Can a troll exploit this?** They get 33 rep from onboarding — barely enough for Apprentice. At Apprentice they can post direct replies (+3 each, 15/day cap) and support nodes (+3 each, 75/month cap). Neither of these is high-impact. To reach Initiate (333) they need 300 more rep — that's 100 direct replies or several weeks of supervised content approvals. To reach Contributor (1,333) they need months of community-reviewed work. The onboarding rep is trivially small compared to the distance they'd need to cover.

### 9.4 Supervised Content — The Path From Apprentice Onward

From Apprentice (33+), every point of rep comes from actual contribution. The **supervised content queue** is the primary path. You submit real content (replies, news links, and later nodes and threads). A Mentor or higher reviews it. If it's good, it publishes and you earn rep. If it's not, it's rejected and you earn nothing.

This is the filter. A legitimate contributor submitting thoughtful replies and relevant news links will pass review consistently. A troll submitting garbage will be rejected consistently. The queue separates them before either reaches a tier where they can do damage.

**Supervised content rates** (earned only on approval):

| Supervised Action | Rep | Available From | Unsupervised Equivalent |
|-------------------|-----|----------------|------------------------|
| Discussion reply approved | +10 | Apprentice (33+) | +3 |
| News link approved | +15 | Apprentice (33+) | +7 |
| Discussion thread approved | +20 | Initiate (333+) | +10 |
| Tree node approved | +25 | Initiate (333+) | +10 |

**Why supervised rates are higher than unsupervised:** Because approved content was community-reviewed. A supervised reply at +10 carries more verified quality than an unsupervised reply at +3. The higher rates also ensure newcomers reach milestones through fewer, higher-quality contributions — not by mass-producing low-effort content.

**If rejected:** Author earns nothing. They receive the rejection reason so they can improve. No rep penalty for rejected submissions — the system encourages trying, not punishing failure. However, repeated rejections trigger a submission cooldown: >50% rejection rate in 14 days → 2/day limit; 3 consecutive rejections → 48h submission pause (see 8.6).

**Queue mechanics:**
- Any Mentor (21,333+ rep) or above can approve or reject
- Queue reviewer earns **+7 rep** per review (approve or reject)
- If content sits in the queue for **48h** with no review, it auto-publishes with an "unreviewed" tag (subject to queue depth circuit breaker — see 8.6)
- If a reviewer's approved content receives an upheld flag within 7 days, the reviewer is flagged for audit

### 9.5 The Non-Academic Path to Contributor

Here is the complete path for a user with no school email and no connections on the platform.

**Day 1 — Onboarding: Newcomer → Apprentice (0 → 33)**

The user signs up and goes through the onboarding flow:

| Action | Rep | Running Total |
|--------|-----|---------------|
| Complete interactive tutorial | +10 | 10 |
| Acknowledge Code of Conduct | +5 | 15 |
| Complete profile (name, bio, avatar) | +8 | 23 |
| Follow 2 advancements | +5 | 28 |
| Read 3 Library entries | +5 | 33 |
| **Status: Apprentice** | | **33** |

That's ~20 minutes of orientation. The user now understands the platform, has a completed profile, and can start contributing.

**Weeks 1–5 — Apprentice → Initiate (33 → 333)**

At Apprentice, the user can post direct replies (+3), support nodes (+3, 75/month cap), vote on news, and submit supervised discussion replies (+10 on approval) and supervised news links (+15 on approval). The distance from 33 to 333 is 300 rep — a substantial climb that takes several weeks.

| Action | Rep | Running Total |
|--------|-----|---------------|
| 25 direct discussion replies over weeks 1–2 | +75 | 108 |
| Support 25 nodes (month cap) | +75 | 183 |
| Submit 4 supervised news links — all approved | 4 × 15 = +60 | 243 |
| Submit 4 supervised replies — approved | 4 × 10 = +40 | 283 |
| 10 more direct replies | +30 | 313 |
| Submit 1 more supervised news link — approved | +15 | 328 |
| 2 more direct replies | +6 | 334 |
| **Status: Initiate** | | **334** |

**Months 2–3 — Initiate → Contributor (334 → 1,333)**

At Initiate, supervised nodes (+25 on approval) and supervised threads (+20 on approval) unlock. Direct news links (+7) and flagging (3/day, +15 if accurate) are available.

| Action (per month) | Rep | Running Total |
|---------------------|-----|---------------|
| Submit 4 supervised nodes — approved | 4 × 25 = +100 | 434 |
| Submit 2 supervised threads — approved | 2 × 20 = +40 | 474 |
| 30 direct discussion replies | +90 | 564 |
| Support 25 nodes (month cap) | +75 | 639 |
| Submit 4 news links directly | 4 × 7 = +28 | 667 |
| Flag 2 bad posts — upheld | 2 × 15 = +30 | 697 |
| Breadth bonus | +30 | 727 |
| Achievements | +66 | 793 |
| **End of month 2** | | **~793** |
| Month 3: similar rate (+430) | | **~1,223** |
| 5 more supervised nodes over next week — approved | 5 × 25 = +125 | 1,348 |
| **Status: Contributor** | | **~1,348** |

**Total time: ~3 months of genuine daily engagement.**

Over those months, the user has:
- Completed platform onboarding (Day 1)
- Had ~20 pieces of supervised content reviewed and approved by the community
- Written ~100 discussion replies
- Submitted ~13 news links
- Supported ~75 ideas in the Tree
- Flagged ~6 pieces of bad content

That's a serious track record. The platform now has months of concrete evidence that this person contributes constructively across multiple content types. They've earned the right to create content without supervision.

**If they receive a vouch** (+250) at any point, it accelerates everything significantly — cutting roughly a month off the timeline. But the vouch is a **bonus**, not a requirement.

**Academic user**: School email verification (+333) combined with onboarding (+33) puts them at 366 on day 1 — already past Initiate. With supervised content and direct contributions, they can reach Contributor within a few weeks. The school email is itself a trust signal — an institutional affiliation acts as a form of external verification.

### 9.6 What Happens to a Troll on This Path?

A troll going through the same process:
- Day 1: Creates account. Completes onboarding → 33 rep (Apprentice). Now has access to direct replies (+3) and supporting nodes (+3).
- Day 1–2: Posts low-effort direct replies and supports random nodes. Earns some rep. But at +3 per action with daily caps, this is slow — max ~45/day from replies alone.
- Day 3: Tries submitting supervised content with spam/nonsense → **rejected by reviewers** → 0 rep earned from those.
- Day 4: Tries submitting something that looks OK but is plagiarized → approved, but flagged by another user within hours → upheld → content removed, **+15 earned then -100 penalty** → net -85 rep. Drops to -52. One more flag and they're temp-banned.
- Day 5+: Continues submitting garbage → rejected. Direct replies flagged as spam → -100 penalty per upheld flag → drops well below -166 → **temp-banned**.
- **After 1 week**: Negative rep, temp-banned, multiple rejections and upheld flags on record. Still Apprentice at best, still can't create unsupervised nodes or threads.

The onboarding rep gives trolls only 33 rep — barely into Apprentice and trivially close to zero. Direct replies at +3 each are too slow to grind meaningfully (Initiate at 333 is 100 replies away). Supervised content is caught before publishing. The moment a troll tries anything harmful, a single flag penalty (-100) wipes out three days of grinding and puts them below zero. The math is brutally punishing: the distance from Apprentice (33) to anything meaningful (Initiate at 333, Contributor at 1,333) is enormous relative to the damage a flag penalty does.

### 9.7 Community Welcome

New users who complete their profile get a one-time welcome thread auto-created in a "Welcome" category:

- Pre-filled with their display name, interests, and background
- Existing contributors can reply with advice and introductions
- Replying contributors earn +3 per welcome reply (cap: +9/day for welcome replies)
- The newcomer earns no rep from the welcome thread — rep comes from contributions, not from being welcomed

### 9.8 What If There Aren't Enough Reviewers?

On a young platform with few Mentors, the supervised queue may bottleneck. Mitigations:

1. **48h auto-publish**: Content that isn't reviewed within 48h publishes automatically with an "unreviewed" tag (see 9.4). Subject to queue depth circuit breaker (see 8.6) — if the queue is overwhelmed, timeout extends rather than shortens.
2. **Reviewer incentive**: +7 rep per supervised review keeps the queue moving
3. **Admin can approve supervised content**: Admins bypass tier requirements
4. **Adaptive timeout**: If the queue has 10–30 pending items and ≥3 active reviewers, timeout drops to 24h (see section 15). If >30 pending items with <3 reviewers, timeout extends to 72h (see 8.6).

---

## 10. Breakthrough System

### 10.1 What Is a Breakthrough?

A Breakthrough is the platform's highest honor for a single idea. It means: "This idea has been peer-reviewed, community-validated, scientifically supported, and has survived sustained scrutiny." Breakthroughs are rare by design — a thriving platform might see 1–3 per advancement per year.

### 10.2 Eligibility Criteria

A node becomes eligible for Breakthrough nomination when **all five** conditions are met:

| # | Criterion | Rationale |
|---|-----------|-----------|
| 1 | Node status is **"proven"** (set by a moderator) | Science has been validated at the moderation level |
| 2 | ≥ **20 supports** from distinct users | Broad community endorsement, not just a few fans |
| 3 | Passed peer review with average score **≥ 4.0 / 5.0** | High-quality structured feedback confirmed merit |
| 4 | ≥ **3 supporters are Scholar (9,333+) or above** | Endorsed by experienced members, not just newcomers |
| 5 | Node is ≥ **21 days old** | Survived 3 weeks of community scrutiny without being disproved |

### 10.3 Nomination and Voting

1. Any **Reviewer (25,333+) or above** can nominate an eligible node
2. Nomination opens a **7-day voting window** visible to all Contributors (1,333+)
3. **Voting threshold**: ≥ 66% approval AND minimum 10 voters
4. If threshold met → Breakthrough status conferred automatically
5. If threshold not met → Nomination expires; node can be re-nominated after **60 days**
6. Each user can vote on each nomination exactly once (no changing votes)

### 10.4 Breakthrough Rewards

| Recipient | Rep | Notes |
|-----------|-----|-------|
| Node author | +1,666 | Equivalent to ~1 month of top-tier contribution |
| Each co-author | +833 | Shared credit for collaborative work |
| Peer reviewer who approved the node | +250 | Validated the science early |
| User who nominated the breakthrough | +83 | Curation reward |
| Each voter (yes or no) | +10 | Governance participation (not just yes-voters) |

### 10.5 Breakthrough Revocation

If a Breakthrough node is later found to contain falsified data or plagiarism (via flag → moderation escalation):

1. Breakthrough status is revoked
2. **All Breakthrough rep bonuses are reversed** for all recipients (author, co-authors, reviewer, nominator, voters)
3. Author receives an additional **-666 penalty** on top of the normal falsification/plagiarism penalty
4. Revocation requires **2 Moderators + 1 Admin** to agree (see section 13)
5. The node is tagged as "Breakthrough Revoked" — it cannot be re-nominated

**Why such harsh revocation?** A Breakthrough is the platform's stamp of highest credibility. If it turns out to be fraudulent, the platform's entire trust model is undermined. The reversal ensures that no one profits from a fraudulent breakthrough, and the additional -666 ensures the author is worse off than if they'd never submitted it.

---

## 11. Rep History & Transparency

### 11.1 Rep Event Log

Every rep change — positive or negative — is recorded in a `repHistory` subcollection:

```
type RepReason =
  | "node_created"
  | "node_support_received"
  | "node_proven"
  | "node_breakthrough"
  | "library_entry_created"
  | "library_entry_approved"
  | "peer_review_completed"
  | "content_peer_reviewed"
  | "discussion_thread_created"
  | "discussion_reply_created"
  | "news_link_submitted"
  | "news_link_upvoted"
  | "spotlight_win"
  | "achievement_earned"
  | "streak_milestone"
  | "school_email_verified"
  | "vouch_received"
  | "vouch_liability"
  | "vouch_slots_revoked"
  | "vouch_freeze"
  | "onboarding_action"
  | "supervised_approval_bonus"
  | "supervised_reviewer"
  | "welcome_engagement"
  | "breadth_bonus"
  | "quality_multiplier"
  | "flag_accurate"
  | "flag_inaccurate"
  | "flag_abuse_penalty"
  | "moderation_penalty"
  | "moderation_warning"
  | "appeal_reversal"
  | "appeal_filing_fee"
  | "inactivity_decay"
  | "breakthrough_nomination"
  | "breakthrough_vote"
  | "breakthrough_reviewer"
  | "breakthrough_revocation"
  | "governance_vote"
  | "content_deleted_reversal"
  | "admin_adjustment"
  | "daily_cap_applied"

type RepEvent = {
  readonly userId: string
  readonly delta: number
  readonly reason: RepReason
  readonly sourceId: string | null
  readonly sourceDescription: string
  readonly timestamp: Timestamp
  readonly balanceAfter: number
}
```

### 11.2 User-Facing Rep Breakdown

Every user can view their own rep history:

- **Summary**: Pie chart of rep sources by category (creation, validation, social, penalties)
- **Timeline**: Chronological list of rep events with descriptions ("You earned +10 from a support on 'Telomere Extension via CRISPR'")
- **Monthly trend**: Total earned, total lost, net change per month

**Public profile view**: Other users see a simplified breakdown showing category percentages — "72% from knowledge creation, 18% from peer reviews, 10% from social." This lets the community assess whether someone's rep comes from genuine diverse contribution or single-action grinding.

### 11.3 Admin Audit View

- Full event log for any user with filtering by reason/date
- Ability to reverse specific rep events (recorded as `admin_adjustment` with the original event ID)
- Aggregate dashboard: rep distribution histogram, most common earning sources, penalty frequency, flagged accounts queue
- Inflation tracking: total rep in the system over time, average rep per user, median time to each tier

---

## 12. Admin Separation

### 12.1 The Problem

`isAdmin(rep)` checks `rep === -1`. Admin status is encoded in the rep number. Any rep arithmetic on an admin silently removes their admin access. Admins cannot participate in the merit system as regular users.

### 12.2 Proposed Model

```
type GuildUser = {
  readonly uid: string
  readonly email: string
  readonly displayName: string
  readonly repPoints: number         // always >= 0 for non-penalized users
  readonly role: UserRole            // independent of rep
  readonly isSchoolEmail: boolean
  readonly emailVerified: boolean
  readonly createdAt: Date
  readonly bannedUntil: Date | null  // null = not banned
  // ... other fields
}

type UserRole = "user" | "admin"
```

**`role` vs `repPoints`**: These are orthogonal. `role` governs administrative access (admin panel, user management, system config). `repPoints` governs community access (contribution gates, moderation, peer review). An admin with 0 rep can manage the system. A 10,000-rep Moderator cannot access admin functions.

**Firebase custom claims**: The existing `admin` custom claim remains authoritative for security. The `role` field in Firestore mirrors it for easier querying and UI rendering.

### 12.3 Migration

1. Add `role: UserRole` to GuildUser type and Zod schema (default: `"user"`)
2. One-time migration Cloud Function: for users where `repPoints === -1`, set `role: "admin"` and `repPoints: 0`
3. Update all domain functions: replace `rep === -1` checks with `role === "admin"`
4. Update Firestore rules: `isAdminUser()` checks `role` field or custom claim
5. Update `setAdminClaim` Cloud Function to set both `role` and custom claim
6. Remove `-1` sentinel from all code and documentation

---

## 13. Moderation Escalation

### 13.1 Tiered Decision-Making

Not all moderation decisions should be made by a single person. Higher-impact decisions require more consensus.

| Decision | Authority Required |
|----------|-------------------|
| Dismiss a flag | Any 1 Moderator |
| Action a flag (content removal, penalty ≤ 250 rep) | Any 1 Moderator |
| Action a flag (penalty > 250 rep) | 2 Moderators must independently agree |
| Set node status to "proven" | 2 Moderators must independently agree (see 8.11) |
| Temp ban a user | 2 Moderators OR 1 Admin |
| Permanent ban | Admin only |
| Revoke a Breakthrough | 2 Moderators + 1 Admin |
| Reverse another admin's rep adjustment | A different admin |

**Why dual-moderator for large penalties?** A single moderator issuing a -666 plagiarism penalty could be acting on a grudge or misunderstanding. Requiring a second independent review catches errors and prevents abuse of power. The second moderator must review the flag independently — they cannot simply rubber-stamp the first decision.

### 13.2 Moderator Accountability

| Event | Consequence |
|-------|-------------|
| 3+ flag actions overturned on appeal in 60 days | Warning notification |
| 5+ flag actions overturned in 90 days | Flag resolution privileges suspended for 30 days |
| Confirmed abuse of moderator power (admin determination) | -333 to -1,666 rep + potential demotion below 33,333 |
| Rep drops below 33,333 (any cause) | Immediate loss of all moderator privileges |

### 13.3 Conflict of Interest

A moderator **cannot** take action on flags involving:

- Their own content
- Content by someone who vouched them (or whom they vouched)
- Content they supported
- Content in a peer review they participated in (as reviewer or author)
- Content they co-authored

A moderator also **cannot** set "proven" status on:

- Their own nodes
- Nodes by someone they vouched (or who vouched them)
- Nodes they co-authored
- Nodes they supported (since proven status doubles their support's rep value)

If a conflict exists, the flag or status change is automatically reassigned to another moderator. If no unconflicted moderator is available, it escalates to admin.

---

## 14. Governance at Scale

### 14.1 Community Governance Votes

Senior (29,333+) and above can participate in governance votes on platform-wide decisions:

| Topic | Who Proposes | Who Votes | Approval Threshold | Min Voters |
|-------|-------------|-----------|-------------------|------------|
| Add new Advancement area | Moderators | Senior + Moderator | 75% | 15 |
| Change rep threshold values | Admins | All Contributors (1,333+) | 66% | 30 |
| Elect community moderator | Moderators | Senior + Moderator | 66% | 10 |
| Remove community moderator | Admins | Senior + Moderator | 75% | 10 |
| Change content policy | Moderators | All Contributors (1,333+) | 66% | 20 |

**Voting rep**: +7 per governance vote, capped at 5 votes/month for rep purposes.

### 14.2 Moderator Election

Not all moderators should reach the role by grinding rep. The community can elect moderators from the Senior Contributor pool:

1. Any Moderator nominates a Senior (29,333+ rep) user
2. Nominee accepts the nomination
3. **14-day campaign period**: Community reviews nominee's contribution history, rep breakdown, and moderation track record (if any)
4. **7-day vote** among Senior Contributors and Moderators
5. **If approved**: Nominee receives a +7,000 rep bonus (ensuring they meet the 33,333 threshold) and "Elected Moderator" achievement (+133)
6. **If rejected**: No penalty; re-nomination possible after 90 days

**Elected Moderator accountability**: Same as any moderator. If their rep drops below 33,333 (e.g., due to inactivity decay or penalties), they lose moderator status regardless of how they gained it. The community can also vote to remove them (see 14.1).

---

## 15. Early-Stage Considerations

### 15.1 The Small-Community Problem

Many systems in this design assume a certain minimum user base. On a platform with 20 Contributors:

- **Breakthrough voting** requires 10 voters — that's 50% of the community
- **Governance votes** require 10–30 voters — potentially the entire user base
- **Supervised queue** may have too few reviewers, creating bottlenecks
- **Vote ring detection** will flag legitimate mutual support (in a small group, everyone supports everyone)
- **Moderator quorum** (2 moderators for large penalties) requires at least 2 moderators

### 15.2 Adaptive Thresholds

Until the platform reaches stable community sizes, some thresholds should scale:

| System | Standard Threshold | Early-Stage Override | Graduated When |
|--------|-------------------|---------------------|----------------|
| Breakthrough voting | 10 voters | 5 voters | >50 active Contributors |
| Governance votes (min voters) | As specified | 50% of specified | >100 active Contributors |
| Supervised queue timeout | 48h auto-publish | 24h auto-publish | >20 active Contributors |
| Vote ring detection (reciprocal threshold) | 4 mutual supports | 8 mutual supports | >30 active Contributors |
| Dual-moderator requirement | Penalties > 250 rep | Admin-only fallback if <2 moderators | ≥2 Moderators exist |

**"Active"** = contributed at least once in the last 30 days.

### 15.3 Founder Bootstrapping

The first admin(s) must manually:
- Vouch early trusted contributors
- Award rep adjustments for founding contributions made before the rep system existed
- Act as the sole moderator until organic moderators emerge
- Override governance vote minimums for critical early decisions

This is an accepted trade-off. The system is designed for steady-state operation; the bootstrap period requires trust in the founding admin(s).

---

## 16. Implementation Sprints

Each sprint is scoped to what can be completed in a single conversation session using TDD. Every sprint leaves the codebase in a working state — tests green, lint passing, build succeeding. Sprints are ordered by dependency; within a group, order is flexible.

**Per-sprint workflow**: RED → GREEN → REFACTOR for each item. Domain types + tests first, then service layer, then Firestore rules, then UI if applicable. Commit after each sprint.

---

### Sprint 1 — Rep Event Types & History Infrastructure

**Goal**: Create the foundation types that every future rep mutation will use.

| Item | What to build | Where |
|------|--------------|-------|
| `RepReason` type | Union of all 35 reason codes | `domain/reputation.ts` |
| `RepEvent` type | `{ userId, delta, reason, sourceId, sourceDescription, timestamp, balanceAfter }` | `domain/reputation.ts` |
| Zod schema for `RepEvent` | `repEventSchema` + `parseRepEventDoc` | `lib/firestore-schemas.ts` |
| `addRepEvent` service | Write to `users/{uid}/repHistory` subcollection | `features/profile/user-service.ts` |
| `getRepHistory` service | Read paginated rep history for a user | `features/profile/user-service.ts` |
| Firestore rules | `repHistory` subcollection: read own only, no client writes | `firestore.rules` |
| Tests | Type validation, schema parsing, service behavior | Co-located |

**Depends on**: Nothing — this is the first sprint.

---

### Sprint 2 — Admin Separation

**Goal**: Replace `rep === -1` sentinel with explicit `role` field. Admins participate in the rep system as normal users.

| Item | What to build | Where |
|------|--------------|-------|
| `UserRole` type | `"user" \| "admin"` | `domain/user.ts` |
| Update `GuildUser` type | Add `role: UserRole`, add `bannedUntil: Date \| null` | `domain/user.ts` |
| Update Zod schema | Add `role` and `bannedUntil` fields | `lib/firestore-schemas.ts` |
| Replace all `rep === -1` checks | `isAdmin()` checks `role === "admin"` | `domain/*.ts`, `features/admin/*` |
| Migration Cloud Function | For users with `repPoints === -1`: set `role: "admin"`, `repPoints: 0` | `functions/src/index.ts` |
| Update Firestore rules | `isAdminUser()` checks `role` field | `firestore.rules` |
| Tests | Admin detection, migration behavior, edge cases | Co-located |

**Depends on**: Nothing — independent of Sprint 1.

---

### Sprint 3 — Eleven-Tier Trust Ladder

**Goal**: Replace the current 3-tier system (Observer/Contributor/Moderator) with 11 tiers across 4 phases.

| Item | What to build | Where |
|------|--------------|-------|
| Tier thresholds | `TIER_THRESHOLDS` constant with all 11 levels (0, 33, 333, 1333, 6333, 9333, 13333, 21333, 25333, 29333, 33333) | `domain/reputation.ts` |
| Tier names + phases | `TierName`, `TierPhase` types, `getTier()`, `getTierPhase()` | `domain/reputation.ts` |
| Gate functions | `canReply()`, `canSupport()`, `canFlag()`, `canCreateNode()`, `canVouch()`, `canCreateLibraryEntry()`, `canNominateSpotlight()`, `canReviewQueue()`, `canPeerReview()`, `canGovernanceVote()`, `canModerate()` | `domain/reputation.ts` |
| Vouch slot count | `getVouchSlots(rep)` returning 0/1/3/5/7/10 based on tier | `domain/reputation.ts` |
| Update Firestore rules | All write rules use new thresholds | `firestore.rules` |
| Update UI gate components | `RepGate` component uses new gate functions | `shared/components/RepGate.tsx` |
| Tests | Boundary tests for every tier transition, every gate function | Co-located |

**Depends on**: Sprint 2 (needs `role` field to separate admin from rep gates).

---

### Sprint 4 — Daily Cap + Diminishing Returns + Support Cap

**Goal**: Build the three cap systems that constrain rep accumulation.

| Item | What to build | Where |
|------|--------------|-------|
| `getDailyRepEarned()` | Query repHistory for today (UTC), sum positive deltas, exclude exemptions | `domain/reputation.ts` |
| `isUnderDailyCap()` | Check if adding `delta` would exceed 500 | `domain/reputation.ts` |
| `applyDailyCap()` | Reduce delta to fit remaining cap, emit `daily_cap_applied` event if truncated | `domain/reputation.ts` |
| Diminishing returns | `getSupportRepForNode(supportCount)` → +30/+15/+5/+0 curve | `domain/reputation.ts` |
| Rolling 30-day support cap | `getSupportGivingRepRemaining(repHistory, now)` → remaining of 75 | `domain/reputation.ts` |
| Tests | Cap at 500, exemptions (school email, vouch, achievements), diminishing curve at boundaries, rolling window edge cases | Co-located |

**Depends on**: Sprint 1 (needs repHistory to query daily totals).

---

### Sprint 5 — Earning Matrix: Content Creation

**Goal**: Make discussions, news links, and library entries earn rep.

| Item | What to build | Where |
|------|--------------|-------|
| Discussion thread rep | +10 on creation, emit `discussion_thread_created` event | `features/discussions/discussion-service.ts` |
| Discussion reply rep | +3 on creation, emit `discussion_reply_created` event | `features/discussions/discussion-service.ts` |
| News link rep | +7 on submission, emit `news_link_submitted` event | `features/newsroom/newsroom-service.ts` |
| News link upvote rep | +7 per 5 upvotes (diminishing: +3 at 26–50, +0 at 51+), emit `news_link_upvoted` | `features/newsroom/newsroom-service.ts` |
| Library entry rep | +30 on creation, emit `library_entry_created` event | `features/library/library-service.ts` |
| Library approval rep | +125 on peer review approval, emit `library_entry_approved` event | `features/library/library-service.ts` |
| Daily cap integration | All earnings pass through `applyDailyCap()` | All services |
| Tests | Each earning path, daily cap interaction, rate limit compliance | Co-located |

**Depends on**: Sprint 1 (repHistory), Sprint 4 (daily cap).

---

### Sprint 6 — Earning Matrix: Validation & Recognition

**Goal**: Make peer reviews, flags, achievements, streaks, and Spotlights earn rep.

| Item | What to build | Where |
|------|--------------|-------|
| Peer review rep | +75 on completion (`peer_review_completed`), +60 when your content passes (`content_peer_reviewed`) | `features/peer-review/peer-review-service.ts` |
| Flag accuracy rep | +15 when flag upheld (`flag_accurate`), -10 when dismissed (`flag_inaccurate`), -75 + 7-day ban at 5+ dismissed/30 days (`flag_abuse_penalty`) | `features/moderation/moderation-service.ts` |
| Achievement rep | +33 milestone, +66 advancement, +133 special (`achievement_earned`) | `features/achievements/achievement-service.ts` |
| Streak rep | +33 (7-day), +66 (30-day), +166 (100-day) (`streak_milestone`) | `features/stats/stats-service.ts` |
| Spotlight rep | +250 on win (`spotlight_win`) | `features/spotlight/spotlight-service.ts` |
| Support-giving rep | +3 per support, rolling 30-day cap at 75, emit `node_support_received` for author (diminishing) and event for supporter | `features/tree/tree-service.ts` |
| Tests | Each earning path, flag abuse escalation, daily cap interaction | Co-located |

**Depends on**: Sprint 1 (repHistory), Sprint 4 (daily cap, diminishing returns).

---

### Sprint 7 — Quality Multiplier + Breadth Bonus

**Goal**: Reward quality-validated content and diverse contributions.

| Item | What to build | Where |
|------|--------------|-------|
| Quality multiplier | `getQualityMultiplier(node)` → 1.0x / 1.5x / 2.0x based on review status. Apply to support rep calculation. | `domain/reputation.ts` |
| Update support rep path | Multiply diminishing returns result by quality multiplier | `features/tree/tree-service.ts` |
| Breadth bonus calculation | `calculateBreadthBonus(repEvents, weekStart, weekEnd)` → 0%/5%/10%/15% of base, capped at +75 | `domain/reputation.ts` |
| Weekly breadth bonus job | Scheduled or on-demand calculation, emit `breadth_bonus` event | `features/profile/user-service.ts` |
| Tests | Multiplier at each status, breadth with 1/2/3/4+ types, cap at 75, edge cases (week boundaries, UTC) | Co-located |

**Depends on**: Sprint 5 (content creation rep events to count types), Sprint 6 (peer review status for multiplier).

---

### Sprint 8 — Moderation Penalties + Temp Ban

**Goal**: Make flag resolutions carry rep consequences and auto-ban repeat offenders.

| Item | What to build | Where |
|------|--------------|-------|
| Penalty table | `getModPenalty(reason, offenseCount)` → delta from severity table (section 7.1) | `domain/reputation.ts` |
| Offense tracking | `moderationHistory` subcollection with reason, timestamp. `getOffenseCount(userId, reason, windowMonths)` with 12-month decay. | `features/moderation/moderation-service.ts` |
| Apply penalty on flag action | When flag resolved as "actioned": calculate penalty, emit `moderation_penalty` or `moderation_warning`, deduct rep | `features/moderation/moderation-service.ts` |
| Automatic temp ban | If rep drops below -166: set `bannedUntil` based on ban count (7d / 30d / permanent). Emit ban event. | `domain/reputation.ts` + service |
| Cascading ban consequences | On ban: release pending reviews, withdraw Spotlight noms, cancel co-authorship invitations, trigger vouch liability for vouchers, mark content as "suspended author" | `features/moderation/moderation-service.ts` |
| Firestore rules | Block all writes when `bannedUntil > now` | `firestore.rules` |
| Tests | Each penalty tier, offense escalation, 12-month decay, ban thresholds, cascade effects | Co-located |

**Depends on**: Sprint 1 (repHistory), Sprint 3 (tier thresholds for ban check).

---

### Sprint 9 — Appeals + Flag Abuse Prevention

**Goal**: Let users contest penalties, with safeguards against appeal abuse and flag weaponization.

| Item | What to build | Where |
|------|--------------|-------|
| Appeal submission | `submitAppeal(userId, flagId, explanation)` — max 2,000 chars, 1 active at a time, 14-day window | `features/moderation/moderation-service.ts` |
| Appeal assignment | Auto-assign to different moderator than original actioner | `features/moderation/moderation-service.ts` |
| Appeal resolution | Upheld → reverse penalty, restore rep, mark flag "overturned". Denied → no change, no re-appeal. | `features/moderation/moderation-service.ts` |
| Frivolous appeal fee | Track denied appeals. After 3+ denied in 6 months: -50 filing fee on next appeal (refunded if upheld). Emit `appeal_filing_fee`. | `domain/reputation.ts` |
| Moderator accountability | Track overturned actions per moderator. 3+ in 60 days → warning. 5+ in 90 days → 30-day flag privileges suspended. | `features/moderation/moderation-service.ts` |
| Distributed flag detection | Flag burst (5+ flags on user in 48h) → freeze for admin. Correlated dismissed flags (3+ in 7 days) → penalize all flaggers. | `features/moderation/moderation-service.ts` |
| Tests | Appeal flow (upheld/denied), filing fee trigger, moderator accountability thresholds, flag burst detection | Co-located |

**Depends on**: Sprint 8 (moderation penalties exist to appeal against).

---

### Sprint 10 — Vouch System Overhaul

**Goal**: Replace one-time vouch with tier-scaled, liability-backed trust endorsement system.

| Item | What to build | Where |
|------|--------------|-------|
| Update vouch domain | `canVouch(rep, slotsUsed, slotsPermanentlyLost)`, `getVouchSlots(rep)`, `VouchRecord` type with lineage tracking | `domain/vouch.ts` |
| Vouch cooldown | 30-day minimum between vouches. 30-day age gate (must hold Established for 30 days). | `features/vouch/vouch-service.ts` |
| Vouch liability | On vouchee ban: -1,000 rep, -2 slots permanent, 90-day freeze. Emit `vouch_liability`, `vouch_slots_revoked`, `vouch_freeze`. | `features/vouch/vouch-service.ts` |
| Repeat offense | 2+ vouchees banned in 12 months: -2,000 additional, all slots permanently revoked. | `features/vouch/vouch-service.ts` |
| Cascade limit | Vouch liability triggers only for direct voucher. Vouch liability rep loss alone does not trigger upstream cascades. | `features/vouch/vouch-service.ts` |
| Vouch chain detection | Track vouch lineage depth. Flag chains at depth 4+. Flag if voucher vouches within 14 days of being vouched. | `features/vouch/vouch-service.ts` |
| Content deletion reversal | On content delete: reverse all support rep events for that content, emit `content_deleted_reversal`. Track deletion ratio. | `features/tree/tree-service.ts` |
| Tests | Slot calculation, cooldown enforcement, liability cascade, repeat offense, chain detection, deletion reversal | Co-located |

**Depends on**: Sprint 3 (tier thresholds for vouch gates), Sprint 8 (ban system for liability triggers).

---

### Sprint 11 — Onboarding System

**Goal**: Build the Newcomer → Apprentice flow so new users can reach their first real tier.

| Item | What to build | Where |
|------|--------------|-------|
| Onboarding state | `OnboardingProgress` type tracking which steps are complete | `domain/user.ts` |
| Onboarding actions | `completeTutorial()`, `acknowledgeCoC()`, `completeProfile()`, `followAdvancements()`, `readLibraryEntries()` — each awards rep once | `features/onboarding/onboarding-service.ts` |
| Onboarding rep | +10, +5, +8, +5, +5 = 33 total, each emitting `onboarding_action` event | `features/onboarding/onboarding-service.ts` |
| School email update | Change bonus from +100 to +333, emit `school_email_verified` event | `functions/src/index.ts` |
| Guard: Newcomer is read-only | Firestore rules block all writes for users with rep < 33 (except onboarding actions and profile edits) | `firestore.rules` |
| Onboarding UI | Checklist component showing progress, links to each action | `features/onboarding/` |
| Tests | Each action awards correct rep, no double-claiming, Newcomer blocked from writes, total = exactly 33 | Co-located |

**Depends on**: Sprint 1 (repHistory), Sprint 3 (Newcomer/Apprentice thresholds).

---

### Sprint 12 — Supervised Content Queue

**Goal**: Build the submission → review → publish pipeline for Apprentice/Initiate content.

| Item | What to build | Where |
|------|--------------|-------|
| Supervised content state | `SupervisedSubmission` type: `{ id, authorId, contentType, contentId, status: "pending" \| "approved" \| "rejected" \| "auto_published", reviewerId?, rejectionReason?, submittedAt, reviewedAt? }` | `domain/` (new file or extend existing) |
| Submission service | `submitForReview(userId, contentType, contentId)` — check tier gates (reply/news at Apprentice, node/thread at Initiate), enforce per-user submission cap (10/day), check rejection rate throttle | `features/peer-review/` or new `features/supervised/` |
| Review service | `reviewSubmission(reviewerId, submissionId, decision, reason?)` — Mentor+ only, award +7 to reviewer, award supervised rep to author on approve, emit events | Service layer |
| Auto-publish | Scheduled check: submissions pending >48h → auto-publish with "unreviewed" tag. Circuit breaker: >30 pending + <3 reviewers → extend to 72h. | Cloud Function or scheduled |
| Rejection throttle | >50% rejection in 14 days → 2/day limit. 3 consecutive rejections → 48h pause. | Service layer |
| Queue flooding detection | 5+ correlated new accounts submitting in same 2h window → flag all, pause submissions | Service layer |
| Priority review backlog | Auto-published content enters backlog. Flagged within 7 days → treated as rejection, rep reversed. | Service layer |
| Firestore rules | `supervisedQueue` collection: authors can create (rate-limited), Mentor+ can update status | `firestore.rules` |
| Tests | Submission gating, review flow (approve/reject), auto-publish timing, rejection throttle, circuit breaker, flood detection | Co-located |

**Depends on**: Sprint 3 (tier gates), Sprint 11 (onboarding creates users who need supervision).

---

### Sprint 13 — Anti-Gaming: Rate Limits & Quality Gates

**Goal**: Harden content creation against farming and low-effort spam.

| Item | What to build | Where |
|------|--------------|-------|
| New account throttle | Accounts <7 days old get reduced rate limits (per table in 8.5) | `lib/rate-limit.ts`, `firestore.rules` |
| Content quality gates | Node title ≥10 chars, description ≥50 chars (else support rep disabled), >90% text overlap rejection, 5+ similar titles → flag + restrict to 1/day | `domain/node.ts`, `features/tree/tree-service.ts` |
| Content deletion reversal | On delete: reverse support rep, track deletion ratio, halve rate limits if ratio >30% | `features/tree/tree-service.ts` |
| Discussion spam detection | >80% of replies <15 chars in 30 days → reply rep set to 0 until ratio drops | `features/discussions/discussion-service.ts` |
| Tests | Throttle boundaries (day 6 vs day 8), quality gate edge cases, deletion ratio, spam detection | Co-located |

**Depends on**: Sprint 1 (repHistory for reversal), Sprint 4 (rate limit infrastructure).

---

### Sprint 14 — Anti-Gaming: Detection Systems

**Goal**: Build the scheduled detection Cloud Functions for coordinated abuse.

| Item | What to build | Where |
|------|--------------|-------|
| Vote ring detection | Daily Cloud Function: group supports by author, detect >40% concentration, >5/hour bursts, mutual support pairs >4, cluster detection | `functions/src/index.ts` |
| Support source diversity | Track unique supporters per author. Flag if >50% from ≤3 accounts. | `functions/src/index.ts` |
| Farming pattern detection | Achievement grinding (delete ratio >30%), vouch laundering (similar emails, same IP) | `functions/src/index.ts` |
| Flag weaponization detection | >3 dismissed flags by same flagger against same target → -83 + 14-day ban. Correlated dismissals → penalize group. | `functions/src/index.ts` |
| Vouch chain detection | Track lineage depth. Flag depth 4+. Flag vouching within 14 days of being vouched. | `functions/src/index.ts` |
| Suspicious activity admin UI | Admin alert queue: flagged accounts with reason, options (dismiss/freeze/action) | `features/admin/` |
| Tests | Each detection pattern with test data, false positive thresholds | Co-located |

**Depends on**: Sprint 1 (repHistory to query), Sprint 8 (ban system), Sprint 10 (vouch system).

---

### Sprint 15 — Moderation Escalation + Conflict of Interest

**Goal**: Build tiered decision-making and prevent moderator abuse.

| Item | What to build | Where |
|------|--------------|-------|
| Dual-moderator for large penalties | Penalties >250 rep require 2 independent moderators to agree | `features/moderation/moderation-service.ts` |
| Dual-moderator for proven status | "Proven" requires 2 moderators. Max 3 proven/week per moderator. Audit trail. | `features/moderation/moderation-service.ts` |
| Conflict of interest checks | `hasConflictOfInterest(moderatorId, contentId)` — own content, vouch relationships, supports, co-authorship, peer review participation. Auto-reassign if conflicted. | `features/moderation/moderation-service.ts` |
| Moderator accountability | Track overturned actions. Warning at 3+ in 60 days. Suspension at 5+ in 90 days. Proven revocation at 3+ flagged/reverted in 90 days. | `features/moderation/moderation-service.ts` |
| Tests | Dual-mod flow, conflict detection for each relationship type, accountability thresholds, proven rate limit | Co-located |

**Depends on**: Sprint 8 (moderation penalties), Sprint 9 (appeals for overturned tracking).

---

### Sprint 16 — Inactivity Decay

**Goal**: Ensure inactive high-tier users lose privileges over time.

| Item | What to build | Where |
|------|--------------|-------|
| Activity tracking | `getLastActivityDate(userId)` — query for most recent content creation, peer review, or governance vote | `features/profile/user-service.ts` |
| Decay calculation | `calculateDecay(rep, monthsInactive)` — 0% (0–3mo), 5% above 100 (3–6mo), 15% above 100 (6+mo), floor at 100 | `domain/reputation.ts` |
| Monthly decay Cloud Function | Scheduled monthly: query inactive users, apply decay, emit `inactivity_decay` events | `functions/src/index.ts` |
| Tests | Decay at each time bracket, floor at 100, activity reset, the full Moderator decay example (month 4 → month 18+) | Co-located |

**Depends on**: Sprint 1 (repHistory for events).

---

### Sprint 17 — Breakthrough System

**Goal**: Build the platform's highest honor for exceptional ideas.

| Item | What to build | Where |
|------|--------------|-------|
| Eligibility check | `isBreakthroughEligible(node)` — proven status, ≥20 supports, ≥4.0 review score, ≥3 Scholar+ supporters, ≥21 days old | `domain/reputation.ts` or `domain/node.ts` |
| Nomination | Reviewer+ can nominate. 1 nomination per 30 days. 60-day re-nomination cooldown for failed nodes. | `features/` (new breakthrough feature) |
| Voting | 7-day window, Contributors+ can vote. Tier-weighted: Scholar+ = 1.0, Contributor = 0.5. Threshold: ≥66% weighted approval + ≥10 weighted voters. Early-stage: ≥2 Reviewer+ voters. | `features/` (new breakthrough feature) |
| Rewards | Author +1,666, co-authors +833, reviewer +250, nominator +83, voters +10. All as repHistory events. | Service layer |
| Revocation | 2 Moderators + 1 Admin. Reverse all rewards. Author gets additional -666. Node tagged "Breakthrough Revoked." | Service layer |
| Tests | Eligibility edge cases, voting math (weighted), reward distribution, revocation reversal | Co-located |

**Depends on**: Sprint 3 (tier gates), Sprint 6 (peer review status), Sprint 7 (quality multiplier / proven status).

---

### Sprint 18 — Governance + Elections + Adaptive Thresholds

**Goal**: Build community decision-making infrastructure for the leadership phase.

| Item | What to build | Where |
|------|--------------|-------|
| Governance vote infrastructure | Proposal creation (Moderator/Admin), voting period, approval thresholds per topic type, +7 rep per vote (capped 5/month) | New `features/governance/` |
| Moderator election | Nomination → 14-day campaign → 7-day vote → +7,000 rep bonus if approved | `features/governance/` |
| Adaptive thresholds | Config-driven thresholds that scale based on active contributor count. Community size checks. | `domain/reputation.ts` + config |
| Community welcome threads | Auto-create welcome thread on profile completion. +3 rep for welcome replies (cap +9/day). | `features/discussions/` |
| Tests | Vote counting, threshold math, election flow, adaptive threshold transitions, welcome thread limits | Co-located |

**Depends on**: Sprint 3 (tier gates for voters), Sprint 15 (moderator accountability for elections).

---

### Sprint 19 — Rep Transparency UI

**Goal**: Give users and admins visibility into how rep works.

| Item | What to build | Where |
|------|--------------|-------|
| User rep breakdown | Pie chart of rep by category (creation, validation, social, penalties). Chronological event timeline with descriptions. Monthly trend (earned/lost/net). | `features/profile/` |
| Public profile rep view | Simplified category percentages visible to others | `features/profile/` |
| Admin audit dashboard | Full event log with filtering. Reverse specific events. Rep distribution histogram. Inflation tracking (total rep over time, avg per user, median time to tier). Flagged accounts queue. | `features/admin/` |
| Tests | Category aggregation, public vs private view, admin reversal flow | Co-located |

**Depends on**: Sprint 1 (repHistory data to display).

---

### Sprint Summary

| Sprint | Name | Key Deliverable | Depends On |
|--------|------|----------------|------------|
| 1 | Rep Event Types & History | `RepEvent` type, `repHistory` subcollection | — |
| 2 | Admin Separation | `role` field, remove -1 sentinel | — |
| 3 | Trust Ladder | 11 tiers, all gate functions | 2 |
| 4 | Daily Cap + Diminishing Returns | 500/day cap, support decay curve, rolling 30-day cap | 1 |
| 5 | Earning: Content Creation | Rep for threads, replies, news, library | 1, 4 |
| 6 | Earning: Validation & Recognition | Rep for reviews, flags, achievements, streaks, spotlights, support-giving | 1, 4 |
| 7 | Quality Multiplier + Breadth | 1.0x/1.5x/2.0x supports, weekly breadth bonus | 5, 6 |
| 8 | Moderation Penalties + Temp Ban | Flag → rep loss, auto-ban, cascading consequences | 1, 3 |
| 9 | Appeals + Flag Abuse | Appeal workflow, filing fee, moderator accountability, distributed flag detection | 8 |
| 10 | Vouch System Overhaul | Tier-scaled slots, liability, chain detection, content deletion reversal | 3, 8 |
| 11 | Onboarding System | Newcomer → Apprentice flow, school email update | 1, 3 |
| 12 | Supervised Content Queue | Submit → review → publish pipeline, flooding defenses | 3, 11 |
| 13 | Anti-Gaming: Quality Gates | New account throttle, content quality, deletion reversal, spam detection | 1, 4 |
| 14 | Anti-Gaming: Detection | Vote rings, farming, flag weaponization, vouch chains (Cloud Functions) | 1, 8, 10 |
| 15 | Moderation Escalation | Dual-moderator, conflict of interest, proven status controls | 8, 9 |
| 16 | Inactivity Decay | Monthly Cloud Function, decay curve, activity tracking | 1 |
| 17 | Breakthrough System | Eligibility, voting, rewards, revocation | 3, 6, 7 |
| 18 | Governance + Elections | Community votes, moderator elections, adaptive thresholds, welcome threads | 3, 15 |
| 19 | Rep Transparency UI | User breakdown, public view, admin audit dashboard | 1 |

**Parallelization**: Sprints 1 and 2 can run in parallel. Sprints 5 and 6 can run in parallel. Sprints 13 and 16 can run in parallel. Sprint 19 can start after Sprint 1 and run alongside anything else.

**Critical path**: 1 → 4 → 5/6 → 7 → 8 → 9 → 10 → 12 is the longest dependency chain (9 sprints). Sprints 2, 3, 11 can slot in around it.
