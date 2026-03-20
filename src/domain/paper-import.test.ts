import { describe, it, expect } from "vitest"
import { parsePaperUrl, detectPaperSource } from "./paper-import"

describe("detectPaperSource", () => {
  it("detects a DOI URL", () => {
    expect(detectPaperSource("https://doi.org/10.1038/s41586-023-06934-4")).toBe("doi")
  })

  it("detects a bare DOI", () => {
    expect(detectPaperSource("10.1038/s41586-023-06934-4")).toBe("doi")
  })

  it("detects an arXiv abstract URL", () => {
    expect(detectPaperSource("https://arxiv.org/abs/2301.07041")).toBe("arxiv")
  })

  it("detects an arXiv PDF URL", () => {
    expect(detectPaperSource("https://arxiv.org/pdf/2301.07041")).toBe("arxiv")
  })

  it("detects an old-style arXiv ID", () => {
    expect(detectPaperSource("arXiv:2301.07041")).toBe("arxiv")
  })

  it("detects a PubMed URL", () => {
    expect(detectPaperSource("https://pubmed.ncbi.nlm.nih.gov/12345678/")).toBe("pubmed")
  })

  it("returns null for a regular URL", () => {
    expect(detectPaperSource("https://example.com/paper.pdf")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(detectPaperSource("")).toBeNull()
  })

  it("returns null for garbage input", () => {
    expect(detectPaperSource("not a url at all")).toBeNull()
  })
})

describe("parsePaperUrl", () => {
  it("extracts DOI from a doi.org URL", () => {
    const result = parsePaperUrl("https://doi.org/10.1038/s41586-023-06934-4")
    expect(result).toEqual({
      source: "doi",
      identifier: "10.1038/s41586-023-06934-4",
      url: "https://doi.org/10.1038/s41586-023-06934-4",
    })
  })

  it("extracts DOI from a dx.doi.org URL", () => {
    const result = parsePaperUrl("https://dx.doi.org/10.1126/science.abc1234")
    expect(result).toEqual({
      source: "doi",
      identifier: "10.1126/science.abc1234",
      url: "https://doi.org/10.1126/science.abc1234",
    })
  })

  it("extracts DOI from a bare DOI string", () => {
    const result = parsePaperUrl("10.1038/s41586-023-06934-4")
    expect(result).toEqual({
      source: "doi",
      identifier: "10.1038/s41586-023-06934-4",
      url: "https://doi.org/10.1038/s41586-023-06934-4",
    })
  })

  it("extracts arXiv ID from an abstract URL", () => {
    const result = parsePaperUrl("https://arxiv.org/abs/2301.07041")
    expect(result).toEqual({
      source: "arxiv",
      identifier: "2301.07041",
      url: "https://arxiv.org/abs/2301.07041",
    })
  })

  it("extracts arXiv ID from a PDF URL", () => {
    const result = parsePaperUrl("https://arxiv.org/pdf/2301.07041")
    expect(result).toEqual({
      source: "arxiv",
      identifier: "2301.07041",
      url: "https://arxiv.org/abs/2301.07041",
    })
  })

  it("extracts arXiv ID from an arXiv: prefix", () => {
    const result = parsePaperUrl("arXiv:2301.07041")
    expect(result).toEqual({
      source: "arxiv",
      identifier: "2301.07041",
      url: "https://arxiv.org/abs/2301.07041",
    })
  })

  it("extracts arXiv ID with version suffix", () => {
    const result = parsePaperUrl("https://arxiv.org/abs/2301.07041v2")
    expect(result).toEqual({
      source: "arxiv",
      identifier: "2301.07041v2",
      url: "https://arxiv.org/abs/2301.07041v2",
    })
  })

  it("extracts PubMed ID from a URL", () => {
    const result = parsePaperUrl("https://pubmed.ncbi.nlm.nih.gov/12345678/")
    expect(result).toEqual({
      source: "pubmed",
      identifier: "12345678",
      url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    })
  })

  it("extracts PubMed ID without trailing slash", () => {
    const result = parsePaperUrl("https://pubmed.ncbi.nlm.nih.gov/12345678")
    expect(result).toEqual({
      source: "pubmed",
      identifier: "12345678",
      url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    })
  })

  it("returns null for a non-paper URL", () => {
    expect(parsePaperUrl("https://example.com/paper.pdf")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parsePaperUrl("")).toBeNull()
  })

  it("trims whitespace before parsing", () => {
    const result = parsePaperUrl("  https://doi.org/10.1038/s41586-023-06934-4  ")
    expect(result).toEqual({
      source: "doi",
      identifier: "10.1038/s41586-023-06934-4",
      url: "https://doi.org/10.1038/s41586-023-06934-4",
    })
  })
})
