"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { matrizAdminLoginSkin } from "../../../auth/config"

export function SeumeiLoginScreen() {
  return <SharedLoginFlow skin={matrizAdminLoginSkin} />
}
