import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { RepGate } from "./RepGate"

describe("RepGate", () => {
  it("renders children when user has enough Rep", () => {
    render(
      <RepGate currentRep={100} requiredRep={100} role="user">
        <p>Secret content</p>
      </RepGate>,
    )
    expect(screen.getByText("Secret content")).toBeTruthy()
  })

  it("renders fallback when user does not have enough Rep", () => {
    render(
      <RepGate currentRep={50} requiredRep={100} role="user">
        <p>Secret content</p>
      </RepGate>,
    )
    expect(screen.queryByText("Secret content")).toBeNull()
    expect(screen.getByText(/need at least 100 Rep/)).toBeTruthy()
  })

  it("renders custom fallback when provided", () => {
    render(
      <RepGate
        currentRep={50}
        requiredRep={100}
        role="user"
        fallback={<p>Custom message</p>}
      >
        <p>Secret content</p>
      </RepGate>,
    )
    expect(screen.queryByText("Secret content")).toBeNull()
    expect(screen.getByText("Custom message")).toBeTruthy()
  })

  it("renders nothing when hideWhenLocked is true and Rep is insufficient", () => {
    const { container } = render(
      <RepGate currentRep={50} requiredRep={100} role="user" hideWhenLocked>
        <p>Secret content</p>
      </RepGate>,
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders children when user is admin regardless of required rep", () => {
    render(
      <RepGate currentRep={0} requiredRep={3000} role="admin">
        <p>Admin access</p>
      </RepGate>,
    )
    expect(screen.getByText("Admin access")).toBeTruthy()
  })

  it("renders children even with hideWhenLocked when rep is sufficient", () => {
    render(
      <RepGate currentRep={200} requiredRep={100} role="user" hideWhenLocked>
        <p>Visible content</p>
      </RepGate>,
    )
    expect(screen.getByText("Visible content")).toBeTruthy()
  })
})
