import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useNetworkStatus } from "./use-network-status"

describe("useNetworkStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns true when navigator.onLine is true", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(true)
  })

  it("returns false when navigator.onLine is false", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(false)
  })

  it("updates when offline event fires", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(true)

    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
      window.dispatchEvent(new Event("offline"))
    })
    expect(result.current).toBe(false)
  })

  it("updates when online event fires", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(false)

    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
      window.dispatchEvent(new Event("online"))
    })
    expect(result.current).toBe(true)
  })

  it("cleans up event listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener")
    const { unmount } = renderHook(() => useNetworkStatus())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function))
  })
})
