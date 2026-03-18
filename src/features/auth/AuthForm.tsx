import { useState, type FormEvent } from "react"
import { useAuth } from "./AuthContext"

type AuthMode = "login" | "register"

export function AuthForm() {
  const { register, login } = useAuth()
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "register") {
        await register(email, password, displayName)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"))
    setError("")
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-8 rounded-xl border border-white/5 bg-void-900">
      <h2 className="font-display text-2xl text-center text-white mb-2">
        {mode === "login" ? "Welcome back" : "Join The Guild"}
      </h2>
      <p className="text-center text-white/30 text-sm mb-8">
        {mode === "login"
          ? "Sign in to continue your work"
          : "Start contributing to humanity's advancements"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label htmlFor="displayName" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-void-800 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-void-800 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
            placeholder="you@university.edu"
          />
          {mode === "register" && (
            <p className="text-[10px] text-white/30 mt-1.5 font-mono">
              .edu / .ac email = +100 Rep after email verification
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 bg-void-800 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400/80 text-sm px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/10" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-white text-void-950 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-white/30 text-sm mt-6">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button onClick={toggleMode} className="text-cyan-400/70 hover:text-cyan-400 transition-colors">
          {mode === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  )
}
