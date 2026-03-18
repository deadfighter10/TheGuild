import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ToastProvider, useToast } from "./Toast"

function ToastTrigger({ message, type }: { readonly message: string; readonly type?: "success" | "error" | "info" }) {
  const { toast } = useToast()
  return (
    <button onClick={() => toast(message, type)}>
      Show Toast
    </button>
  )
}

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <span>Child content</span>
      </ToastProvider>,
    )
    expect(screen.getByText("Child content")).toBeTruthy()
  })

  it("displays toast message when triggered", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Operation successful" type="success" />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText("Show Toast").click()
    })
    expect(screen.getByText("Operation successful")).toBeTruthy()
  })

  it("displays error toast with error styling", () => {
    const { container } = render(
      <ToastProvider>
        <ToastTrigger message="Something failed" type="error" />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText("Show Toast").click()
    })
    expect(screen.getByText("Something failed")).toBeTruthy()
    const errorText = container.querySelector(".text-red-400\\/90")
    expect(errorText).toBeTruthy()
  })

  it("displays multiple toasts", () => {
    function MultiTrigger() {
      const { toast } = useToast()
      return (
        <>
          <button onClick={() => toast("First toast")}>First</button>
          <button onClick={() => toast("Second toast")}>Second</button>
        </>
      )
    }
    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText("First").click()
      screen.getByText("Second").click()
    })
    expect(screen.getByText("First toast")).toBeTruthy()
    expect(screen.getByText("Second toast")).toBeTruthy()
  })

  it("has aria-live region for accessibility", () => {
    const { container } = render(
      <ToastProvider>
        <span>Content</span>
      </ToastProvider>,
    )
    const liveRegion = container.querySelector("[aria-live='polite']")
    expect(liveRegion).toBeTruthy()
  })
})
