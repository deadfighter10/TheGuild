import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { BountyDetailPage } from "./BountyDetailPage"

const mockGetBounty = vi.fn()
const mockGetSubmissions = vi.fn()
const mockClaimBounty = vi.fn()
const mockPublishBounty = vi.fn()
const mockCancelBounty = vi.fn()
const mockAbandonBounty = vi.fn()
const mockSubmitWork = vi.fn()
const mockReviewSubmission = vi.fn()

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    guildUser: {
      uid: "user-1",
      displayName: "Test User",
      repPoints: 500,
      role: "user",
    },
    firebaseUser: { uid: "user-1" },
    refreshUser: vi.fn(),
  }),
}))

vi.mock("./bounty-service", () => ({
  getBounty: (...args: unknown[]) => mockGetBounty(...args),
  getSubmissionsForBounty: (...args: unknown[]) => mockGetSubmissions(...args),
  claimBounty: (...args: unknown[]) => mockClaimBounty(...args),
  publishBounty: (...args: unknown[]) => mockPublishBounty(...args),
  cancelBounty: (...args: unknown[]) => mockCancelBounty(...args),
  abandonBounty: (...args: unknown[]) => mockAbandonBounty(...args),
  submitWork: (...args: unknown[]) => mockSubmitWork(...args),
  reviewSubmission: (...args: unknown[]) => mockReviewSubmission(...args),
}))

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "bounty-1" }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const fakeTimestamp = new Date("2026-03-20")

function makeBounty(overrides: Record<string, unknown> = {}) {
  return {
    id: "bounty-1",
    posterId: "poster-1",
    posterName: "Dr. Chen",
    title: "Summarize 3 recent papers on telomere extension",
    description: "Read three 2025-2026 papers on telomere extension using TERT activation. Write a 500-word summary.",
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

describe("BountyDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSubmissions.mockResolvedValue([])
  })

  it("shows loading state initially", () => {
    mockGetBounty.mockReturnValue(new Promise(() => {}))
    render(<BountyDetailPage />)
    expect(screen.getByText("Loading...")).toBeTruthy()
  })

  it("shows not found when bounty does not exist", async () => {
    mockGetBounty.mockResolvedValue(null)
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getByText("Bounty not found")).toBeTruthy()
    })
  })

  it("displays bounty details", async () => {
    mockGetBounty.mockResolvedValue(makeBounty())
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getAllByText("Summarize 3 recent papers on telomere extension").length).toBeGreaterThan(0)
    })
    expect(screen.getByText("+50 rep")).toBeTruthy()
    expect(screen.getByText("Dr. Chen")).toBeTruthy()
  })

  it("shows Claim button for open bounty when user is not poster", async () => {
    mockGetBounty.mockResolvedValue(makeBounty({ status: "open", posterId: "other-poster" }))
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getByText("Claim Bounty")).toBeTruthy()
    })
  })

  it("does not show Claim button for own bounty", async () => {
    mockGetBounty.mockResolvedValue(makeBounty({ status: "open", posterId: "user-1" }))
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getAllByText("Summarize 3 recent papers on telomere extension").length).toBeGreaterThan(0)
    })
    expect(screen.queryByText("Claim Bounty")).toBeNull()
  })

  it("shows Publish and Cancel buttons for poster on draft bounty", async () => {
    mockGetBounty.mockResolvedValue(makeBounty({ status: "draft", posterId: "user-1" }))
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getByText("Publish")).toBeTruthy()
      expect(screen.getByText("Cancel Bounty")).toBeTruthy()
    })
  })

  it("shows Abandon button for current hunter on claimed bounty", async () => {
    mockGetBounty.mockResolvedValue(
      makeBounty({ status: "claimed", currentHunterId: "user-1", currentHunterName: "Test User" }),
    )
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getByText("Abandon Bounty")).toBeTruthy()
    })
  })

  it("shows submission form for hunter on claimed bounty", async () => {
    mockGetBounty.mockResolvedValue(
      makeBounty({ status: "claimed", currentHunterId: "user-1" }),
    )
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getAllByText("Submit Work").length).toBeGreaterThan(0)
    })
  })

  it("shows status badge", async () => {
    mockGetBounty.mockResolvedValue(makeBounty({ status: "open" }))
    render(<BountyDetailPage />)
    await waitFor(() => {
      expect(screen.getByText("open")).toBeTruthy()
    })
  })
})
