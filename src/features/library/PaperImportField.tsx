import { useState } from "react"
import { detectPaperSource } from "@/domain/paper-import"
import { fetchPaperMetadata } from "./paper-import-service"
import type { PaperMetadata } from "@/domain/paper-import"

type PaperImportFieldProps = {
  readonly onImport: (metadata: PaperMetadata) => void
}

const SOURCE_LABELS = {
  doi: "DOI",
  arxiv: "arXiv",
  pubmed: "PubMed",
} as const

export function PaperImportField({ onImport }: PaperImportFieldProps) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const detectedSource = input.trim() ? detectPaperSource(input.trim()) : null

  const handleImport = async () => {
    setError("")
    setLoading(true)
    try {
      const result = await fetchPaperMetadata(input)
      if (result.success) {
        onImport(result.metadata)
        setInput("")
      } else {
        setError(result.reason)
      }
    } catch {
      setError("Failed to fetch paper metadata")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400/60">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className="text-xs font-medium text-white/50">Import from paper</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError("") }}
            placeholder="Paste a DOI, arXiv, or PubMed URL..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-void-950 text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-400/30 transition-colors pr-16"
          />
          {detectedSource && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-400/10 text-violet-400/60 border border-violet-400/15">
              {SOURCE_LABELS[detectedSource]}
            </span>
          )}
        </div>
        <button
          onClick={handleImport}
          disabled={loading || !detectedSource}
          className="px-3 py-2 text-xs font-medium rounded-lg bg-violet-400/10 text-violet-400/70 hover:text-violet-400 hover:bg-violet-400/15 border border-violet-400/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? "Fetching..." : "Import"}
        </button>
      </div>

      {error && <p className="text-[10px] text-red-400/60 mt-2">{error}</p>}

      <p className="text-[10px] text-white/20 mt-2">
        Supports DOI (10.xxxx/...), arXiv (arxiv.org/abs/...), and PubMed URLs
      </p>
    </div>
  )
}
