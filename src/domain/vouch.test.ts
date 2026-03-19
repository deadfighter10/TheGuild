import { describe, it, expect } from "vitest"
import { validateVouch, type VouchRequest } from "./vouch"

function makeVouchRequest(overrides: Partial<VouchRequest> = {}): VouchRequest {
  return {
    voucherId: "user-1",
    voucheeId: "user-2",
    voucherRep: 100,
    voucherRole: "user",
    voucheeHasBeenVouched: false,
    voucherHasVouchedBefore: false,
    ...overrides,
  }
}

describe("validateVouch", () => {
  it("succeeds when voucher has enough Rep and vouchee has not been vouched", () => {
    const result = validateVouch(makeVouchRequest())
    expect(result).toEqual({ valid: true })
  })

  it("fails when voucher has less than 100 Rep", () => {
    const result = validateVouch(makeVouchRequest({ voucherRep: 99 }))
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to vouch for someone",
    })
  })

  it("fails when vouchee has already been vouched", () => {
    const result = validateVouch(makeVouchRequest({ voucheeHasBeenVouched: true }))
    expect(result).toEqual({
      valid: false,
      reason: "This user has already been vouched for",
    })
  })

  it("fails when voucher tries to vouch for themselves", () => {
    const result = validateVouch(
      makeVouchRequest({ voucherId: "user-1", voucheeId: "user-1" }),
    )
    expect(result).toEqual({
      valid: false,
      reason: "You cannot vouch for yourself",
    })
  })

  it("fails when voucher has already vouched for someone", () => {
    const result = validateVouch(makeVouchRequest({ voucherHasVouchedBefore: true }))
    expect(result).toEqual({
      valid: false,
      reason: "You have already vouched for someone",
    })
  })

  it("allows an admin to vouch regardless of rep", () => {
    const result = validateVouch(makeVouchRequest({ voucherRep: 0, voucherRole: "admin" }))
    expect(result).toEqual({ valid: true })
  })
})
