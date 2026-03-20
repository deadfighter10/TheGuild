import { describe, it, expect, beforeAll } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

type FirebaseHeader = { readonly key: string; readonly value: string }
type FirebaseHeaderBlock = {
  readonly source: string
  readonly headers: readonly FirebaseHeader[]
}
type FirebaseHostingConfig = {
  readonly hosting: {
    readonly headers: readonly FirebaseHeaderBlock[]
  }
}

function loadFirebaseConfig(): FirebaseHostingConfig {
  const raw = readFileSync(resolve(__dirname, "../../firebase.json"), "utf-8")
  return JSON.parse(raw) as FirebaseHostingConfig
}

function getCspDirectives(): Map<string, string> {
  const config = loadFirebaseConfig()
  const globalHeaders = config.hosting.headers.find((h) => h.source === "**")
  const cspHeader = globalHeaders?.headers.find(
    (h) => h.key === "Content-Security-Policy"
  )
  if (!cspHeader) throw new Error("CSP header not found in firebase.json")

  const directives = new Map<string, string>()
  for (const part of cspHeader.value.split(";")) {
    const trimmed = part.trim()
    const spaceIdx = trimmed.indexOf(" ")
    if (spaceIdx === -1) continue
    directives.set(trimmed.slice(0, spaceIdx), trimmed.slice(spaceIdx + 1))
  }
  return directives
}

function getSecurityHeaders(): Map<string, string> {
  const config = loadFirebaseConfig()
  const globalHeaders = config.hosting.headers.find((h) => h.source === "**")
  if (!globalHeaders) throw new Error("Global headers block not found")

  const headers = new Map<string, string>()
  for (const h of globalHeaders.headers) {
    headers.set(h.key, h.value)
  }
  return headers
}

describe("CSP validation", () => {
  let directives: Map<string, string>

  beforeAll(() => {
    directives = getCspDirectives()
  })

  it("has default-src set to self only", () => {
    expect(directives.get("default-src")).toBe("'self'")
  })

  it("has script-src set to self only (no unsafe-inline or unsafe-eval)", () => {
    const scriptSrc = directives.get("script-src")
    expect(scriptSrc).toBe("'self'")
    expect(scriptSrc).not.toContain("unsafe-inline")
    expect(scriptSrc).not.toContain("unsafe-eval")
  })

  it("has object-src set to none", () => {
    expect(directives.get("object-src")).toBe("'none'")
  })

  it("has frame-ancestors set to none", () => {
    expect(directives.get("frame-ancestors")).toBe("'none'")
  })

  it("has base-uri set to self", () => {
    expect(directives.get("base-uri")).toBe("'self'")
  })

  it("has form-action set to self", () => {
    expect(directives.get("form-action")).toBe("'self'")
  })

  it("does not allow wildcard in default-src", () => {
    expect(directives.get("default-src")).not.toContain("*")
  })

  it("does not allow wildcard in script-src", () => {
    expect(directives.get("script-src")).not.toContain("*")
  })

  it("connect-src includes Firebase domains", () => {
    const connectSrc = directives.get("connect-src")
    expect(connectSrc).toBeDefined()
    expect(connectSrc).toContain("googleapis.com")
    expect(connectSrc).toContain("firebaseio.com")
  })

  it("frame-src only allows known embeddable domains", () => {
    const frameSrc = directives.get("frame-src")
    expect(frameSrc).toBeDefined()
    expect(frameSrc).not.toContain("*")
    expect(frameSrc).not.toContain("'self'")
  })

  it("style-src does not allow unsafe-eval", () => {
    const styleSrc = directives.get("style-src")
    expect(styleSrc).toBeDefined()
    expect(styleSrc).not.toContain("unsafe-eval")
  })

  it("img-src does not allow wildcard origins", () => {
    const imgSrc = directives.get("img-src")
    expect(imgSrc).toBeDefined()
    expect(imgSrc).not.toMatch(/(?<!\.)(\*)/g.source ? /[^.]\*/ : / \*/)
  })
})

describe("Security headers validation", () => {
  let headers: Map<string, string>

  beforeAll(() => {
    headers = getSecurityHeaders()
  })

  it("has X-Content-Type-Options set to nosniff", () => {
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("has X-Frame-Options set to DENY", () => {
    expect(headers.get("X-Frame-Options")).toBe("DENY")
  })

  it("has Referrer-Policy configured", () => {
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")
  })

  it("has Permissions-Policy that disables camera, microphone, and geolocation", () => {
    const policy = headers.get("Permissions-Policy")
    expect(policy).toBeDefined()
    expect(policy).toContain("camera=()")
    expect(policy).toContain("microphone=()")
    expect(policy).toContain("geolocation=()")
  })

  it("has Content-Security-Policy header present", () => {
    expect(headers.has("Content-Security-Policy")).toBe(true)
  })
})

describe("CSP loosening detection", () => {
  let directives: Map<string, string>

  beforeAll(() => {
    directives = getCspDirectives()
  })

  it("script-src must not contain unsafe-inline", () => {
    expect(directives.get("script-src")).not.toContain("unsafe-inline")
  })

  it("script-src must not contain unsafe-eval", () => {
    expect(directives.get("script-src")).not.toContain("unsafe-eval")
  })

  it("default-src must not contain unsafe-inline", () => {
    expect(directives.get("default-src")).not.toContain("unsafe-inline")
  })

  it("default-src must not contain unsafe-eval", () => {
    expect(directives.get("default-src")).not.toContain("unsafe-eval")
  })

  it("object-src must remain none", () => {
    expect(directives.get("object-src")).toBe("'none'")
  })

  it("frame-ancestors must remain none", () => {
    expect(directives.get("frame-ancestors")).toBe("'none'")
  })
})
