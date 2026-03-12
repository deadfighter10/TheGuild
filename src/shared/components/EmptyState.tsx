import type { ReactNode } from "react"

type EmptyStateProps = {
  readonly icon: "tree" | "book" | "newspaper" | "search" | "user" | "chat"
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

function EmptyIcon({ icon }: { readonly icon: EmptyStateProps["icon"] }) {
  const cls = "text-white/10"
  const size = 48

  switch (icon) {
    case "tree":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cls}>
          <circle cx="24" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="16" x2="24" y2="38" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="24" x2="14" y2="30" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="24" x2="34" y2="30" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="30" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="34" cy="30" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="24" cy="38" r="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case "book":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cls}>
          <path d="M8 38V10a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H12a4 4 0 01-4-4z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 14h20M14 20h16M14 26h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 34h32" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case "newspaper":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cls}>
          <rect x="6" y="8" width="30" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M36 16h4a2 2 0 012 2v18a4 4 0 01-4 4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 16h14v8H14z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 28h14M14 32h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "search":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cls}>
          <circle cx="22" cy="22" r="12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="31" y1="31" x2="40" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 19a4 4 0 014-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "user":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cls}>
          <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "chat":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={cls}>
          <path d="M8 10a4 4 0 014-4h24a4 4 0 014 4v20a4 4 0 01-4 4H18l-8 8V10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M16 18h16M16 24h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-16 text-center border border-dashed border-white/10 rounded-xl">
      <div className="flex justify-center mb-4">
        <EmptyIcon icon={icon} />
      </div>
      <p className="text-sm text-white/30 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-white/15 max-w-xs mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
