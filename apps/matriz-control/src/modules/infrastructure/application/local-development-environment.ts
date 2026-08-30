import type { InfrastructureContractV1 } from "@matriz/integration-infrastructure-contracts"

const forbiddenControlKeys = new Set(["MATRIZ_CONTROL_LOCAL_TOKEN", "MATRIZ_CONTROL_COOKIE_SECURE"])

export type ResolvedLocalEnvironment = Readonly<{
  values: Readonly<Record<string, string>>
  redactions: readonly string[]
}>

export function resolveDeclaredEnvironment(
  contract: InfrastructureContractV1,
  available: Readonly<Record<string, string | undefined>>,
): ResolvedLocalEnvironment {
  const values: Record<string, string> = {}
  const redactions: string[] = []
  for (const declaration of contract.environment.keys) {
    if (forbiddenControlKeys.has(declaration.name)) throw new Error(`Infrastructure Contract declares forbidden control-plane key ${declaration.name}`)
    const value = available[declaration.name]
    if (!value?.trim()) {
      if (declaration.required) throw new Error(`Local environment is missing required key ${declaration.name}`)
      continue
    }
    values[declaration.name] = value
    if (declaration.secret) redactions.push(value)
  }
  return Object.freeze({ values: Object.freeze(values), redactions: Object.freeze(redactions) })
}
