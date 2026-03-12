import { REP_THRESHOLDS } from "./reputation"
import { isAdmin } from "./user"

export type NodeStatus = "theoretical" | "proven" | "disproved"

export type TreeNode = {
  readonly id: string
  readonly advancementId: string
  readonly parentNodeId: string | null
  readonly authorId: string
  readonly title: string
  readonly description: string
  readonly status: NodeStatus
  readonly supportCount: number
  readonly createdAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type CreateNodeRequest = {
  readonly authorRep: number
  readonly title: string
  readonly description: string
  readonly advancementId: string
  readonly parentNodeId: string | null
}

type SupportNodeRequest = {
  readonly userId: string
  readonly userRep: number
  readonly node: TreeNode
  readonly alreadySupported: boolean
}

type SetNodeStatusRequest = {
  readonly moderatorRep: number
  readonly newStatus: NodeStatus
}

export function validateCreateNode(request: CreateNodeRequest): ValidationResult {
  if (!isAdmin(request.authorRep) && request.authorRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to create an idea" }
  }

  if (!request.title.trim()) {
    return { valid: false, reason: "Title is required" }
  }

  if (!request.description.trim()) {
    return { valid: false, reason: "Description is required" }
  }

  return { valid: true }
}

export function validateSupportNode(request: SupportNodeRequest): ValidationResult {
  if (!isAdmin(request.userRep) && request.userRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to support ideas" }
  }

  if (request.node.authorId === request.userId) {
    return { valid: false, reason: "You cannot support your own idea" }
  }

  if (request.alreadySupported) {
    return { valid: false, reason: "You have already supported this idea" }
  }

  if (request.node.status === "disproved") {
    return { valid: false, reason: "Cannot support a disproved idea" }
  }

  return { valid: true }
}

export function validateSetNodeStatus(request: SetNodeStatusRequest): ValidationResult {
  if (!isAdmin(request.moderatorRep) && request.moderatorRep < REP_THRESHOLDS.moderatorMin) {
    return { valid: false, reason: "Only moderators (3000+ Rep) can change node status" }
  }

  return { valid: true }
}

type EditNodeRequest = {
  readonly userId: string
  readonly userRep: number
  readonly node: TreeNode
  readonly title: string
  readonly description: string
}

export function validateEditNode(request: EditNodeRequest): ValidationResult {
  if (request.node.authorId !== request.userId && !isAdmin(request.userRep) && request.userRep < REP_THRESHOLDS.moderatorMin) {
    return { valid: false, reason: "Only the author or a moderator can edit this idea" }
  }

  if (!request.title.trim()) {
    return { valid: false, reason: "Title is required" }
  }

  if (!request.description.trim()) {
    return { valid: false, reason: "Description is required" }
  }

  return { valid: true }
}

export type TreeNodeWithChildren = {
  readonly node: TreeNode
  readonly children: readonly TreeNodeWithChildren[]
}

export function buildTree(nodes: readonly TreeNode[]): readonly TreeNodeWithChildren[] {
  const disprovedIds = new Set(
    nodes.filter((n) => n.status === "disproved").map((n) => n.id),
  )

  const collectDisproved = (ids: Set<string>): Set<string> => {
    const childrenOfDisproved = nodes
      .filter((n) => n.parentNodeId !== null && ids.has(n.parentNodeId))
      .map((n) => n.id)

    if (childrenOfDisproved.length === 0) return ids

    const expanded = new Set([...ids, ...childrenOfDisproved])
    return expanded.size === ids.size ? ids : collectDisproved(expanded)
  }

  const excluded = collectDisproved(disprovedIds)

  const visible = nodes.filter((n) => !excluded.has(n.id))

  const childrenByParent = new Map<string | null, TreeNode[]>()
  for (const node of visible) {
    const key = node.parentNodeId
    const existing = childrenByParent.get(key) ?? []
    childrenByParent.set(key, [...existing, node])
  }

  const buildSubtree = (parentId: string | null): readonly TreeNodeWithChildren[] => {
    const children = childrenByParent.get(parentId) ?? []
    return children.map((node) => ({
      node,
      children: buildSubtree(node.id),
    }))
  }

  return buildSubtree(null)
}
