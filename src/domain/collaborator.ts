export type Collaborator = {
  readonly id: string
  readonly contentId: string
  readonly contentType: "node" | "libraryEntry"
  readonly userId: string
  readonly displayName: string
  readonly addedBy: string
  readonly addedAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type AddCollaboratorRequest = {
  readonly requesterId: string
  readonly authorId: string
  readonly collaboratorId: string
  readonly existingCollaboratorIds: readonly string[]
}

type RemoveCollaboratorRequest = {
  readonly requesterId: string
  readonly authorId: string
  readonly collaboratorId: string
}

export function validateAddCollaborator(request: AddCollaboratorRequest): ValidationResult {
  if (request.requesterId !== request.authorId) {
    return { valid: false, reason: "Only the author can manage collaborators" }
  }

  if (request.collaboratorId === request.authorId) {
    return { valid: false, reason: "The author is already a contributor" }
  }

  if (request.existingCollaboratorIds.includes(request.collaboratorId)) {
    return { valid: false, reason: "This user is already a collaborator" }
  }

  return { valid: true }
}

export function validateRemoveCollaborator(request: RemoveCollaboratorRequest): ValidationResult {
  if (request.requesterId !== request.authorId) {
    return { valid: false, reason: "Only the author can manage collaborators" }
  }

  return { valid: true }
}

export function collaboratorDocId(contentId: string, userId: string): string {
  return `${contentId}_${userId}`
}
