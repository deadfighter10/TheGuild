export type PaperSource = "doi" | "arxiv" | "pubmed"

export type ParsedPaperUrl = {
  readonly source: PaperSource
  readonly identifier: string
  readonly url: string
}

export type PaperMetadata = {
  readonly title: string
  readonly authors: readonly string[]
  readonly abstract: string
  readonly year: number | null
  readonly source: PaperSource
  readonly identifier: string
  readonly url: string
}

const DOI_REGEX = /^10\.\d{4,9}\/[^\s]+$/
const ARXIV_ID_REGEX = /^(\d{4}\.\d{4,5})(v\d+)?$/

export function detectPaperSource(input: string): PaperSource | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("10.") && DOI_REGEX.test(trimmed)) return "doi"

  try {
    const parsed = new URL(trimmed)
    if (parsed.hostname === "doi.org" || parsed.hostname === "dx.doi.org") return "doi"
    if (parsed.hostname === "arxiv.org") return "arxiv"
    if (parsed.hostname === "pubmed.ncbi.nlm.nih.gov") return "pubmed"
  } catch {
    // not a URL
  }

  if (/^arxiv:\d{4}\.\d{4,5}/i.test(trimmed)) return "arxiv"

  return null
}

export function parsePaperUrl(input: string): ParsedPaperUrl | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const source = detectPaperSource(trimmed)
  if (!source) return null

  switch (source) {
    case "doi":
      return parseDoi(trimmed)
    case "arxiv":
      return parseArxiv(trimmed)
    case "pubmed":
      return parsePubmed(trimmed)
  }
}

function parseDoi(input: string): ParsedPaperUrl | null {
  let doi: string

  if (input.startsWith("10.")) {
    doi = input
  } else {
    try {
      const parsed = new URL(input)
      doi = parsed.pathname.slice(1)
    } catch {
      return null
    }
  }

  if (!doi || !DOI_REGEX.test(doi)) return null

  return {
    source: "doi",
    identifier: doi,
    url: `https://doi.org/${doi}`,
  }
}

function parseArxiv(input: string): ParsedPaperUrl | null {
  let arxivId: string

  if (/^arxiv:/i.test(input)) {
    arxivId = input.replace(/^arxiv:/i, "")
  } else {
    try {
      const parsed = new URL(input)
      const pathParts = parsed.pathname.split("/")
      arxivId = pathParts[pathParts.length - 1] ?? ""
    } catch {
      return null
    }
  }

  if (!arxivId || !ARXIV_ID_REGEX.test(arxivId)) return null

  return {
    source: "arxiv",
    identifier: arxivId,
    url: `https://arxiv.org/abs/${arxivId}`,
  }
}

function parsePubmed(input: string): ParsedPaperUrl | null {
  try {
    const parsed = new URL(input)
    const pmid = parsed.pathname.replace(/^\//, "").replace(/\/$/, "")
    if (!pmid || !/^\d+$/.test(pmid)) return null

    return {
      source: "pubmed",
      identifier: pmid,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    }
  } catch {
    return null
  }
}
