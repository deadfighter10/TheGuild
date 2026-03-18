import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SubmitForReviewButton } from "./SubmitForReviewButton"

const mockSubmitForReview = vi.fn()

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    guildUser: {
      uid: "user-1",
      displayName: "Alice",
      repPoints: 500,
    },
  }),
}))

vi.mock("./peer-review-service", () => ({
  submitForReview: (...args: unknown[]) => mockSubmitForReview(...args),
}))

vi.mock("@/shared/hooks/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
  useEscapeKey: vi.fn(),
}))

describe("SubmitForReviewButton", () => {
  beforeEach(() => {
    mockSubmitForReview.mockReset()
  })

  it("renders the button with aria-label", () => {
    render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="user-1"
      />,
    )
    expect(screen.getByLabelText("Submit for peer review")).toBeTruthy()
  })

  it("does not render when user is not the author", () => {
    render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="other-user"
      />,
    )
    expect(screen.queryByLabelText("Submit for peer review")).toBeNull()
  })

  it("opens confirmation modal when clicked", () => {
    render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="user-1"
      />,
    )
    fireEvent.click(screen.getByLabelText("Submit for peer review"))
    expect(screen.getByText("Submit for Peer Review")).toBeTruthy()
    expect(screen.getByText("Test Idea")).toBeTruthy()
  })

  it("closes modal when cancel is clicked", () => {
    render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="user-1"
      />,
    )
    fireEvent.click(screen.getByLabelText("Submit for peer review"))
    expect(screen.getByText("Submit for Peer Review")).toBeTruthy()
    fireEvent.click(screen.getByText("Cancel"))
    expect(screen.queryByText("Submit for Peer Review")).toBeNull()
  })

  it("submits and shows success state", async () => {
    mockSubmitForReview.mockResolvedValue("review-id")
    render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="user-1"
      />,
    )
    fireEvent.click(screen.getByLabelText("Submit for peer review"))
    fireEvent.click(screen.getByText("Submit for Review"))
    await waitFor(() => {
      expect(mockSubmitForReview).toHaveBeenCalledWith({
        contentType: "node",
        contentId: "node-1",
        contentTitle: "Test Idea",
        advancementId: "adv-1",
        authorId: "user-1",
        authorName: "Alice",
      })
    })
    expect(screen.getByText("Submitted")).toBeTruthy()
  })

  it("shows error when submission fails", async () => {
    mockSubmitForReview.mockRejectedValue(new Error("Already has an active review"))
    render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="user-1"
      />,
    )
    fireEvent.click(screen.getByLabelText("Submit for peer review"))
    fireEvent.click(screen.getByText("Submit for Review"))
    expect(await screen.findByText("Already has an active review")).toBeTruthy()
  })

  it("has dialog role and aria-modal on the modal", () => {
    const { container } = render(
      <SubmitForReviewButton
        contentType="node"
        contentId="node-1"
        contentTitle="Test Idea"
        advancementId="adv-1"
        authorId="user-1"
      />,
    )
    fireEvent.click(screen.getByLabelText("Submit for peer review"))
    const dialog = container.querySelector("[role='dialog']")
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })
})
