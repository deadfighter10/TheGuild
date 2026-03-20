import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { setupGlobalErrorHandlers } from "@/lib/error-tracking"
import "./index.css"

setupGlobalErrorHandlers()

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
