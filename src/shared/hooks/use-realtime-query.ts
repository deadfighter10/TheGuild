import { useState, useEffect } from "react"

type SubscribeFn<T> = (
  onData: (items: readonly T[]) => void,
  onError: (error: Error) => void,
) => () => void

type RealtimeQueryResult<T> = {
  readonly data: readonly T[]
  readonly loading: boolean
  readonly error: string | null
}

export function useRealtimeQuery<T>(subscribe: SubscribeFn<T>): RealtimeQueryResult<T> {
  const [data, setData] = useState<readonly T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribe = subscribe(
      (items) => {
        setData(items)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [subscribe])

  return { data, loading, error }
}
