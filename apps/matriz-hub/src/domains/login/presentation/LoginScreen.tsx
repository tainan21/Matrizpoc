"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { hubLoginSkin } from "../../../auth/config"
import { HubLoginPanelSupplement, HubLoginStorySupplement } from "./HubLoginExtensions"

export function HubLoginScreen() {
  return (
    <SharedLoginFlow
      skin={hubLoginSkin}
      storySupplement={<HubLoginStorySupplement />}
      panelSupplement={<HubLoginPanelSupplement />}
    />
  )
}
