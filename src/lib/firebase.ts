import { initializeApp } from "firebase/app"
import { connectAuthEmulator, getAuth } from "firebase/auth"
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore"
import { connectFunctionsEmulator, getFunctions } from "firebase/functions"
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check"

const isEmulator = import.meta.env["VITE_USE_EMULATORS"] === "true"

const firebaseConfig = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] ?? "demo-api-key",
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "localhost",
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"] ?? "demo-the-guild",
  storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] ?? "",
  messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
  appId: import.meta.env["VITE_FIREBASE_APP_ID"] ?? "demo-app-id",
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

const appCheckKey = import.meta.env["VITE_RECAPTCHA_ENTERPRISE_KEY"] as string | undefined
if (appCheckKey && !isEmulator) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  })
}

if (isEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
  connectFirestoreEmulator(db, "127.0.0.1", 8080)
  connectFunctionsEmulator(getFunctions(app), "127.0.0.1", 5001)
}
