import { describe, it, expect } from "vitest"
import {
  validateCreateLibraryEntry,
  validateEditLibraryEntry,
  isValidYouTubeUrl,
  extractYouTubeId,
  type LibraryEntry,
  type Difficulty,
} from "./library-entry"

function makeEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: "entry-1",
    advancementId: "fusion",
    authorId: "user-1",
    title: "Introduction to Plasma Confinement",
    content: "Plasma confinement is a key challenge in nuclear fusion...",
    contentType: "article",
    difficulty: "introductory" as Difficulty,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }
}

describe("validateCreateLibraryEntry", () => {
  it("allows a user with 1500+ Rep to create an article", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "New entry",
      content: "Some content about fusion",
      contentType: "article",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects a user with less than 1500 Rep", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1499,
      authorRole: "user",
      title: "New entry",
      content: "Some content",
      contentType: "article",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 1500 Rep to contribute to the Grand Library",
    })
  })

  it("rejects an empty title", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "",
      content: "Some content",
      contentType: "article",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects a whitespace-only title", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "   ",
      content: "Some content",
      contentType: "article",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects empty content for articles", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "New entry",
      content: "",
      contentType: "article",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Content is required for articles",
    })
  })

  it("accepts all difficulty levels", () => {
    const difficulties: readonly Difficulty[] = ["introductory", "intermediate", "advanced"]
    for (const difficulty of difficulties) {
      const result = validateCreateLibraryEntry({
        authorRep: 1500,
        authorRole: "user",
        title: "Entry",
        content: "Content",
        contentType: "article",
        advancementId: "fusion",
        difficulty,
      })
      expect(result).toEqual({ valid: true })
    }
  })

  it("requires a URL for YouTube entries", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Great lecture",
      content: "",
      contentType: "youtube",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "YouTube URL is required",
    })
  })

  it("validates YouTube URL format", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Great lecture",
      content: "",
      contentType: "youtube",
      url: "https://example.com/not-youtube",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Please enter a valid YouTube URL",
    })
  })

  it("accepts a valid YouTube URL", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Great lecture",
      content: "",
      contentType: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({ valid: true })
  })

  it("requires a URL for link entries", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Great paper",
      content: "",
      contentType: "link",
      advancementId: "fusion",
      difficulty: "introductory",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Source URL is required",
    })
  })

  it("accepts a valid external link", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Nature paper",
      content: "Interesting findings",
      contentType: "link",
      url: "https://nature.com/articles/s41586-024-00001-1",
      advancementId: "fusion",
      difficulty: "advanced",
    })
    expect(result).toEqual({ valid: true })
  })

  it("accepts document with URL", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Research PDF",
      content: "",
      contentType: "document",
      url: "https://example.com/paper.pdf",
      advancementId: "fusion",
      difficulty: "advanced",
    })
    expect(result).toEqual({ valid: true })
  })

  it("accepts document with content but no URL", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Research notes",
      content: "Key findings from the paper...",
      contentType: "document",
      advancementId: "fusion",
      difficulty: "intermediate",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects document with neither URL nor content", () => {
    const result = validateCreateLibraryEntry({
      authorRep: 1500,
      authorRole: "user",
      title: "Empty doc",
      content: "",
      contentType: "document",
      advancementId: "fusion",
      difficulty: "intermediate",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Either a document URL or content is required",
    })
  })
})

describe("validateEditLibraryEntry", () => {
  it("allows the author to edit their own entry", () => {
    const entry = makeEntry({ authorId: "user-1" })
    const result = validateEditLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user",
      entry,
      title: "Updated title",
      content: "Updated content",
      contentType: "article",
      difficulty: "intermediate",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to edit any entry", () => {
    const entry = makeEntry({ authorId: "user-2" })
    const result = validateEditLibraryEntry({
      userId: "user-1",
      userRep: 3000,
      userRole: "user",
      entry,
      title: "Updated title",
      content: "Updated content",
      contentType: "article",
      difficulty: "intermediate",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects a non-author non-moderator", () => {
    const entry = makeEntry({ authorId: "user-2" })
    const result = validateEditLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user",
      entry,
      title: "Updated title",
      content: "Updated content",
      contentType: "article",
      difficulty: "intermediate",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Only the author or a moderator can edit this entry",
    })
  })

  it("rejects empty title on edit", () => {
    const entry = makeEntry({ authorId: "user-1" })
    const result = validateEditLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user",
      entry,
      title: "",
      content: "Updated content",
      contentType: "article",
      difficulty: "intermediate",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects empty content on edit for articles", () => {
    const entry = makeEntry({ authorId: "user-1" })
    const result = validateEditLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user",
      entry,
      title: "Updated title",
      content: "",
      contentType: "article",
      difficulty: "intermediate",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Content is required for articles",
    })
  })
})

describe("isValidYouTubeUrl", () => {
  it("accepts standard YouTube URLs", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
    expect(isValidYouTubeUrl("https://youtube.com/watch?v=abc123")).toBe(true)
  })

  it("accepts youtu.be short URLs", () => {
    expect(isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true)
  })

  it("rejects non-YouTube URLs", () => {
    expect(isValidYouTubeUrl("https://example.com/video")).toBe(false)
    expect(isValidYouTubeUrl("https://vimeo.com/123456")).toBe(false)
  })

  it("rejects YouTube URLs without video ID", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/")).toBe(false)
    expect(isValidYouTubeUrl("https://www.youtube.com/channel/abc")).toBe(false)
  })

  it("rejects invalid URLs", () => {
    expect(isValidYouTubeUrl("not a url")).toBe(false)
    expect(isValidYouTubeUrl("")).toBe(false)
  })
})

describe("extractYouTubeId", () => {
  it("extracts ID from standard YouTube URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts ID from short YouTube URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("returns null for invalid URLs", () => {
    expect(extractYouTubeId("not a url")).toBe(null)
    expect(extractYouTubeId("https://example.com")).toBe(null)
  })
})
