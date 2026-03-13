import { describe, it, expect } from "vitest"
import { sanitizeUrl, renderInline, renderMarkdown } from "./markdown-renderer"

describe("sanitizeUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/")
  })

  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com/page")).toBe("http://example.com/page")
  })

  it("rejects javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert('xss')")).toBe("#")
  })

  it("rejects data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>alert('xss')</script>")).toBe("#")
  })

  it("rejects vbscript: protocol", () => {
    expect(sanitizeUrl("vbscript:MsgBox('xss')")).toBe("#")
  })

  it("rejects empty string", () => {
    expect(sanitizeUrl("")).toBe("#")
  })

  it("rejects malformed URLs", () => {
    expect(sanitizeUrl("not a url at all")).toBe("#")
  })

  it("rejects ftp: protocol", () => {
    expect(sanitizeUrl("ftp://files.example.com")).toBe("#")
  })

  it("preserves URL with path and query", () => {
    expect(sanitizeUrl("https://example.com/path?q=1&b=2")).toBe("https://example.com/path?q=1&b=2")
  })
})

describe("renderInline", () => {
  it("renders a safe link", () => {
    const result = renderInline("[Click](https://example.com)")
    expect(result).toContain('href="https://example.com/"')
    expect(result).toContain(">Click</a>")
  })

  it("neutralizes javascript: link to href=#", () => {
    const result = renderInline("[Click](javascript:alert('xss'))")
    expect(result).toContain('href="#"')
    expect(result).not.toContain("javascript:")
  })

  it("neutralizes data: link to href=#", () => {
    const result = renderInline("[Click](data:text/html,<script>alert(1)</script>)")
    expect(result).toContain('href="#"')
    expect(result).not.toContain("data:")
  })

  it("escapes HTML in text", () => {
    const result = renderInline("<script>alert('xss')</script>")
    expect(result).not.toContain("<script>")
    expect(result).toContain("&lt;script&gt;")
  })

  it("renders bold text", () => {
    const result = renderInline("**bold**")
    expect(result).toContain("<strong")
    expect(result).toContain("bold</strong>")
  })

  it("renders inline code", () => {
    const result = renderInline("`code`")
    expect(result).toContain("<code")
    expect(result).toContain("code</code>")
  })
})

describe("renderMarkdown", () => {
  it("renders headings", () => {
    const result = renderMarkdown("# Title")
    expect(result).toContain("<h1")
    expect(result).toContain("Title</h1>")
  })

  it("renders paragraphs", () => {
    const result = renderMarkdown("Hello world")
    expect(result).toContain("<p")
    expect(result).toContain("Hello world</p>")
  })

  it("renders unordered lists", () => {
    const result = renderMarkdown("- item one\n- item two")
    expect(result).toContain("<ul")
    expect(result).toContain("<li")
    expect(result).toContain("item one</li>")
    expect(result).toContain("item two</li>")
    expect(result).toContain("</ul>")
  })

  it("renders code blocks with escaped HTML", () => {
    const result = renderMarkdown("```\n<script>alert('xss')</script>\n```")
    expect(result).toContain("<pre")
    expect(result).toContain("&lt;script&gt;")
    expect(result).not.toContain("<script>alert")
  })

  it("does not execute XSS in links within markdown", () => {
    const result = renderMarkdown("[evil](javascript:alert(document.cookie))")
    expect(result).toContain('href="#"')
    expect(result).not.toContain("javascript:")
  })
})
