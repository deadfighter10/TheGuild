export type BookmarkTargetType = "node" | "libraryEntry" | "newsLink" | "discussionThread"

export type Bookmark = {
  readonly id: string
  readonly userId: string
  readonly targetType: BookmarkTargetType
  readonly targetId: string
  readonly targetTitle: string
  readonly advancementId: string
  readonly createdAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type ValidateBookmarkRequest = {
  readonly userId: string
  readonly targetType: BookmarkTargetType
  readonly targetId: string
}

export function validateBookmark(request: ValidateBookmarkRequest): ValidationResult {
  if (!request.userId) {
    return { valid: false, reason: "User ID is required" }
  }

  if (!request.targetId) {
    return { valid: false, reason: "Target ID is required" }
  }

  return { valid: true }
}

export function bookmarkId(userId: string, targetType: BookmarkTargetType, targetId: string): string {
  return `${userId}_${targetType}_${targetId}`
}
