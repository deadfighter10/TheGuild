import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NotificationBell } from "./NotificationBell"
import type { Notification } from "@/domain/notification"

const mockNavigate = vi.fn()
const mockGetNotifications = vi.fn()
const mockSubscribeToUnreadCount = vi.fn()
const mockMarkAsRead = vi.fn()
const mockMarkAllAsRead = vi.fn()

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    guildUser: {
      uid: "user-1",
      displayName: "Test User",
      repPoints: 500,
    },
  }),
}))

vi.mock("./notification-service", () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  subscribeToUnreadCount: (...args: unknown[]) => mockSubscribeToUnreadCount(...args),
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
}))

const fakeNotifications: readonly Notification[] = [
  {
    id: "n1",
    userId: "user-1",
    type: "reply",
    message: "Someone replied to your thread",
    link: "/advancement/fusion/discussions",
    read: false,
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "n2",
    userId: "user-1",
    type: "support",
    message: "Your idea got supported",
    link: "/advancement/fusion/tree/node-1",
    read: true,
    createdAt: new Date("2025-01-02"),
  },
]

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribeToUnreadCount.mockImplementation((_uid: string, callback: (count: number) => void) => {
      callback(3)
      return () => {}
    })
    mockGetNotifications.mockResolvedValue(fakeNotifications)
    mockMarkAsRead.mockResolvedValue(undefined)
    mockMarkAllAsRead.mockResolvedValue(undefined)
  })

  it("renders the bell button with unread count in aria-label", () => {
    render(<NotificationBell />)
    expect(screen.getByLabelText("Notifications (3 unread)")).toBeTruthy()
  })

  it("shows unread badge when there are unread notifications", () => {
    render(<NotificationBell />)
    expect(screen.getByText("3")).toBeTruthy()
  })

  it("opens dropdown and loads notifications on click", async () => {
    render(<NotificationBell />)
    fireEvent.click(screen.getByLabelText("Notifications (3 unread)"))
    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith("user-1")
    })
    expect(screen.getByText("Someone replied to your thread")).toBeTruthy()
    expect(screen.getByText("Your idea got supported")).toBeTruthy()
  })

  it("shows 'Mark all read' button when there are unread notifications", async () => {
    render(<NotificationBell />)
    fireEvent.click(screen.getByLabelText("Notifications (3 unread)"))
    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeTruthy()
    })
  })

  it("calls markAllAsRead when 'Mark all read' is clicked", async () => {
    render(<NotificationBell />)
    fireEvent.click(screen.getByLabelText("Notifications (3 unread)"))
    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeTruthy()
    })
    fireEvent.click(screen.getByText("Mark all read"))
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1")
  })

  it("navigates and marks as read when clicking an unread notification", async () => {
    render(<NotificationBell />)
    fireEvent.click(screen.getByLabelText("Notifications (3 unread)"))
    await waitFor(() => {
      expect(screen.getByText("Someone replied to your thread")).toBeTruthy()
    })
    fireEvent.click(screen.getByText("Someone replied to your thread"))
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith("n1")
      expect(mockNavigate).toHaveBeenCalledWith("/advancement/fusion/discussions")
    })
  })

  it("has sr-only live region for screen readers", () => {
    const { container } = render(<NotificationBell />)
    const liveRegion = container.querySelector("[aria-live='polite']")
    expect(liveRegion).toBeTruthy()
    expect(liveRegion?.textContent).toContain("3 unread notifications")
  })

  it("shows 'No notifications yet' when list is empty", async () => {
    mockGetNotifications.mockResolvedValue([])
    render(<NotificationBell />)
    fireEvent.click(screen.getByLabelText("Notifications (3 unread)"))
    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeTruthy()
    })
  })
})
