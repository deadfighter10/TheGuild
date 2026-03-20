import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { OfflineBanner } from "./OfflineBanner"

vi.mock("@/shared/hooks/use-network-status", () => ({
  useNetworkStatus: vi.fn(),
}))

import { useNetworkStatus } from "@/shared/hooks/use-network-status"

const mockUseNetworkStatus = vi.mocked(useNetworkStatus)

describe("OfflineBanner", () => {
  it("renders nothing when online", () => {
    mockUseNetworkStatus.mockReturnValue(true)
    const { container } = render(<OfflineBanner />)
    expect(container.textContent).toBe("")
  })

  it("renders offline message when offline", () => {
    mockUseNetworkStatus.mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByText(/offline/i)).toBeDefined()
  })

  it("has a role=alert for accessibility", () => {
    mockUseNetworkStatus.mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByRole("alert")).toBeDefined()
  })
})
