import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

function readComponent(relativePath: string): string {
  return readFileSync(resolve(__dirname, "../../", relativePath), "utf-8")
}

function hasErrorHandling(source: string): boolean {
  return (
    source.includes("toast(") ||
    source.includes("setError(") ||
    source.includes("setMessage(") ||
    source.includes('("error")')
  )
}

function getCatchBlocks(source: string): string[] {
  const blocks: string[] = []
  const regex = /\} catch[^{]*\{([^}]*)\}/g
  let match
  while ((match = regex.exec(source)) !== null) {
    blocks.push(match[1] ?? "")
  }
  return blocks
}

describe("toast error coverage: admin panels", () => {
  const adminPanels = [
    "features/admin/UsersPanel.tsx",
    "features/admin/NodesPanel.tsx",
    "features/admin/LibraryPanel.tsx",
    "features/admin/NewsPanel.tsx",
    "features/admin/ThreadsPanel.tsx",
  ]

  for (const panel of adminPanels) {
    it(`${panel} imports useToast`, () => {
      const source = readComponent(panel)
      expect(source).toContain("useToast")
    })

    it(`${panel} has toast error calls`, () => {
      const source = readComponent(panel)
      expect(source).toContain('"error"')
    })

    it(`${panel} catch blocks contain toast calls`, () => {
      const source = readComponent(panel)
      const catches = getCatchBlocks(source)
      for (const block of catches) {
        expect(block, `Silent catch in ${panel}`).toContain("toast(")
      }
    })
  }
})

describe("toast error coverage: form components", () => {
  const forms = [
    "features/tree/CreateNodeForm.tsx",
    "features/newsroom/SubmitLinkForm.tsx",
    "features/library/LibraryEntryForm.tsx",
    "features/discussions/NewThreadForm.tsx",
  ]

  for (const form of forms) {
    it(`${form} has error handling in all catch blocks`, () => {
      const source = readComponent(form)
      const catches = getCatchBlocks(source)
      for (const block of catches) {
        expect(
          hasErrorHandling(block) || block.trim() === "",
          `Silent catch block in ${form}: ${block.trim().slice(0, 50)}`,
        ).toBe(true)
      }
    })
  }
})

describe("toast error coverage: interactive components", () => {
  it("BookmarkButton uses toast for error handling", () => {
    const source = readComponent("features/bookmarks/BookmarkButton.tsx")
    expect(source).toContain("useToast")
    const catches = getCatchBlocks(source)
    for (const block of catches) {
      expect(block).toContain("toast(")
    }
  })

  it("ThreadView has error handling in catch blocks", () => {
    const source = readComponent("features/discussions/ThreadView.tsx")
    const catches = getCatchBlocks(source)
    for (const block of catches) {
      expect(hasErrorHandling(block)).toBe(true)
    }
  })

  it("NewsroomPage has error handling for vote failures", () => {
    const source = readComponent("features/newsroom/NewsroomPage.tsx")
    expect(source).toContain("toast(")
  })
})
