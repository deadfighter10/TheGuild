import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ShareButton } from "./ShareButton"

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("ShareButton", () => {
  it("renders a share button", () => {
    render(<ShareButton title="Test Idea" />)
    expect(screen.getByRole("button", { name: /share/i })).toBeTruthy()
  })

  it("shows share options when clicked", () => {
    render(<ShareButton title="Test Idea" />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    expect(screen.getByText(/copy link/i)).toBeTruthy()
    expect(screen.getByText(/x/i)).toBeTruthy()
    expect(screen.getByText(/linkedin/i)).toBeTruthy()
  })

  it("copies current URL to clipboard when Copy Link is clicked", async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ShareButton title="Test Idea" />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    fireEvent.click(screen.getByText(/copy link/i))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
  })

  it("hides options when clicking share button again", () => {
    render(<ShareButton title="Test Idea" />)
    const btn = screen.getByRole("button", { name: /share/i })
    fireEvent.click(btn)
    expect(screen.getByText(/copy link/i)).toBeTruthy()
    fireEvent.click(btn)
    expect(screen.queryByText(/copy link/i)).toBeNull()
  })
})
