import type { AgentPolicy } from "../src/shared.js"

export type CapsuleCapability = "downloads" | "devtools"

export interface CapsuleCapabilities {
  readonly automation: "none" | "safe" | "full"
  readonly downloads: boolean
  readonly devtools: boolean
}

const capabilities: Record<AgentPolicy, CapsuleCapabilities> = {
  human: { automation: "none", downloads: true, devtools: true },
  "agent-safe": { automation: "safe", downloads: false, devtools: false },
  "agent-full": { automation: "full", downloads: true, devtools: false },
}

export function capsuleCapabilities(policy: AgentPolicy): CapsuleCapabilities {
  return capabilities[policy]
}

export function policyAllows(policy: AgentPolicy, capability: CapsuleCapability): boolean {
  return capabilities[policy][capability]
}
