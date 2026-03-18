import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSearch } from "./use-search"

type TestItem = { readonly id: string; readonly title: string; readonly body: string }

const ITEMS: readonly TestItem[] = [
  { id: "1", title: "Nuclear Fusion Reactor", body: "Tokamak design principles" },
  { id: "2", title: "CRISPR Gene Editing", body: "Cas9 enzyme mechanism" },
  { id: "3", title: "Brain Machine Interface", body: "Neural signal processing" },
  { id: "4", title: "Telomerase Activation", body: "Cellular aging reversal" },
]

describe("useSearch", () => {
  it("returns all items when query is empty", () => {
    const { result } = renderHook(() =>
      useSearch(ITEMS, { keys: ["title", "body"] }),
    )
    expect(result.current.results).toEqual(ITEMS)
  })

  it("filters items by exact substring match", () => {
    const { result } = renderHook(() =>
      useSearch(ITEMS, { keys: ["title", "body"], initialQuery: "CRISPR" }),
    )
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0]?.id).toBe("2")
  })

  it("supports fuzzy matching", () => {
    const { result } = renderHook(() =>
      useSearch(ITEMS, { keys: ["title"], initialQuery: "fusn" }),
    )
    expect(result.current.results.length).toBeGreaterThan(0)
    expect(result.current.results[0]?.id).toBe("1")
  })

  it("searches across multiple keys", () => {
    const { result } = renderHook(() =>
      useSearch(ITEMS, { keys: ["title", "body"], initialQuery: "tokamak" }),
    )
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0]?.id).toBe("1")
  })

  it("updates results when setQuery is called", () => {
    const { result } = renderHook(() =>
      useSearch(ITEMS, { keys: ["title"] }),
    )
    expect(result.current.results).toHaveLength(4)

    act(() => {
      result.current.setQuery("brain")
    })

    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0]?.id).toBe("3")
  })

  it("returns empty array when nothing matches", () => {
    const { result } = renderHook(() =>
      useSearch(ITEMS, { keys: ["title"], initialQuery: "zzzzzzzzzzz" }),
    )
    expect(result.current.results).toHaveLength(0)
  })

  it("updates results when items change", () => {
    let items = ITEMS
    const { result, rerender } = renderHook(() =>
      useSearch(items, { keys: ["title"], initialQuery: "fusion" }),
    )
    expect(result.current.results).toHaveLength(1)

    items = [...ITEMS, { id: "5", title: "Cold Fusion Theory", body: "Alternative approach" }]
    rerender()
    expect(result.current.results).toHaveLength(2)
  })
})
