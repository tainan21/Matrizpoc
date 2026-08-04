"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { spotLoginSkin } from "../../../auth/config"

export function SpotLoginScreen() {
  return <SharedLoginFlow skin={spotLoginSkin} />
}
