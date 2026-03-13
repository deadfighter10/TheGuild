function SkeletonBlock({ className }: { readonly className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-white/5 ${className ?? ""}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="flex items-center gap-5 p-5 rounded-xl border border-white/5 bg-void-900">
      <SkeletonBlock className="shrink-0 w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
      <SkeletonBlock className="shrink-0 h-5 w-20 rounded" />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { readonly count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3 }: { readonly lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="p-4 rounded-xl border border-white/5 bg-void-900 space-y-2">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-6 w-12" />
        </div>
      ))}
    </div>
  )
}
