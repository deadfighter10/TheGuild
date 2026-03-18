import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Markdown } from "./Markdown"

describe("Markdown", () => {
  it("renders plain text content", () => {
    const { container } = render(<Markdown content="Hello world" />)
    expect(container.textContent).toContain("Hello world")
  })

  it("renders bold text as strong element", () => {
    const { container } = render(<Markdown content="**bold text**" />)
    const strong = container.querySelector("strong")
    expect(strong).toBeTruthy()
    expect(strong?.textContent).toBe("bold text")
  })

  it("renders links with target=_blank and rel=noopener", () => {
    const { container } = render(
      <Markdown content="[example](https://example.com)" />,
    )
    const link = container.querySelector("a")
    expect(link).toBeTruthy()
    expect(link?.getAttribute("target")).toBe("_blank")
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer")
    expect(link?.getAttribute("href")).toContain("example.com")
  })

  it("sanitizes dangerous URLs in links", () => {
    const { container } = render(
      <Markdown content="[evil](javascript:alert(1))" />,
    )
    const link = container.querySelector("a")
    expect(link?.getAttribute("href")).toBe("#")
  })

  it("renders code blocks", () => {
    const { container } = render(<Markdown content="`inline code`" />)
    const code = container.querySelector("code")
    expect(code).toBeTruthy()
    expect(code?.textContent).toBe("inline code")
  })

  it("wraps output in markdown-content div", () => {
    const { container } = render(<Markdown content="test" />)
    const wrapper = container.querySelector(".markdown-content")
    expect(wrapper).toBeTruthy()
  })
})
