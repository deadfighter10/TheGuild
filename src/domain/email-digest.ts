export type DigestPeriod = "daily" | "weekly"

export type DigestEntry = {
  readonly title: string
  readonly type: "idea" | "library" | "thread" | "link"
  readonly advancementId: string
  readonly createdAt: Date
  readonly url: string
}

export type DigestPreferences = {
  readonly enabled: boolean
  readonly period: DigestPeriod
  readonly lastSentAt: Date | null
}

const DAILY_MS = 24 * 60 * 60 * 1000
const WEEKLY_MS = 7 * DAILY_MS

function getIntervalMs(period: DigestPeriod): number {
  return period === "daily" ? DAILY_MS : WEEKLY_MS
}

export function shouldSendDigest(prefs: DigestPreferences, now: Date): boolean {
  if (!prefs.enabled) return false
  if (prefs.lastSentAt === null) return true

  const elapsed = now.getTime() - prefs.lastSentAt.getTime()
  return elapsed >= getIntervalMs(prefs.period)
}

function groupEntriesByAdvancement(entries: readonly DigestEntry[]): ReadonlyMap<string, readonly DigestEntry[]> {
  const groups = new Map<string, DigestEntry[]>()
  for (const entry of entries) {
    const existing = groups.get(entry.advancementId)
    if (existing) {
      existing.push(entry)
    } else {
      groups.set(entry.advancementId, [entry])
    }
  }
  return groups
}

const TYPE_LABELS: Record<DigestEntry["type"], string> = {
  idea: "Idea",
  library: "Library Entry",
  thread: "Discussion",
  link: "News Link",
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function formatDigestHtml(entries: readonly DigestEntry[], userName: string): string {
  const escapedName = escapeHtml(userName)

  if (entries.length === 0) {
    return [
      "<html><body>",
      `<h1>Hi ${escapedName}, here's your Guild digest</h1>`,
      "<p>No new content since your last digest. Check back soon!</p>",
      "</body></html>",
    ].join("")
  }

  const grouped = groupEntriesByAdvancement(entries)
  const sections: string[] = []

  for (const [advancementId, groupEntries] of grouped) {
    const items = groupEntries
      .map(
        (entry) =>
          `<li><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.title)}</a> <span>(${TYPE_LABELS[entry.type]})</span></li>`
      )
      .join("")

    sections.push(
      `<h2>${escapeHtml(advancementId)}</h2><ul>${items}</ul>`
    )
  }

  return [
    "<html><body>",
    `<h1>Hi ${escapedName}, here's your Guild digest</h1>`,
    ...sections,
    "</body></html>",
  ].join("")
}
