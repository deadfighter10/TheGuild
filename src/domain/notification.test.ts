import { describe, it, expect } from "vitest"
import { formatNotificationMessage, notificationLink } from "./notification"

describe("formatNotificationMessage", () => {
  it("formats reply notification", () => {
    const msg = formatNotificationMessage({
      type: "reply",
      actorName: "Alice",
      targetTitle: "My Thread",
    })
    expect(msg).toBe('Alice replied to "My Thread"')
  })

  it("formats support notification", () => {
    const msg = formatNotificationMessage({
      type: "support",
      actorName: "Bob",
      targetTitle: "Fusion Reactor Idea",
    })
    expect(msg).toBe('Bob supported your idea "Fusion Reactor Idea"')
  })

  it("formats vouch notification", () => {
    const msg = formatNotificationMessage({
      type: "vouch",
      actorName: "Charlie",
    })
    expect(msg).toBe("Charlie vouched for you")
  })

  it("formats flag notification", () => {
    const msg = formatNotificationMessage({
      type: "flag",
      actorName: "System",
      targetTitle: "Some Content",
    })
    expect(msg).toBe('Your content "Some Content" was flagged for review')
  })

  it("formats rep_change notification", () => {
    const msg = formatNotificationMessage({
      type: "rep_change",
      actorName: "Admin",
    })
    expect(msg).toBe("Your reputation was updated")
  })

  it("formats status_change notification", () => {
    const msg = formatNotificationMessage({
      type: "status_change",
      actorName: "Moderator",
      targetTitle: "CRISPR Approach",
    })
    expect(msg).toBe('Your idea "CRISPR Approach" status was changed')
  })
})

describe("notificationLink", () => {
  it("links reply to advancement page", () => {
    expect(notificationLink({ type: "reply", advancementId: "fusion" }))
      .toBe("/advancements/fusion")
  })

  it("links support to advancement page", () => {
    expect(notificationLink({ type: "support", advancementId: "crispr" }))
      .toBe("/advancements/crispr")
  })

  it("links vouch to profile", () => {
    expect(notificationLink({ type: "vouch" })).toBe("/profile")
  })

  it("links rep_change to profile", () => {
    expect(notificationLink({ type: "rep_change" })).toBe("/profile")
  })

  it("links flag to advancement page", () => {
    expect(notificationLink({ type: "flag", advancementId: "bmi" }))
      .toBe("/advancements/bmi")
  })

  it("falls back to home when no advancementId", () => {
    expect(notificationLink({ type: "reply" })).toBe("/")
  })
})
