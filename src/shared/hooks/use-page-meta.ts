import { useEffect, useRef } from "react"

type PageMetaOptions = {
  readonly title?: string | undefined
}

export function usePageMeta({ title }: PageMetaOptions): void {
  const previousTitle = useRef(document.title)

  useEffect(() => {
    document.title = title ? `${title} — The Guild` : "The Guild"

    return () => {
      document.title = previousTitle.current
    }
  }, [title])
}
