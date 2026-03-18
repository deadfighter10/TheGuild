import { useState, useMemo } from "react"
import Fuse from "fuse.js"

type UseSearchOptions<T> = {
  readonly keys: ReadonlyArray<keyof T & string>
  readonly initialQuery?: string
  readonly threshold?: number
}

type UseSearchResult<T> = {
  readonly query: string
  readonly setQuery: (q: string) => void
  readonly results: readonly T[]
}

export function useSearch<T>(
  items: readonly T[],
  options: UseSearchOptions<T>,
): UseSearchResult<T> {
  const [query, setQuery] = useState(options.initialQuery ?? "")

  const fuse = useMemo(
    () =>
      new Fuse([...items], {
        keys: [...options.keys],
        threshold: options.threshold ?? 0.4,
        includeScore: true,
      }),
    [items, options.keys, options.threshold],
  )

  const results = useMemo(() => {
    if (!query.trim()) return items
    return fuse.search(query).map((r) => r.item)
  }, [query, fuse, items])

  return { query, setQuery, results }
}
