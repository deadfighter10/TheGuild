import { useState, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { canContribute } from "@/domain/reputation"
import { vouchForUser, searchUserByEmail } from "./vouch-service"

type SearchResult = {
  readonly uid: string
  readonly displayName: string
  readonly email: string
}

export function VouchPanel() {
  const { guildUser } = useAuth()
  const [email, setEmail] = useState("")
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [loading, setLoading] = useState(false)

  if (!guildUser) return null

  const hasEnoughRep = canContribute(guildUser.repPoints)

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    setMessage("")
    setSearchResult(null)
    setLoading(true)

    try {
      const result = await searchUserByEmail(email, guildUser.uid)
      if (result) {
        setSearchResult(result)
      } else {
        setMessage("No user found with that email")
        setMessageType("error")
      }
    } catch {
      setMessage("Failed to search for user")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const handleVouch = async () => {
    if (!searchResult) return
    setLoading(true)
    setMessage("")

    try {
      const result = await vouchForUser(
        guildUser.uid,
        searchResult.uid,
        guildUser.repPoints,
      )

      if (result.valid) {
        setMessage(`Successfully vouched for ${searchResult.displayName}! They received +100 Rep.`)
        setMessageType("success")
        setSearchResult(null)
        setEmail("")
      } else {
        setMessage(result.reason)
        setMessageType("error")
      }
    } catch {
      setMessage("Failed to vouch. Please try again.")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  if (!hasEnoughRep) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Vouch for a Member</h3>
        <p className="text-gray-400 text-sm">
          You need at least 100 Rep to vouch for someone.
          Current Rep: {guildUser.repPoints}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-2">Vouch for a Member</h3>
      <p className="text-gray-400 text-sm mb-4">
        Vouch for someone to give them +100 Rep. You can vouch once.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter their email"
          required
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
        >
          Search
        </button>
      </form>

      {searchResult && (
        <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4 mb-4">
          <div>
            <p className="font-medium">{searchResult.displayName}</p>
            <p className="text-gray-400 text-sm">{searchResult.email}</p>
          </div>
          <button
            onClick={handleVouch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Vouching..." : "Vouch"}
          </button>
        </div>
      )}

      {message && (
        <p
          role="alert"
          className={`text-sm ${messageType === "success" ? "text-green-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
