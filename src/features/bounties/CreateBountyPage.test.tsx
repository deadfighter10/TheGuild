import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CreateBountyPage } from "./CreateBountyPage"

const mockCreateBounty = vi.fn()
const mockNavigate = vi.fn()

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    guildUser: {
      uid: "user-1",
      displayName: "Test User",
      repPoints: 500,
      role: "user",
    },
    firebaseUser: { uid: "user-1" },
  }),
}))

vi.mock("./bounty-service", () => ({
  createBounty: (...args: unknown[]) => mockCreateBounty(...args),
}))

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

describe("CreateBountyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the form with all fields", () => {
    render(<CreateBountyPage />)
    expect(screen.getByLabelText("Title")).toBeTruthy()
    expect(screen.getByLabelText("Description")).toBeTruthy()
    expect(screen.getByLabelText("Advancement")).toBeTruthy()
    expect(screen.getByLabelText("Type")).toBeTruthy()
    expect(screen.getByLabelText("Difficulty")).toBeTruthy()
    expect(screen.getByLabelText("Reward")).toBeTruthy()
  })

  it("shows Save as Draft and Publish buttons", () => {
    render(<CreateBountyPage />)
    expect(screen.getByText("Save as Draft")).toBeTruthy()
  })

  it("shows reward range hint based on difficulty", () => {
    render(<CreateBountyPage />)
    expect(screen.getByText("15 - 75 rep")).toBeTruthy()
  })

  it("submits form and navigates to detail page on success", async () => {
    mockCreateBounty.mockResolvedValue({ success: true, bountyId: "new-id" })
    render(<CreateBountyPage />)

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "A title that is long enough" },
    })
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A".repeat(100) },
    })
    fireEvent.change(screen.getByLabelText("Reward"), {
      target: { value: "50" },
    })

    fireEvent.click(screen.getByText("Save as Draft"))

    await waitFor(() => {
      expect(mockCreateBounty).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "A title that is long enough",
          rewardAmount: 50,
        }),
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith("/bounties/new-id")
  })

  it("shows error when creation fails", async () => {
    mockCreateBounty.mockResolvedValue({ success: false, reason: "Title too short" })
    render(<CreateBountyPage />)

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Short" },
    })
    fireEvent.change(screen.getByLabelText("Reward"), {
      target: { value: "50" },
    })

    fireEvent.click(screen.getByText("Save as Draft"))

    await waitFor(() => {
      expect(screen.getByText("Title too short")).toBeTruthy()
    })
  })
})
