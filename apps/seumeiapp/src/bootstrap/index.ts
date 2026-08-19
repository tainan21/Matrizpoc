import { asAppId } from "@matriz/foundation-types"
import { appOnboardingPayloadSchemas } from "@matriz/integration-api-contracts"
import { registerAppStep } from "@matriz/flows-onboarding"
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest } from "../manifest/manifest"

let booted = false
export function bootstrapSeumei(): { appId: string } {
  if (booted) return { appId: manifest.appId }
  getGlobalRegistry().registerApp(manifest, { baseUrl: monorepoConfig.baseUrls.seumei, enabled: true })
  registerAppStep(asAppId("seumei"), {
    title: "Configurar empresa",
    description: "Identidade, operação e publicação inicial.",
    payloadSchema: appOnboardingPayloadSchemas.seumei,
  })
  booted = true
  return { appId: manifest.appId }
}
