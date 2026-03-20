import { useState } from "react"

export function ConfirmButton({ label, onConfirm, variant = "danger" }: {
  readonly label: string
  readonly onConfirm: () => void
  readonly variant?: "danger" | "warning"
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={() => { onConfirm(); setConfirming(false) }}
          className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-0.5 text-[10px] font-mono rounded text-white/30 hover:text-white/60 transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
        variant === "danger"
          ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
          : "text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10"
      }`}
    >
      {label}
    </button>
  )
}
