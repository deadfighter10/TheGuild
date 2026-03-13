export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href
    }
  } catch {
    // invalid URL
  }
  return "#"
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-void-800 text-cyan-400/70 text-xs font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"text-white/70 font-semibold\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
      const safeUrl = sanitizeUrl(url)
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-400/70 hover:text-cyan-400 underline underline-offset-2 transition-colors">${label}</a>`
    })
}

export function renderMarkdown(source: string): string {
  const lines = source.split("\n")
  const result: string[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let inList = false

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        result.push(`<pre class="p-4 rounded-lg bg-void-800 border border-white/5 overflow-x-auto my-4"><code class="text-xs font-mono text-white/60">${escapeHtml(codeLines.join("\n"))}</code></pre>`)
        codeLines = []
        inCodeBlock = false
      } else {
        if (inList) { result.push("</ul>"); inList = false }
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.trim() === "") {
      if (inList) { result.push("</ul>"); inList = false }
      result.push("<br />")
      continue
    }

    if (line.startsWith("### ")) {
      if (inList) { result.push("</ul>"); inList = false }
      result.push(`<h3 class="text-base font-semibold text-white/80 mt-6 mb-2">${renderInline(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith("## ")) {
      if (inList) { result.push("</ul>"); inList = false }
      result.push(`<h2 class="text-lg font-semibold text-white/80 mt-8 mb-3">${renderInline(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith("# ")) {
      if (inList) { result.push("</ul>"); inList = false }
      result.push(`<h1 class="text-xl font-bold text-white/90 mt-8 mb-3">${renderInline(line.slice(2))}</h1>`)
      continue
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { result.push('<ul class="list-disc list-inside space-y-1 my-2">'); inList = true }
      result.push(`<li class="text-white/50 text-sm leading-relaxed">${renderInline(line.slice(2))}</li>`)
      continue
    }

    if (inList) { result.push("</ul>"); inList = false }
    result.push(`<p class="text-white/50 text-sm leading-relaxed mb-2">${renderInline(line)}</p>`)
  }

  if (inList) result.push("</ul>")
  if (inCodeBlock) {
    result.push(`<pre class="p-4 rounded-lg bg-void-800 border border-white/5 overflow-x-auto my-4"><code class="text-xs font-mono text-white/60">${escapeHtml(codeLines.join("\n"))}</code></pre>`)
  }

  return result.join("\n")
}
