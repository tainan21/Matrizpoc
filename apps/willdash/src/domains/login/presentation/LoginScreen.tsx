"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { willdashLoginSkin } from "../../../auth/config"

export function WilldashLoginScreen() {
  return <SharedLoginFlow skin={willdashLoginSkin} />
}
