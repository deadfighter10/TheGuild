import { describe, it, expect } from "vitest"
import {
  validateAddCollaborator,
  validateRemoveCollaborator,
  collaboratorDocId,
} from "./collaborator"

describe("validateAddCollaborator", () => {
  it("returns valid when author adds a different user", () => {
    const result = validateAddCollaborator({
      requesterId: "author-1",
      authorId: "author-1",
      collaboratorId: "user-2",
      existingCollaboratorIds: [],
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when requester is not the author", () => {
    const result = validateAddCollaborator({
      requesterId: "user-2",
      authorId: "author-1",
      collaboratorId: "user-3",
      existingCollaboratorIds: [],
    })
    expect(result).toEqual({ valid: false, reason: "Only the author can manage collaborators" })
  })

  it("rejects adding the author as collaborator", () => {
    const result = validateAddCollaborator({
      requesterId: "author-1",
      authorId: "author-1",
      collaboratorId: "author-1",
      existingCollaboratorIds: [],
    })
    expect(result).toEqual({ valid: false, reason: "The author is already a contributor" })
  })

  it("rejects adding an existing collaborator", () => {
    const result = validateAddCollaborator({
      requesterId: "author-1",
      authorId: "author-1",
      collaboratorId: "user-2",
      existingCollaboratorIds: ["user-2"],
    })
    expect(result).toEqual({ valid: false, reason: "This user is already a collaborator" })
  })
})

describe("validateRemoveCollaborator", () => {
  it("returns valid when author removes a collaborator", () => {
    const result = validateRemoveCollaborator({
      requesterId: "author-1",
      authorId: "author-1",
      collaboratorId: "user-2",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when requester is not the author", () => {
    const result = validateRemoveCollaborator({
      requesterId: "user-2",
      authorId: "author-1",
      collaboratorId: "user-3",
    })
    expect(result).toEqual({ valid: false, reason: "Only the author can manage collaborators" })
  })
})

describe("collaboratorDocId", () => {
  it("generates consistent document id", () => {
    expect(collaboratorDocId("node-1", "user-2")).toBe("node-1_user-2")
  })

  it("generates unique ids for different combinations", () => {
    const id1 = collaboratorDocId("node-1", "user-2")
    const id2 = collaboratorDocId("node-1", "user-3")
    expect(id1).not.toBe(id2)
  })
})
