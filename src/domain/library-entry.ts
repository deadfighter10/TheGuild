import { REP_THRESHOLDS } from "./reputation"
import { isAdmin } from "./user"

export type Difficulty = "introductory" | "intermediate" | "advanced"

export type ContentType = "article" | "youtube" | "link" | "document"

export type EntryVersion = {
  readonly id: string
  readonly entryId: string
  readonly title: string
  readonly content: string
  readonly contentType: ContentType
  readonly difficulty: Difficulty
  readonly editedBy: string
  readonly createdAt: Date
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: "Written Article",
  youtube: "YouTube Video",
  link: "External Source",
  document: "Document",
}

export type LibraryEntry = {
  readonly id: string
  readonly advancementId: string
  readonly authorId: string
  readonly title: string
  readonly content: string
  readonly contentType: ContentType
  readonly url?: string
  readonly difficulty: Difficulty
  readonly createdAt: Date
  readonly updatedAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

const LIBRARY_CONTRIBUTOR_MIN = 1500

type CreateLibraryEntryRequest = {
  readonly authorRep: number
  readonly title: string
  readonly content: string
  readonly contentType: ContentType
  readonly url?: string | undefined
  readonly advancementId: string
  readonly difficulty: Difficulty
}

type EditLibraryEntryRequest = {
  readonly userId: string
  readonly userRep: number
  readonly entry: LibraryEntry
  readonly title: string
  readonly content: string
  readonly contentType: ContentType
  readonly url?: string | undefined
  readonly difficulty: Difficulty
}

function validateContentFields(request: { readonly contentType: ContentType; readonly content: string; readonly url?: string | undefined }): ValidationResult | null {
  if (request.contentType === "youtube") {
    if (!request.url?.trim()) {
      return { valid: false, reason: "YouTube URL is required" }
    }
    if (!isValidYouTubeUrl(request.url)) {
      return { valid: false, reason: "Please enter a valid YouTube URL" }
    }
  }

  if (request.contentType === "link") {
    if (!request.url?.trim()) {
      return { valid: false, reason: "Source URL is required" }
    }
    if (!isValidUrl(request.url)) {
      return { valid: false, reason: "Please enter a valid URL" }
    }
  }

  if (request.contentType === "article" && !request.content.trim()) {
    return { valid: false, reason: "Content is required for articles" }
  }

  if (request.contentType === "document" && !request.url?.trim() && !request.content.trim()) {
    return { valid: false, reason: "Either a document URL or content is required" }
  }

  return null
}

export function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.hostname === "www.youtube.com" || parsed.hostname === "youtube.com") && parsed.searchParams.has("v")
    ) || parsed.hostname === "youtu.be"
  } catch {
    return false
  }
}

export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }
    return parsed.searchParams.get("v")
  } catch {
    return null
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function validateCreateLibraryEntry(request: CreateLibraryEntryRequest): ValidationResult {
  if (!isAdmin(request.authorRep) && request.authorRep < LIBRARY_CONTRIBUTOR_MIN) {
    return { valid: false, reason: "You need at least 1500 Rep to contribute to the Grand Library" }
  }

  if (!request.title.trim()) {
    return { valid: false, reason: "Title is required" }
  }

  const contentValidation = validateContentFields(request)
  if (contentValidation) return contentValidation

  return { valid: true }
}

export function validateEditLibraryEntry(request: EditLibraryEntryRequest): ValidationResult {
  const isAuthor = request.userId === request.entry.authorId
  const isModerator = isAdmin(request.userRep) || request.userRep >= REP_THRESHOLDS.moderatorMin

  if (!isAuthor && !isModerator) {
    return { valid: false, reason: "Only the author or a moderator can edit this entry" }
  }

  if (!request.title.trim()) {
    return { valid: false, reason: "Title is required" }
  }

  const contentValidation = validateContentFields(request)
  if (contentValidation) return contentValidation

  return { valid: true }
}
