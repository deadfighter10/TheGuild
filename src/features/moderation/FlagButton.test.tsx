import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FlagButton } from "./FlagButton"

const mockFlagContent = vi.fn()

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    guildUser: {
      uid: "user-1",
      displayName: "Test User",
      repPoints: 500,
    },
  }),
}))

vi.mock("./flag-service", () => ({
  flagContent: (...args: unknown[]) => mockFlagContent(...args),
}))

vi.mock("@/shared/hooks/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
  useEscapeKey: vi.fn(),
}))

describe("FlagButton", () => {
  beforeEach(() => {
    mockFlagContent.mockReset()
  })

  it("renders the flag button with aria-label", () => {
    render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    expect(screen.getByLabelText("Flag content")).toBeTruthy()
  })

  it("opens the modal when clicked", () => {
    render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    fireEvent.click(screen.getByLabelText("Flag content"))
    expect(screen.getByText("Report Content")).toBeTruthy()
    expect(screen.getByText("Test Node")).toBeTruthy()
  })

  it("shows reason select with flag reason options", () => {
    render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    fireEvent.click(screen.getByLabelText("Flag content"))
    const select = screen.getByDisplayValue("Spam")
    expect(select).toBeTruthy()
  })

  it("closes modal when cancel is clicked", () => {
    render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    fireEvent.click(screen.getByLabelText("Flag content"))
    expect(screen.getByText("Report Content")).toBeTruthy()
    fireEvent.click(screen.getByText("Cancel"))
    expect(screen.queryByText("Report Content")).toBeNull()
  })

  it("submits the flag and shows success state", async () => {
    mockFlagContent.mockResolvedValue("flag-id")
    render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    fireEvent.click(screen.getByLabelText("Flag content"))
    fireEvent.click(screen.getByText("Submit Report"))
    await waitFor(() => {
      expect(mockFlagContent).toHaveBeenCalledWith({
        targetCollection: "nodes",
        targetId: "n1",
        targetTitle: "Test Node",
        reporterId: "user-1",
        reporterName: "Test User",
        reason: "spam",
        details: "",
      })
    })
    expect(screen.getByText("Flagged")).toBeTruthy()
  })

  it("shows error when submission fails", async () => {
    mockFlagContent.mockRejectedValue(new Error("Already flagged"))
    render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    fireEvent.click(screen.getByLabelText("Flag content"))
    fireEvent.click(screen.getByText("Submit Report"))
    expect(await screen.findByText("Already flagged")).toBeTruthy()
  })

  it("has dialog role and aria-modal on the modal", () => {
    const { container } = render(
      <FlagButton targetCollection="nodes" targetId="n1" targetTitle="Test Node" />,
    )
    fireEvent.click(screen.getByLabelText("Flag content"))
    const dialog = container.querySelector("[role='dialog']")
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })
})
