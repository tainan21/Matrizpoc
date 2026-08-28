import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { monorepoConfig } from "@matriz/platform-config"
import { DistributionCatalogClient } from "./integration/catalog-client"
import { resolveDesktopGateway } from "./integration/desktop-bridge"
import { UninstallApp } from "./ui/app"

async function bootstrap() {
  const root = document.getElementById("root")
  if (!root) throw new Error("Matriz Uninstall root was not found")
  const gateway = await resolveDesktopGateway()
  const catalog = new DistributionCatalogClient(import.meta.env.VITE_MATRIZ_HUB_URL ?? monorepoConfig.baseUrls["matriz-hub"])
  createRoot(root).render(<StrictMode><UninstallApp gateway={gateway} loadCatalog={() => catalog.load()}/></StrictMode>)
}

void bootstrap()
