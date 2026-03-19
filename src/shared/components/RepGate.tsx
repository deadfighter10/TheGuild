import type { ReactNode } from "react"
import { isAdmin } from "@/domain/user"
import type { UserRole } from "@/domain/user"

type RepGateProps = {
  readonly currentRep: number
  readonly requiredRep: number
  readonly role: UserRole
  readonly children: ReactNode
  readonly fallback?: ReactNode
  readonly hideWhenLocked?: boolean
}

export function RepGate({
  currentRep,
  requiredRep,
  role,
  children,
  fallback,
  hideWhenLocked = false,
}: RepGateProps) {
  if (isAdmin(role) || currentRep >= requiredRep) {
    return <>{children}</>
  }

  if (hideWhenLocked) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <p className="text-gray-400 text-sm">
      You need at least {requiredRep} Rep to access this.
    </p>
  )
}
