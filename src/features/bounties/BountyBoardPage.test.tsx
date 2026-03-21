import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { BountyBoardPage } from "./BountyBoardPage"

const mockGetBounties = vi.fn()

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
  getBounties: (...args: unknown[]) => mockGetBounties(...args),
}))

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const fakeTimestamp = new Date("2026-03-20")

function makeBountyData(overrides: Record<string, unknown> = {}) {
  return {
    id: "bounty-1",
    posterId: "poster-1",
    posterName: "Dr. Chen",
    title: "Summarize 3 recent papers on telomere extension",
    description: "Read three 2025-2026 papers on telomere extension using TERT activation.",
    advancementId: "telomerase",
    bountyType: "research",
    difficulty: "newcomer",
    rewardAmount: 50,
    status: "open",
    deadline: null,
    claimWindowDays: 3,
    currentHunterId: null,
    currentHunterName: null,
    claimedAt: null,
    claimCount: 0,
    relatedContentIds: [],
    isSystemBounty: false,
    createdAt: fakeTimestamp,
    updatedAt: fakeTimestamp,
    ...overrides,
  }
}

describe("BountyBoardPage", () => {
  beforeEach(() => {
    mockGetBounties.mockReset()
  })

  it("shows loading skeleton while fetching bounties", () => {
    mockGetBounties.mockReturnValue(new Promise(() => {}))
    render(<BountyBoardPage />)
    expect(screen.getByText("The Bounty Board")).toBeTruthy()
    expect(screen.getByTestId("bounty-skeleton")).toBeTruthy()
  })

  it("shows empty state when no bounties", async () => {
    mockGetBounties.mockResolvedValue([])
    render(<BountyBoardPage />)
    await waitFor(() => {
      expect(screen.getByText("No bounties yet")).toBeTruthy()
    })
  })

  it("renders bounty cards with key info", async () => {
    mockGetBounties.mockResolvedValue([makeBountyData()])
    render(<BountyBoardPage />)
    await waitFor(() => {
      expect(screen.getByText("Summarize 3 recent papers on telomere extension")).toBeTruthy()
    })
    expect(screen.getByText("+50 rep")).toBeTruthy()
    expect(screen.getAllByText("newcomer").length).toBeGreaterThan(0)
    expect(screen.getAllByText("research").length).toBeGreaterThan(0)
    expect(screen.getByText("Dr. Chen")).toBeTruthy()
  })

  it("shows Post Bounty button for contributors", async () => {
    mockGetBounties.mockResolvedValue([])
    render(<BountyBoardPage />)
    await waitFor(() => {
      expect(screen.getByText("Post Bounty")).toBeTruthy()
    })
  })

  it("renders multiple bounties", async () => {
    mockGetBounties.mockResolvedValue([
      makeBountyData({ id: "b1", title: "First bounty - summarize papers" }),
      makeBountyData({ id: "b2", title: "Second bounty - review code" }),
    ])
    render(<BountyBoardPage />)
    await waitFor(() => {
      expect(screen.getByText("First bounty - summarize papers")).toBeTruthy()
      expect(screen.getByText("Second bounty - review code")).toBeTruthy()
    })
  })
})
