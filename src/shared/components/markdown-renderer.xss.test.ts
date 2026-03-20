import { describe, it, expect } from "vitest"
import { sanitizeUrl, renderInline, renderMarkdown } from "./markdown-renderer"

function expectNoExecutableHtml(output: string) {
  expect(output).not.toMatch(/<script[\s>]/i)
  expect(output).not.toMatch(/<[a-z][^>]*\sonerror\s*=/i)
  expect(output).not.toMatch(/<[a-z][^>]*\sonload\s*=/i)
  expect(output).not.toMatch(/<[a-z][^>]*\sonclick\s*=/i)
  expect(output).not.toMatch(/<[a-z][^>]*\sonmouseover\s*=/i)
  expect(output).not.toMatch(/<[a-z][^>]*\sonfocus\s*=/i)
  expect(output).not.toMatch(/<[a-z][^>]*\sontoggle\s*=/i)
}

describe("XSS regression: sanitizeUrl", () => {
  it("rejects javascript: with mixed case", () => {
    expect(sanitizeUrl("JaVaScRiPt:alert(1)")).toBe("#")
  })

  it("rejects javascript: with leading whitespace", () => {
    expect(sanitizeUrl("  javascript:alert(1)")).toBe("#")
  })

  it("rejects javascript: with tab character", () => {
    expect(sanitizeUrl("\tjavascript:alert(1)")).toBe("#")
  })

  it("rejects javascript: with newline", () => {
    expect(sanitizeUrl("\njavascript:alert(1)")).toBe("#")
  })

  it("rejects data: URI with base64 HTML payload", () => {
    expect(sanitizeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe("#")
  })

  it("rejects data: URI with plain text", () => {
    expect(sanitizeUrl("data:text/plain,hello")).toBe("#")
  })

  it("rejects blob: protocol", () => {
    expect(sanitizeUrl("blob:http://example.com/uuid")).toBe("#")
  })

  it("rejects file: protocol", () => {
    expect(sanitizeUrl("file:///etc/passwd")).toBe("#")
  })

  it("rejects URL-encoded javascript: protocol", () => {
    expect(sanitizeUrl("javascript%3Aalert(1)")).toBe("#")
  })

  it("rejects double-encoded javascript: protocol", () => {
    expect(sanitizeUrl("javascript%253Aalert(1)")).toBe("#")
  })

  it("allows HTTPS URL with fragment", () => {
    expect(sanitizeUrl("https://example.com/page#section")).toBe("https://example.com/page#section")
  })

  it("allows HTTPS URL with port", () => {
    expect(sanitizeUrl("https://example.com:8080/api")).toBe("https://example.com:8080/api")
  })

  it("rejects relative path (not a valid URL)", () => {
    expect(sanitizeUrl("/relative/path")).toBe("#")
  })

  it("rejects protocol-relative URL", () => {
    expect(sanitizeUrl("//evil.com/payload")).toBe("#")
  })
})

describe("XSS regression: escapeHtml via renderInline", () => {
  it("escapes <script> tag", () => {
    const result = renderInline("<script>alert('xss')</script>")
    expect(result).toContain("&lt;script&gt;")
    expectNoExecutableHtml(result)
  })

  it("escapes <img> with onerror handler", () => {
    const result = renderInline('<img src=x onerror=alert(1)>')
    expect(result).toContain("&lt;img")
    expectNoExecutableHtml(result)
  })

  it("escapes <svg> with onload handler", () => {
    const result = renderInline('<svg onload=alert(1)>')
    expect(result).toContain("&lt;svg")
    expectNoExecutableHtml(result)
  })

  it("escapes <iframe> tag", () => {
    const result = renderInline('<iframe src="https://evil.com"></iframe>')
    expect(result).toContain("&lt;iframe")
    expect(result).not.toMatch(/<iframe[\s>]/i)
  })

  it("escapes <body> with onload", () => {
    const result = renderInline('<body onload=alert(1)>')
    expect(result).toContain("&lt;body")
    expectNoExecutableHtml(result)
  })

  it("escapes <input> with onfocus and autofocus", () => {
    const result = renderInline('<input onfocus=alert(1) autofocus>')
    expect(result).toContain("&lt;input")
    expectNoExecutableHtml(result)
  })

  it("escapes <details> with ontoggle", () => {
    const result = renderInline('<details open ontoggle=alert(1)>test</details>')
    expect(result).toContain("&lt;details")
    expect(result).not.toMatch(/<[a-z][^>]*\sontoggle\s*=/i)
  })

  it("escapes nested tags", () => {
    const result = renderInline('<div><script>alert(1)</script></div>')
    expect(result).toContain("&lt;div&gt;&lt;script&gt;")
    expectNoExecutableHtml(result)
  })

  it("escapes double quotes in attributes", () => {
    const result = renderInline('"><script>alert(1)</script><input value="')
    expect(result).toContain("&quot;")
    expectNoExecutableHtml(result)
  })

  it("escapes HTML entities in link labels", () => {
    const result = renderInline('[<img src=x onerror=alert(1)>](https://example.com)')
    expect(result).toContain("&lt;img")
    expectNoExecutableHtml(result)
  })
})

describe("XSS regression: renderInline link sanitization", () => {
  it("neutralizes javascript: in markdown links", () => {
    const result = renderInline("[click](javascript:alert(document.cookie))")
    expect(result).toContain('href="#"')
    expect(result).not.toContain("javascript:")
  })

  it("neutralizes javascript: with entity encoding in URL", () => {
    const result = renderInline("[click](javascript&#58;alert(1))")
    expect(result).not.toMatch(/javascript\s*:/i)
  })

  it("neutralizes data: URI in markdown links", () => {
    const result = renderInline("[click](data:text/html,<script>alert(1)</script>)")
    expect(result).toContain('href="#"')
  })

  it("neutralizes javascript: with tab in URL", () => {
    const result = renderInline("[click](java\tscript:alert(1))")
    expect(result).not.toMatch(/href="javascript/i)
  })

  it("escapes HTML in link label while preserving safe URL", () => {
    const result = renderInline('[<b>bold</b>](https://safe.com)')
    expect(result).toContain("&lt;b&gt;")
    expect(result).toContain('href="https://safe.com/"')
  })
})

describe("XSS regression: renderMarkdown block-level", () => {
  it("escapes script tags inside code blocks", () => {
    const result = renderMarkdown("```\n<script>alert(1)</script>\n```")
    expect(result).toContain("&lt;script&gt;")
    expectNoExecutableHtml(result)
  })

  it("escapes HTML in headings", () => {
    const result = renderMarkdown("# <script>alert(1)</script>")
    expect(result).toContain("&lt;script&gt;")
    expectNoExecutableHtml(result)
  })

  it("escapes HTML in list items", () => {
    const result = renderMarkdown("- <img src=x onerror=alert(1)>")
    expect(result).toContain("&lt;img")
    expectNoExecutableHtml(result)
  })

  it("escapes HTML in paragraphs", () => {
    const result = renderMarkdown("<svg/onload=alert(1)>")
    expect(result).toContain("&lt;svg")
    expectNoExecutableHtml(result)
  })

  it("escapes event handlers across multiple lines", () => {
    const result = renderMarkdown("line1 <img src=x onerror=alert(1)>\nline2 <svg onload=alert(2)>")
    expectNoExecutableHtml(result)
  })

  it("escapes HTML in unclosed code blocks", () => {
    const result = renderMarkdown("```\n<script>alert(1)</script>")
    expect(result).toContain("&lt;script&gt;")
    expectNoExecutableHtml(result)
  })

  it("neutralizes javascript: links in list items", () => {
    const result = renderMarkdown("- [click](javascript:alert(1))")
    expect(result).toContain('href="#"')
    expect(result).not.toContain("javascript:")
  })

  it("neutralizes javascript: links in headings", () => {
    const result = renderMarkdown("## [click](javascript:void(0))")
    expect(result).toContain('href="#"')
  })
})

describe("XSS regression: unicode and encoding attacks", () => {
  it("escapes fullwidth angle brackets", () => {
    const result = renderInline("\uFF1Cscript\uFF1Ealert(1)\uFF1C/script\uFF1E")
    expectNoExecutableHtml(result)
  })

  it("escapes HTML with null byte injection", () => {
    const result = renderInline("<scr\0ipt>alert(1)</script>")
    expectNoExecutableHtml(result)
    expect(result).not.toMatch(/<scr/)
  })

  it("handles extremely long input without stack overflow", () => {
    const longInput = "a".repeat(100_000)
    const result = renderInline(longInput)
    expect(result.length).toBeGreaterThan(0)
  })

  it("escapes HTML entities that could be double-decoded", () => {
    const result = renderInline("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(result).not.toMatch(/<script[\s>]/i)
  })

  it("rejects URL with unicode escape for javascript:", () => {
    expect(sanitizeUrl("java\u0073cript:alert(1)")).toBe("#")
  })
})
