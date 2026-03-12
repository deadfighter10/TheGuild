import { describe, it, expect } from "vitest"
import {
  validateCreateNode,
  validateSupportNode,
  validateSetNodeStatus,
  buildTree,
  type TreeNode,
  type NodeStatus,
} from "./node"

function makeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    id: "node-1",
    advancementId: "fusion",
    parentNodeId: null,
    authorId: "user-1",
    title: "Magnetic confinement approach",
    description: "Using tokamaks to confine plasma for sustained fusion.",
    status: "theoretical" as NodeStatus,
    supportCount: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  }
}

describe("validateCreateNode", () => {
  it("allows a contributor (100+ Rep) to create a root node", () => {
    const result = validateCreateNode({
      authorRep: 100,
      title: "New idea",
      description: "A fresh approach",
      advancementId: "fusion",
      parentNodeId: null,
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows an admin (-1 Rep) to create a node", () => {
    const result = validateCreateNode({
      authorRep: -1,
      title: "Admin idea",
      description: "Created by admin",
      advancementId: "fusion",
      parentNodeId: null,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects an observer (under 100 Rep)", () => {
    const result = validateCreateNode({
      authorRep: 99,
      title: "New idea",
      description: "A fresh approach",
      advancementId: "fusion",
      parentNodeId: null,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to create an idea",
    })
  })

  it("rejects an empty title", () => {
    const result = validateCreateNode({
      authorRep: 100,
      title: "",
      description: "A fresh approach",
      advancementId: "fusion",
      parentNodeId: null,
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects a title that is only whitespace", () => {
    const result = validateCreateNode({
      authorRep: 100,
      title: "   ",
      description: "A fresh approach",
      advancementId: "fusion",
      parentNodeId: null,
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects an empty description", () => {
    const result = validateCreateNode({
      authorRep: 100,
      title: "New idea",
      description: "",
      advancementId: "fusion",
      parentNodeId: null,
    })
    expect(result).toEqual({
      valid: false,
      reason: "Description is required",
    })
  })

  it("allows creating a subnode with a parent", () => {
    const result = validateCreateNode({
      authorRep: 100,
      title: "Sub-idea",
      description: "Builds on the parent",
      advancementId: "fusion",
      parentNodeId: "node-1",
    })
    expect(result).toEqual({ valid: true })
  })
})

describe("validateSupportNode", () => {
  it("allows a contributor to support a node", () => {
    const node = makeNode({ authorId: "user-2" })
    const result = validateSupportNode({
      userId: "user-1",
      userRep: 100,
      node,
      alreadySupported: false,
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows an admin (-1 Rep) to support a node", () => {
    const node = makeNode({ authorId: "user-2" })
    const result = validateSupportNode({
      userId: "user-1",
      userRep: -1,
      node,
      alreadySupported: false,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects an observer", () => {
    const node = makeNode({ authorId: "user-2" })
    const result = validateSupportNode({
      userId: "user-1",
      userRep: 50,
      node,
      alreadySupported: false,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to support ideas",
    })
  })

  it("rejects supporting your own node", () => {
    const node = makeNode({ authorId: "user-1" })
    const result = validateSupportNode({
      userId: "user-1",
      userRep: 100,
      node,
      alreadySupported: false,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You cannot support your own idea",
    })
  })

  it("rejects duplicate support", () => {
    const node = makeNode({ authorId: "user-2" })
    const result = validateSupportNode({
      userId: "user-1",
      userRep: 100,
      node,
      alreadySupported: true,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You have already supported this idea",
    })
  })

  it("rejects supporting a disproved node", () => {
    const node = makeNode({ authorId: "user-2", status: "disproved" })
    const result = validateSupportNode({
      userId: "user-1",
      userRep: 100,
      node,
      alreadySupported: false,
    })
    expect(result).toEqual({
      valid: false,
      reason: "Cannot support a disproved idea",
    })
  })
})

describe("validateSetNodeStatus", () => {
  it("allows a moderator to set a node to proven", () => {
    const result = validateSetNodeStatus({
      moderatorRep: 3000,
      newStatus: "proven",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to set a node to disproved", () => {
    const result = validateSetNodeStatus({
      moderatorRep: 3000,
      newStatus: "disproved",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to revert a node to theoretical", () => {
    const result = validateSetNodeStatus({
      moderatorRep: 3000,
      newStatus: "theoretical",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows an admin (-1 Rep) to set node status", () => {
    const result = validateSetNodeStatus({
      moderatorRep: -1,
      newStatus: "proven",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects a non-moderator", () => {
    const result = validateSetNodeStatus({
      moderatorRep: 2999,
      newStatus: "proven",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Only moderators (3000+ Rep) can change node status",
    })
  })
})

describe("buildTree", () => {
  it("returns an empty array for no nodes", () => {
    expect(buildTree([])).toEqual([])
  })

  it("returns root nodes at the top level", () => {
    const root = makeNode({ id: "root-1", parentNodeId: null })
    const tree = buildTree([root])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.node.id).toBe("root-1")
    expect(tree[0]?.children).toEqual([])
  })

  it("nests children under their parent", () => {
    const root = makeNode({ id: "root-1", parentNodeId: null })
    const child = makeNode({ id: "child-1", parentNodeId: "root-1" })

    const tree = buildTree([root, child])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.children).toHaveLength(1)
    expect(tree[0]?.children[0]?.node.id).toBe("child-1")
  })

  it("handles multiple levels of nesting", () => {
    const root = makeNode({ id: "root-1", parentNodeId: null })
    const child = makeNode({ id: "child-1", parentNodeId: "root-1" })
    const grandchild = makeNode({ id: "grandchild-1", parentNodeId: "child-1" })

    const tree = buildTree([root, child, grandchild])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.children[0]?.children[0]?.node.id).toBe("grandchild-1")
  })

  it("handles multiple roots", () => {
    const root1 = makeNode({ id: "root-1", parentNodeId: null })
    const root2 = makeNode({ id: "root-2", parentNodeId: null })

    const tree = buildTree([root1, root2])

    expect(tree).toHaveLength(2)
  })

  it("excludes disproved nodes and their subtrees", () => {
    const root = makeNode({ id: "root-1", parentNodeId: null })
    const disprovedChild = makeNode({ id: "bad-1", parentNodeId: "root-1", status: "disproved" })
    const grandchild = makeNode({ id: "orphan-1", parentNodeId: "bad-1" })
    const goodChild = makeNode({ id: "good-1", parentNodeId: "root-1" })

    const tree = buildTree([root, disprovedChild, grandchild, goodChild])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.children).toHaveLength(1)
    expect(tree[0]?.children[0]?.node.id).toBe("good-1")
  })
})
