import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { calculateInitialRep, isSchoolEmail } from "@/domain/reputation"
import type { GuildUser } from "@/domain/user"
import type { UserBackground } from "@/domain/onboarding"

type AuthState = {
  readonly firebaseUser: User | null
  readonly guildUser: GuildUser | null
  readonly loading: boolean
}

type AuthActions = {
  readonly register: (email: string, password: string, displayName: string) => Promise<void>
  readonly login: (email: string, password: string) => Promise<void>
  readonly logout: () => Promise<void>
  readonly refreshUser: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    guildUser: null,
    loading: true,
  })

  const fetchGuildUser = async (uid: string): Promise<GuildUser | null> => {
    const userDoc = await getDoc(doc(db, "users", uid))
    const data = userDoc.data()
    if (!data) return null
    return {
      uid,
      email: data["email"] as string,
      displayName: data["displayName"] as string,
      repPoints: data["repPoints"] as number,
      isSchoolEmail: data["isSchoolEmail"] as boolean,
      createdAt: (data["createdAt"] as { toDate: () => Date }).toDate(),
      onboardingComplete: (data["onboardingComplete"] as boolean | undefined) ?? false,
      country: (data["country"] as string | undefined) ?? null,
      background: (data["background"] as UserBackground | undefined) ?? null,
      interests: (data["interests"] as readonly string[] | undefined) ?? [],
      bio: (data["bio"] as string | undefined) ?? "",
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const guildUser = await fetchGuildUser(firebaseUser.uid)
        setState({ firebaseUser, guildUser, loading: false })
      } else {
        setState({ firebaseUser: null, guildUser: null, loading: false })
      }
    })
    return unsubscribe
  }, [])

  const register = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })

    const schoolEmail = isSchoolEmail(email)
    const initialRep = calculateInitialRep(email)

    const guildUser: GuildUser = {
      uid: credential.user.uid,
      email,
      displayName,
      repPoints: initialRep,
      isSchoolEmail: schoolEmail,
      createdAt: new Date(),
      onboardingComplete: false,
      country: null,
      background: null,
      interests: [],
      bio: "",
    }

    await setDoc(doc(db, "users", credential.user.uid), {
      email: guildUser.email,
      displayName: guildUser.displayName,
      repPoints: guildUser.repPoints,
      isSchoolEmail: guildUser.isSchoolEmail,
      createdAt: guildUser.createdAt,
      onboardingComplete: false,
    })

    setState((prev) => ({ ...prev, guildUser }))
  }

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const refreshUser = async () => {
    if (!state.firebaseUser) return
    const guildUser = await fetchGuildUser(state.firebaseUser.uid)
    setState((prev) => ({ ...prev, guildUser }))
  }

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
