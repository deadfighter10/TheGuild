import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AchievementBadge } from "./AchievementBadge"

describe("AchievementBadge", () => {
  it("renders the achievement name", () => {
    render(<AchievementBadge achievementId="first-node" />)
    expect(screen.getByText("First Node")).toBeTruthy()
  })

  it("renders nothing for unknown achievement id", () => {
    const { container } = render(<AchievementBadge achievementId="nonexistent" />)
    expect(container.innerHTML).toBe("")
  })

  it("shows milestone badge with correct styling", () => {
    render(<AchievementBadge achievementId="supporter-100" />)
    expect(screen.getByText("100 Supports Given")).toBeTruthy()
  })

  it("shows advancement badge", () => {
    render(<AchievementBadge achievementId="adv-fusion" />)
    expect(screen.getByText("Fusion Pioneer")).toBeTruthy()
  })

  it("shows special badge", () => {
    render(<AchievementBadge achievementId="verified-contributor" />)
    expect(screen.getByText("Verified Contributor")).toBeTruthy()
  })

  it("has a tooltip with the description", () => {
    render(<AchievementBadge achievementId="first-node" />)
    const badge = screen.getByTitle("Created your first idea node in The Tree")
    expect(badge).toBeTruthy()
  })
})
