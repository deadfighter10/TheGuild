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

  it("formats bounty_claimed notification", () => {
    const msg = formatNotificationMessage({
      type: "bounty_claimed",
      actorName: "HunterX",
      targetTitle: "Summarize papers",
    })
    expect(msg).toBe('HunterX claimed your bounty "Summarize papers"')
  })

  it("formats bounty_submitted notification", () => {
    const msg = formatNotificationMessage({
      type: "bounty_submitted",
      actorName: "HunterX",
      targetTitle: "Summarize papers",
    })
    expect(msg).toBe('HunterX submitted work on "Summarize papers"')
  })

  it("formats bounty_accepted notification", () => {
    const msg = formatNotificationMessage({
      type: "bounty_accepted",
      actorName: "Dr. Chen",
      targetTitle: "Summarize papers",
    })
    expect(msg).toBe('Your work on "Summarize papers" was accepted!')
  })

  it("formats bounty_rejected notification", () => {
    const msg = formatNotificationMessage({
      type: "bounty_rejected",
      actorName: "Dr. Chen",
      targetTitle: "Summarize papers",
    })
    expect(msg).toBe('Your submission on "Summarize papers" needs revision')
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

  it("links bounty notifications to bounty page", () => {
    expect(notificationLink({ type: "bounty_claimed", targetId: "bounty-1" }))
      .toBe("/bounties/bounty-1")
    expect(notificationLink({ type: "bounty_submitted", targetId: "bounty-1" }))
      .toBe("/bounties/bounty-1")
    expect(notificationLink({ type: "bounty_accepted", targetId: "bounty-1" }))
      .toBe("/bounties/bounty-1")
    expect(notificationLink({ type: "bounty_rejected", targetId: "bounty-1" }))
      .toBe("/bounties/bounty-1")
  })

  it("bounty notifications fall back to /bounties when no targetId", () => {
    expect(notificationLink({ type: "bounty_claimed" })).toBe("/bounties")
  })
})
