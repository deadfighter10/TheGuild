import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmptyState } from "./EmptyState"

describe("EmptyState", () => {
  it("renders title text", () => {
    render(<EmptyState icon="search" title="No results found" />)
    expect(screen.getByText("No results found")).toBeTruthy()
  })

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon="tree"
        title="No ideas yet"
        description="Be the first to plant a seed"
      />,
    )
    expect(screen.getByText("Be the first to plant a seed")).toBeTruthy()
  })

  it("does not render description when not provided", () => {
    const { container } = render(
      <EmptyState icon="book" title="Empty library" />,
    )
    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs).toHaveLength(1)
  })

  it("renders action content when provided", () => {
    render(
      <EmptyState
        icon="chat"
        title="No discussions"
        action={<button>Start one</button>}
      />,
    )
    expect(screen.getByText("Start one")).toBeTruthy()
  })

  it("renders SVG icon for each icon type", () => {
    const icons = ["tree", "book", "newspaper", "search", "user", "chat"] as const
    for (const icon of icons) {
      const { container, unmount } = render(
        <EmptyState icon={icon} title={`Test ${icon}`} />,
      )
      const svg = container.querySelector("svg")
      expect(svg).toBeTruthy()
      unmount()
    }
  })
})
