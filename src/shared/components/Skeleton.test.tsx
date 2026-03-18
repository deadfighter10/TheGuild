import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { SkeletonCard, SkeletonList, SkeletonText, SkeletonStats } from "./Skeleton"

describe("SkeletonCard", () => {
  it("renders a card with animated pulse blocks", () => {
    const { container } = render(<SkeletonCard />)
    const pulseBlocks = container.querySelectorAll(".animate-pulse")
    expect(pulseBlocks.length).toBeGreaterThanOrEqual(3)
  })
})

describe("SkeletonList", () => {
  it("renders default 5 skeleton cards", () => {
    const { container } = render(<SkeletonList />)
    const cards = container.querySelectorAll(".animate-pulse")
    expect(cards.length).toBeGreaterThanOrEqual(5)
  })

  it("renders specified number of skeleton cards", () => {
    const { container } = render(<SkeletonList count={3} />)
    const topLevelCards = container.firstElementChild?.children
    expect(topLevelCards?.length).toBe(3)
  })
})

describe("SkeletonText", () => {
  it("renders default 3 text lines", () => {
    const { container } = render(<SkeletonText />)
    const lines = container.querySelectorAll(".animate-pulse")
    expect(lines.length).toBe(3)
  })

  it("renders specified number of text lines", () => {
    const { container } = render(<SkeletonText lines={5} />)
    const lines = container.querySelectorAll(".animate-pulse")
    expect(lines.length).toBe(5)
  })
})

describe("SkeletonStats", () => {
  it("renders 4 stat blocks in a grid", () => {
    const { container } = render(<SkeletonStats />)
    const grid = container.firstElementChild
    expect(grid?.children.length).toBe(4)
  })
})
