import { parsePaperUrl, type PaperMetadata } from "@/domain/paper-import"

type FetchResult =
  | { readonly success: true; readonly metadata: PaperMetadata }
  | { readonly success: false; readonly reason: string }

export async function fetchPaperMetadata(input: string): Promise<FetchResult> {
  const parsed = parsePaperUrl(input)
  if (!parsed) {
    return { success: false, reason: "Could not detect a DOI, arXiv, or PubMed URL" }
  }

  switch (parsed.source) {
    case "doi":
      return fetchDoiMetadata(parsed.identifier, parsed.url)
    case "arxiv":
      return fetchArxivMetadata(parsed.identifier, parsed.url)
    case "pubmed":
      return fetchPubmedMetadata(parsed.identifier, parsed.url)
  }
}

async function fetchDoiMetadata(doi: string, url: string): Promise<FetchResult> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { Accept: "application/json" },
    })
    if (!response.ok) {
      return { success: false, reason: "Paper not found via DOI. Check the DOI and try again." }
    }

    const data = await response.json()
    const work = data.message

    const title = Array.isArray(work.title) ? work.title[0] ?? "" : String(work.title ?? "")
    const authors = Array.isArray(work.author)
      ? work.author.map((a: { given?: string; family?: string }) =>
          [a.given, a.family].filter(Boolean).join(" "),
        )
      : []
    const abstract = typeof work.abstract === "string"
      ? work.abstract.replace(/<[^>]*>/g, "").trim()
      : ""
    const year = work.published?.["date-parts"]?.[0]?.[0] ?? null

    return {
      success: true,
      metadata: { title, authors, abstract, year, source: "doi", identifier: doi, url },
    }
  } catch {
    return { success: false, reason: "Failed to fetch paper metadata. Please try again." }
  }
}

async function fetchArxivMetadata(arxivId: string, url: string): Promise<FetchResult> {
  try {
    const response = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}&max_results=1`,
    )
    if (!response.ok) {
      return { success: false, reason: "Paper not found on arXiv. Check the ID and try again." }
    }

    const xml = await response.text()

    const title = extractXmlTag(xml, "title", 1)?.replace(/\s+/g, " ").trim() ?? ""
    const abstract = extractXmlTag(xml, "summary")?.trim() ?? ""
    const authors = extractAllXmlTags(xml, "name")
    const published = extractXmlTag(xml, "published")
    const year = published ? new Date(published).getFullYear() : null

    if (!title) {
      return { success: false, reason: "Paper not found on arXiv. Check the ID and try again." }
    }

    return {
      success: true,
      metadata: { title, authors, abstract, year: year && !isNaN(year) ? year : null, source: "arxiv", identifier: arxivId, url },
    }
  } catch {
    return { success: false, reason: "Failed to fetch paper metadata. Please try again." }
  }
}

async function fetchPubmedMetadata(pmid: string, url: string): Promise<FetchResult> {
  try {
    const response = await fetch(
      `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=${encodeURIComponent(pmid)}`,
    )
    if (!response.ok) {
      return { success: false, reason: "Paper not found on PubMed. Check the ID and try again." }
    }

    const data = await response.json()
    const title = typeof data.title === "string" ? data.title : ""
    const authors = Array.isArray(data.author)
      ? data.author.map((a: { given?: string; family?: string }) =>
          [a.given, a.family].filter(Boolean).join(" "),
        )
      : []
    const abstract = typeof data.abstract === "string" ? data.abstract : ""
    const year = data.issued?.["date-parts"]?.[0]?.[0] ?? null

    return {
      success: true,
      metadata: { title, authors, abstract, year, source: "pubmed", identifier: pmid, url },
    }
  } catch {
    return { success: false, reason: "Failed to fetch paper metadata. Please try again." }
  }
}

function extractXmlTag(xml: string, tag: string, skip = 0): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g")
  let match: RegExpExecArray | null
  let count = 0
  while ((match = regex.exec(xml)) !== null) {
    if (count === skip) return match[1] ?? null
    count++
  }
  return null
}

function extractAllXmlTags(xml: string, tag: string): readonly string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g")
  const results: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    const value = match[1]?.trim()
    if (value) results.push(value)
  }
  return results
}
