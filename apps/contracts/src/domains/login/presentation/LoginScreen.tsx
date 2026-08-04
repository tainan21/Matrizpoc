"use client"

import { SharedLoginFlow } from "@matriz/flows-auth"
import { contractsLoginSkin } from "../../../auth/config"

export function ContractsLoginScreen() {
  return <SharedLoginFlow skin={contractsLoginSkin} />
}
