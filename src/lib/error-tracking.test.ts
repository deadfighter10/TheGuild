import { describe, it, expect, vi, afterEach } from "vitest"
import { errorTracker, setupGlobalErrorHandlers } from "./error-tracking"

describe("errorTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("captureException logs to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("test error")
    errorTracker.captureException(error, { userId: "u1" })
    expect(spy).toHaveBeenCalledWith("[ErrorTracking]", error, { userId: "u1" })
  })

  it("captureMessage logs to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorTracker.captureMessage("test message", { route: "/test" })
    expect(spy).toHaveBeenCalledWith("[ErrorTracking]", "test message", { route: "/test" })
  })

  it("captureException works without context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    errorTracker.captureException("bare error")
    expect(spy).toHaveBeenCalledWith("[ErrorTracking]", "bare error", undefined)
  })

  it("captureMessage works without context", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorTracker.captureMessage("bare message")
    expect(spy).toHaveBeenCalledWith("[ErrorTracking]", "bare message", undefined)
  })
})

describe("setupGlobalErrorHandlers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("registers error event listener on window", () => {
    const spy = vi.spyOn(window, "addEventListener")
    setupGlobalErrorHandlers()
    expect(spy).toHaveBeenCalledWith("error", expect.any(Function))
    expect(spy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function))
  })

  it("captures unhandled errors via the error event", () => {
    const captureSpy = vi.spyOn(errorTracker, "captureException")
    vi.spyOn(console, "error").mockImplementation(() => {})
    setupGlobalErrorHandlers()
    const testError = new Error("global error")
    window.dispatchEvent(new ErrorEvent("error", { error: testError }))
    expect(captureSpy).toHaveBeenCalledWith(testError, { route: expect.any(String) })
  })

  it("captures unhandled promise rejections", () => {
    const captureSpy = vi.spyOn(errorTracker, "captureException")
    vi.spyOn(console, "error").mockImplementation(() => {})
    setupGlobalErrorHandlers()
    const reason = new Error("rejection")
    const event = new Event("unhandledrejection") as Event & { reason: Error }
    Object.defineProperty(event, "reason", { value: reason })
    window.dispatchEvent(event)
    expect(captureSpy).toHaveBeenCalledWith(reason, { route: expect.any(String) })
  })
})
