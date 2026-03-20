import { describe, it, expect } from "vitest"
import {
  shouldSendDigest,
  formatDigestHtml,
  type DigestPreferences,
  type DigestEntry,
} from "./email-digest"

function makePrefs(overrides: Partial<DigestPreferences> = {}): DigestPreferences {
  return {
    enabled: true,
    period: "daily",
    lastSentAt: new Date("2026-03-01T08:00:00Z"),
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DigestEntry> = {}): DigestEntry {
  return {
    title: "Test Entry",
    type: "idea",
    advancementId: "fusion",
    createdAt: new Date("2026-03-02T10:00:00Z"),
    url: "/advancements/fusion/nodes/abc",
    ...overrides,
  }
}

describe("shouldSendDigest", () => {
  it("returns true for daily digest when 24 hours have passed", () => {
    const prefs = makePrefs({
      period: "daily",
      lastSentAt: new Date("2026-03-01T08:00:00Z"),
    })
    const now = new Date("2026-03-02T08:00:00Z")

    expect(shouldSendDigest(prefs, now)).toBe(true)
  })

  it("returns true for weekly digest when 7 days have passed", () => {
    const prefs = makePrefs({
      period: "weekly",
      lastSentAt: new Date("2026-03-01T08:00:00Z"),
    })
    const now = new Date("2026-03-08T08:00:00Z")

    expect(shouldSendDigest(prefs, now)).toBe(true)
  })

  it("returns false for daily digest when less than 24 hours have passed", () => {
    const prefs = makePrefs({
      period: "daily",
      lastSentAt: new Date("2026-03-01T08:00:00Z"),
    })
    const now = new Date("2026-03-01T20:00:00Z")

    expect(shouldSendDigest(prefs, now)).toBe(false)
  })

  it("returns false for weekly digest when less than 7 days have passed", () => {
    const prefs = makePrefs({
      period: "weekly",
      lastSentAt: new Date("2026-03-01T08:00:00Z"),
    })
    const now = new Date("2026-03-05T08:00:00Z")

    expect(shouldSendDigest(prefs, now)).toBe(false)
  })

  it("returns false when digest is disabled", () => {
    const prefs = makePrefs({ enabled: false })
    const now = new Date("2026-03-10T08:00:00Z")

    expect(shouldSendDigest(prefs, now)).toBe(false)
  })

  it("returns true when lastSentAt is null (never sent)", () => {
    const prefs = makePrefs({ lastSentAt: null })
    const now = new Date("2026-03-02T08:00:00Z")

    expect(shouldSendDigest(prefs, now)).toBe(true)
  })
})

describe("formatDigestHtml", () => {
  it("generates HTML with entries grouped by advancement", () => {
    const entries = [
      makeEntry({ advancementId: "fusion", title: "Fusion Idea" }),
      makeEntry({ advancementId: "crispr", title: "Gene Edit Paper", type: "library" }),
      makeEntry({ advancementId: "fusion", title: "Another Fusion Idea" }),
    ]

    const html = formatDigestHtml(entries, "Alice")

    expect(html).toContain("<h2>fusion</h2>")
    expect(html).toContain("<h2>crispr</h2>")
    expect(html).toContain("Fusion Idea")
    expect(html).toContain("Another Fusion Idea")
    expect(html).toContain("Gene Edit Paper")
  })

  it("handles empty entries with a friendly message", () => {
    const html = formatDigestHtml([], "Bob")

    expect(html).toContain("No new content since your last digest")
    expect(html).not.toContain("<ul>")
  })

  it("includes the user name in the greeting", () => {
    const html = formatDigestHtml([], "Charlie")

    expect(html).toContain("Hi Charlie")
  })

  it("includes the content type label for each entry", () => {
    const entries = [
      makeEntry({ type: "idea" }),
      makeEntry({ type: "library", advancementId: "bci" }),
      makeEntry({ type: "thread", advancementId: "aagi" }),
      makeEntry({ type: "link", advancementId: "telomerase" }),
    ]

    const html = formatDigestHtml(entries, "Dana")

    expect(html).toContain("(Idea)")
    expect(html).toContain("(Library Entry)")
    expect(html).toContain("(Discussion)")
    expect(html).toContain("(News Link)")
  })

  it("escapes HTML in user name and entry titles", () => {
    const entries = [
      makeEntry({ title: "<script>alert('xss')</script>" }),
    ]

    const html = formatDigestHtml(entries, "User <b>Bold</b>")

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("User &lt;b&gt;Bold&lt;/b&gt;")
  })
})
