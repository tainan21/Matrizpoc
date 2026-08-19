"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { seumeiLoginSkin } from "../../../auth/config"

export function SeumeiLoginScreen() {
  return <SharedLoginFlow skin={seumeiLoginSkin} />
}
