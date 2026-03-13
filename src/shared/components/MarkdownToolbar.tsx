import type { RefObject } from "react"

type MarkdownToolbarProps = {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>
  readonly onUpdate: (value: string) => void
}

type ToolbarAction = {
  readonly label: string
  readonly icon: string
  readonly prefix: string
  readonly suffix: string
  readonly block?: boolean
}

const ACTIONS: readonly ToolbarAction[] = [
  { label: "Bold", icon: "B", prefix: "**", suffix: "**" },
  { label: "Italic", icon: "I", prefix: "*", suffix: "*" },
  { label: "Code", icon: "<>", prefix: "`", suffix: "`" },
  { label: "Link", icon: "🔗", prefix: "[", suffix: "](url)" },
  { label: "Heading", icon: "H", prefix: "## ", suffix: "", block: true },
  { label: "List", icon: "•", prefix: "- ", suffix: "", block: true },
  { label: "Code Block", icon: "{ }", prefix: "```\n", suffix: "\n```", block: true },
]

export function MarkdownToolbar({ textareaRef, onUpdate }: MarkdownToolbarProps) {
  const applyAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const selected = value.slice(start, end)

    let newValue: string
    let cursorPos: number

    if (action.block && !selected) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1
      newValue = value.slice(0, lineStart) + action.prefix + value.slice(lineStart)
      cursorPos = start + action.prefix.length
    } else if (selected) {
      newValue = value.slice(0, start) + action.prefix + selected + action.suffix + value.slice(end)
      cursorPos = start + action.prefix.length + selected.length + action.suffix.length
    } else {
      newValue = value.slice(0, start) + action.prefix + action.suffix + value.slice(end)
      cursorPos = start + action.prefix.length
    }

    onUpdate(newValue)

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

  return (
    <div className="flex items-center gap-0.5 px-1 py-1 rounded-t-lg border border-b-0 border-white/10 bg-void-800/50">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => applyAction(action)}
          title={action.label}
          className="px-2 py-1 text-[10px] font-mono text-white/30 hover:text-white/70 hover:bg-white/5 rounded transition-colors"
        >
          {action.icon}
        </button>
      ))}
    </div>
  )
}
