import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging"
import { doc, updateDoc } from "firebase/firestore"
import { app, db } from "./firebase"

const vapidKey = import.meta.env["VITE_FIREBASE_VAPID_KEY"] as string | undefined

function isMessagingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  )
}

function sendFirebaseConfigToSW(worker: ServiceWorker): void {
  worker.postMessage({
    type: "FIREBASE_CONFIG",
    config: {
      apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] ?? "",
      authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "",
      projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"] ?? "",
      storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] ?? "",
      messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
      appId: import.meta.env["VITE_FIREBASE_APP_ID"] ?? "",
    },
  })
}

async function registerFirebaseServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
  const worker = registration.active ?? registration.installing ?? registration.waiting
  if (worker) {
    sendFirebaseConfigToSW(worker)
  }
  if (!registration.active) {
    await new Promise<void>((resolve) => {
      const sw = registration.installing ?? registration.waiting
      if (!sw) { resolve(); return }
      sw.addEventListener("statechange", () => {
        if (sw.state === "activated") {
          sendFirebaseConfigToSW(sw)
          resolve()
        }
      })
    })
  }
  return registration
}

export async function requestNotificationPermission(userId: string): Promise<string | null> {
  if (!isMessagingSupported()) return null
  if (!vapidKey) return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const registration = await registerFirebaseServiceWorker()
  const messaging = getMessaging(app)

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (token) {
    await updateDoc(doc(db, "users", userId), { fcmToken: token })
  }

  return token
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  if (!isMessagingSupported()) return () => {}

  const messaging = getMessaging(app)
  const unsubscribe = onMessage(messaging, callback)
  return unsubscribe
}
