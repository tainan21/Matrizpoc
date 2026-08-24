"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { seumeiLoginSkin } from "../../../auth/config"
import { SeumeiDemoAccess } from "./SeumeiDemoAccess"

export function SeumeiLoginScreen() {
  return (
    <SharedLoginFlow
      skin={seumeiLoginSkin}
      panelSupplement={<SeumeiDemoAccess />}
    />
  )
}
