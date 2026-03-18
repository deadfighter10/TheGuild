import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AuthForm } from "./AuthForm"

const mockRegister = vi.fn()
const mockLogin = vi.fn()

vi.mock("./AuthContext", () => ({
  useAuth: () => ({
    register: mockRegister,
    login: mockLogin,
    firebaseUser: null,
    guildUser: null,
    loading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
    resendVerificationEmail: vi.fn(),
  }),
}))

describe("AuthForm", () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockLogin.mockReset()
  })

  it("renders login form by default", () => {
    render(<AuthForm />)
    expect(screen.getByText("Welcome back")).toBeTruthy()
    expect(screen.getByLabelText(/email/i)).toBeTruthy()
    expect(screen.getByLabelText(/password/i)).toBeTruthy()
    expect(screen.getByText("Sign In")).toBeTruthy()
  })

  it("does not show display name field in login mode", () => {
    render(<AuthForm />)
    expect(screen.queryByLabelText(/display name/i)).toBeNull()
  })

  it("switches to register mode when sign up is clicked", () => {
    render(<AuthForm />)
    fireEvent.click(screen.getByText("Sign up"))
    expect(screen.getByText("Join The Guild")).toBeTruthy()
    expect(screen.getByLabelText(/display name/i)).toBeTruthy()
    expect(screen.getByText("Create Account")).toBeTruthy()
  })

  it("calls login with email and password on submit", async () => {
    mockLogin.mockResolvedValue(undefined)
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByText("Sign In"))
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123")
    })
  })

  it("calls register with email, password, and display name", async () => {
    mockRegister.mockResolvedValue(undefined)
    render(<AuthForm />)
    fireEvent.click(screen.getByText("Sign up"))
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Test User" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@university.edu" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByText("Create Account"))
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("test@university.edu", "password123", "Test User")
    })
  })

  it("shows error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"))
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } })
    fireEvent.click(screen.getByText("Sign In"))
    expect(await screen.findByText("Invalid credentials")).toBeTruthy()
  })

  it("shows error with role=alert for accessibility", async () => {
    mockLogin.mockRejectedValue(new Error("Bad request"))
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } })
    fireEvent.click(screen.getByText("Sign In"))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Bad request")
  })

  it("shows edu email hint in register mode", () => {
    render(<AuthForm />)
    fireEvent.click(screen.getByText("Sign up"))
    expect(screen.getByText(/\.edu.*\+100 Rep/)).toBeTruthy()
  })

  it("clears error when switching modes", async () => {
    mockLogin.mockRejectedValue(new Error("Login failed"))
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } })
    fireEvent.click(screen.getByText("Sign In"))
    expect(await screen.findByText("Login failed")).toBeTruthy()
    fireEvent.click(screen.getByText("Sign up"))
    expect(screen.queryByText("Login failed")).toBeNull()
  })
})
