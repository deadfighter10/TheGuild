/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js")

let messagingInitialized = false

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG" && !messagingInitialized) {
    firebase.initializeApp(event.data.config)
    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? "The Guild"
      const options = {
        body: payload.notification?.body ?? "",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: payload.data,
      }
      self.registration.showNotification(title, options)
    })

    messagingInitialized = true
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const link = event.notification.data?.link ?? "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(link)
    })
  )
})
