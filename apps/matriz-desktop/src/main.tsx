import "@matriz/design-system/css"
import "@matriz/design-ui/styles.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { bootstrapMatrizDesktop } from "./bootstrap"

bootstrapMatrizDesktop()

const root = document.getElementById("root")

if (!root) {
  throw new Error("Matriz Control root element not found")
}

createRoot(root).render(
  <StrictMode>
    <main aria-label="Matriz Control">Matriz Control</main>
  </StrictMode>,
)
