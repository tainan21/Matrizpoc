import "@matriz/design-system/css"
import "@matriz/design-ui/styles.css"

import { asTenantId } from "@matriz/foundation-types"
import { createLocalStorageStore, createNamespacedStore } from "@matriz/platform-storage"
import { sound } from "@matriz/design-ui/sounds"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { createSeumeiContainer } from "../../src/lib/container"
import { toDesktopSnapshot } from "../../src/ui/presenters/desktop.presenter"
import { SeumeiDesktopApp } from "./app"
import "./styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("Matriz Admin desktop root not found")

const store = createNamespacedStore(createLocalStorageStore(), "matriz-admin-desktop:v1")
const container = createSeumeiContainer(store)
const snapshot = await toDesktopSnapshot(container.useCases, asTenantId("tenant-matriz"))

sound.enable()
sound.setVolume(0.35)
void sound.initialize({ startup: true })

createRoot(root).render(<StrictMode><SeumeiDesktopApp snapshot={snapshot} play={(id) => sound.play(id)} /></StrictMode>)
