import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useRealtimeQuery } from "./use-realtime-query"

type Item = { readonly id: string; readonly name: string }

function createMockSubscribe() {
  let callback: ((items: readonly Item[]) => void) | null = null
  let errorCallback: ((error: Error) => void) | null = null
  const unsubscribe = vi.fn()

  const subscribe = vi.fn(
    (
      onData: (items: readonly Item[]) => void,
      onError: (error: Error) => void,
    ) => {
      callback = onData
      errorCallback = onError
      return unsubscribe
    },
  )

  return {
    subscribe,
    unsubscribe,
    emit(items: readonly Item[]) {
      callback?.(items)
    },
    emitError(error: Error) {
      errorCallback?.(error)
    },
  }
}

describe("useRealtimeQuery", () => {
  it("starts in loading state with empty data", () => {
    const mock = createMockSubscribe()
    const { result } = renderHook(() => useRealtimeQuery(mock.subscribe))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it("updates data when subscription emits", () => {
    const mock = createMockSubscribe()
    const { result } = renderHook(() => useRealtimeQuery(mock.subscribe))

    act(() => {
      mock.emit([{ id: "1", name: "first" }])
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([{ id: "1", name: "first" }])
    expect(result.current.error).toBeNull()
  })

  it("updates data on subsequent emissions", () => {
    const mock = createMockSubscribe()
    const { result } = renderHook(() => useRealtimeQuery(mock.subscribe))

    act(() => {
      mock.emit([{ id: "1", name: "first" }])
    })

    act(() => {
      mock.emit([
        { id: "1", name: "first" },
        { id: "2", name: "second" },
      ])
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[1]).toEqual({ id: "2", name: "second" })
  })

  it("calls unsubscribe on unmount", () => {
    const mock = createMockSubscribe()
    const { unmount } = renderHook(() => useRealtimeQuery(mock.subscribe))

    unmount()

    expect(mock.unsubscribe).toHaveBeenCalledOnce()
  })

  it("resubscribes when subscribe function changes", () => {
    const mock1 = createMockSubscribe()
    const mock2 = createMockSubscribe()

    const { rerender } = renderHook(
      ({ sub }) => useRealtimeQuery(sub),
      { initialProps: { sub: mock1.subscribe } },
    )

    expect(mock1.subscribe).toHaveBeenCalledOnce()

    rerender({ sub: mock2.subscribe })

    expect(mock1.unsubscribe).toHaveBeenCalledOnce()
    expect(mock2.subscribe).toHaveBeenCalledOnce()
  })

  it("sets error on subscription error", () => {
    const mock = createMockSubscribe()
    const { result } = renderHook(() => useRealtimeQuery(mock.subscribe))

    act(() => {
      mock.emitError(new Error("permission denied"))
    })

    expect(result.current.error).toBe("permission denied")
    expect(result.current.loading).toBe(false)
  })

  it("clears previous data on error", () => {
    const mock = createMockSubscribe()
    const { result } = renderHook(() => useRealtimeQuery(mock.subscribe))

    act(() => {
      mock.emit([{ id: "1", name: "first" }])
    })

    act(() => {
      mock.emitError(new Error("lost connection"))
    })

    expect(result.current.data).toEqual([{ id: "1", name: "first" }])
    expect(result.current.error).toBe("lost connection")
  })
})
