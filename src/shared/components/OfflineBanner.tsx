import { useNetworkStatus } from "@/shared/hooks/use-network-status"

export function OfflineBanner() {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div
      role="alert"
      className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-amber-400 text-sm"
    >
      You are offline. Some features may be unavailable.
    </div>
  )
}
