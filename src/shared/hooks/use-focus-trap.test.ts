import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useEscapeKey } from "./use-focus-trap"

describe("useEscapeKey", () => {
  it("calls onEscape when Escape is pressed and active", () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(onEscape).toHaveBeenCalledOnce()
  })

  it("does not call onEscape when inactive", () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(false, onEscape))

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(onEscape).not.toHaveBeenCalled()
  })

  it("does not call onEscape for other keys", () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    expect(onEscape).not.toHaveBeenCalled()
  })

  it("cleans up listener on unmount", () => {
    const onEscape = vi.fn()
    const { unmount } = renderHook(() => useEscapeKey(true, onEscape))

    unmount()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(onEscape).not.toHaveBeenCalled()
  })
})
