import { REP_THRESHOLDS } from "./reputation"
import { isAdmin } from "./user"

export type VouchRequest = {
  readonly voucherId: string
  readonly voucheeId: string
  readonly voucherRep: number
  readonly voucheeHasBeenVouched: boolean
  readonly voucherHasVouchedBefore: boolean
}

type VouchValid = { readonly valid: true }
type VouchInvalid = { readonly valid: false; readonly reason: string }
export type VouchValidation = VouchValid | VouchInvalid

export function validateVouch(request: VouchRequest): VouchValidation {
  if (request.voucherId === request.voucheeId) {
    return { valid: false, reason: "You cannot vouch for yourself" }
  }

  if (!isAdmin(request.voucherRep) && request.voucherRep < REP_THRESHOLDS.contributorMin) {
    return {
      valid: false,
      reason: "You need at least 100 Rep to vouch for someone",
    }
  }

  if (request.voucherHasVouchedBefore) {
    return { valid: false, reason: "You have already vouched for someone" }
  }

  if (request.voucheeHasBeenVouched) {
    return { valid: false, reason: "This user has already been vouched for" }
  }

  return { valid: true }
}
