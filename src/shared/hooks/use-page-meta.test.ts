import { describe, it, expect, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { usePageMeta } from "./use-page-meta"

afterEach(() => {
  document.title = ""
})

describe("usePageMeta", () => {
  it("sets document title with suffix", () => {
    renderHook(() => usePageMeta({ title: "Nuclear Fusion" }))
    expect(document.title).toBe("Nuclear Fusion — The Guild")
  })

  it("sets just 'The Guild' when no title provided", () => {
    renderHook(() => usePageMeta({}))
    expect(document.title).toBe("The Guild")
  })

  it("restores original title on unmount", () => {
    document.title = "Original"
    const { unmount } = renderHook(() => usePageMeta({ title: "Test" }))
    expect(document.title).toBe("Test — The Guild")
    unmount()
    expect(document.title).toBe("Original")
  })

  it("updates title when props change", () => {
    const { rerender } = renderHook(
      (props: { title?: string }) => usePageMeta(props),
      { initialProps: { title: "First" } },
    )
    expect(document.title).toBe("First — The Guild")
    rerender({ title: "Second" })
    expect(document.title).toBe("Second — The Guild")
  })
})
