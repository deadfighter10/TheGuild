import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AnalyticsPanel } from "./AnalyticsPanel"

const mockGetOverviewMetrics = vi.fn()
const mockGetPageViewStats = vi.fn()
const mockGetUserGrowthStats = vi.fn()
const mockGetContentTrends = vi.fn()
const mockGetModerationStats = vi.fn()

vi.mock("./analytics-service", () => ({
  getOverviewMetrics: (...args: unknown[]) => mockGetOverviewMetrics(...args),
  getPageViewStats: (...args: unknown[]) => mockGetPageViewStats(...args),
  getUserGrowthStats: (...args: unknown[]) => mockGetUserGrowthStats(...args),
  getContentTrends: (...args: unknown[]) => mockGetContentTrends(...args),
  getModerationStats: (...args: unknown[]) => mockGetModerationStats(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetOverviewMetrics.mockResolvedValue([
    { label: "Total Users", value: 150, previousValue: null },
    { label: "Ideas", value: 42, previousValue: null },
    { label: "Library Entries", value: 18, previousValue: null },
    { label: "News Links", value: 67, previousValue: null },
    { label: "Discussions", value: 23, previousValue: null },
  ])
  mockGetPageViewStats.mockResolvedValue([])
  mockGetUserGrowthStats.mockResolvedValue([])
  mockGetContentTrends.mockResolvedValue([])
  mockGetModerationStats.mockResolvedValue({
    pending: 3,
    dismissed: 10,
    actioned: 7,
    avgResolutionMs: 86400000,
  })
})

describe("AnalyticsPanel", () => {
  it("renders the time range selector", async () => {
    render(<AnalyticsPanel />)
    await waitFor(() => {
      expect(screen.getByText("7 days")).toBeTruthy()
      expect(screen.getByText("30 days")).toBeTruthy()
      expect(screen.getByText("90 days")).toBeTruthy()
      expect(screen.getByText("All time")).toBeTruthy()
    })
  })

  it("displays overview metric cards", async () => {
    render(<AnalyticsPanel />)
    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeTruthy()
      expect(screen.getByText("150")).toBeTruthy()
      expect(screen.getByText("Ideas")).toBeTruthy()
      expect(screen.getByText("42")).toBeTruthy()
    })
  })

  it("displays moderation stats", async () => {
    render(<AnalyticsPanel />)
    await waitFor(() => {
      expect(screen.getByText("Moderation")).toBeTruthy()
      expect(screen.getByText("3")).toBeTruthy()
    })
  })

  it("switches time range when button clicked", async () => {
    render(<AnalyticsPanel />)
    await waitFor(() => expect(screen.getByText("150")).toBeTruthy())

    fireEvent.click(screen.getByText("7 days"))

    await waitFor(() => {
      expect(mockGetPageViewStats).toHaveBeenCalledWith("7d")
    })
  })

  it("shows loading state initially", () => {
    mockGetOverviewMetrics.mockReturnValue(new Promise(() => {}))
    render(<AnalyticsPanel />)
    expect(screen.getByText("Loading analytics...")).toBeTruthy()
  })

  it("shows section headers", async () => {
    render(<AnalyticsPanel />)
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeTruthy()
      expect(screen.getByText("Moderation")).toBeTruthy()
    })
  })
})
