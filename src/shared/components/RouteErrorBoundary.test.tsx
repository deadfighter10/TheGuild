import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { RouteErrorBoundary } from "./RouteErrorBoundary"

vi.spyOn(console, "error").mockImplementation(() => {})

function ThrowingComponent({ message }: { readonly message: string }): never {
  throw new Error(message)
}

function SafeComponent() {
  return <div>Safe content</div>
}

describe("RouteErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <RouteErrorBoundary>
        <SafeComponent />
      </RouteErrorBoundary>,
    )
    expect(screen.getByText("Safe content")).toBeDefined()
  })

  it("shows route-specific fallback when child throws", () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent message="Route crash" />
      </RouteErrorBoundary>,
    )
    expect(screen.getByText("Something went wrong on this page")).toBeDefined()
  })

  it("shows a Go back button in fallback", () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent message="boom" />
      </RouteErrorBoundary>,
    )
    expect(screen.getByRole("button", { name: /go back/i })).toBeDefined()
  })

  it("displays the error message", () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent message="specific error text" />
      </RouteErrorBoundary>,
    )
    expect(screen.getByText("specific error text")).toBeDefined()
  })

  it("does not crash siblings when one route errors", () => {
    render(
      <div>
        <RouteErrorBoundary>
          <ThrowingComponent message="crash" />
        </RouteErrorBoundary>
        <div>Sibling still works</div>
      </div>,
    )
    expect(screen.getByText("Sibling still works")).toBeDefined()
    expect(screen.getByText("Something went wrong on this page")).toBeDefined()
  })

  it("allows custom fallback", () => {
    render(
      <RouteErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent message="crash" />
      </RouteErrorBoundary>,
    )
    expect(screen.getByText("Custom error UI")).toBeDefined()
  })

  it("calls window.history.back when Go back is clicked", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {})
    render(
      <RouteErrorBoundary>
        <ThrowingComponent message="crash" />
      </RouteErrorBoundary>,
    )
    fireEvent.click(screen.getByRole("button", { name: /go back/i }))
    expect(backSpy).toHaveBeenCalled()
    backSpy.mockRestore()
  })
})
