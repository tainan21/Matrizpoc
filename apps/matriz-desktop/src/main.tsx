import "@matriz/design-system/css"
import "@matriz/design-ui/styles.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { sound } from "@matriz/design-ui/sounds"

import { bootstrapMatrizDesktop } from "./bootstrap"
import { createTauriGateway } from "./integration/tauri/tauri-gateway"
import { unavailableGateway } from "./integration/unavailable-gateway"
import { ControlApp, type Feedback } from "./ui/app"
import "./ui/styles.css"

bootstrapMatrizDesktop()

const root = document.getElementById("root")

if (!root) {
  throw new Error("Matriz Control root element not found")
}

const feedback: Feedback = {
  play: (id) => sound.play(id),
  initialize: () => void sound.initialize({ startup: true }),
  configure: (settings) => {
    if (settings.soundsEnabled) sound.enable()
    else sound.disable()
    sound.setVolume(settings.volume)
  },
}

createRoot(root).render(
  <StrictMode>
    <ControlApp
      gateway={"__TAURI_INTERNALS__" in window ? createTauriGateway() : unavailableGateway}
      feedback={feedback}
    />
  </StrictMode>,
)
