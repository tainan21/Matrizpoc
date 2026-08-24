export type DemoFederationDefinition = {
  readonly global: { readonly email: string; readonly displayName: string; readonly companySlugs: readonly string[] }
  readonly operator: { readonly email: string; readonly displayName: string; readonly companySlugs: readonly string[] }
  readonly companies: readonly { readonly name: string; readonly slug: string }[]
}

export const DEMO_FEDERATION: DemoFederationDefinition = {
  global: {
    email: "demo.global@matriz.local",
    displayName: "Demo Global Matriz",
    companySlugs: ["galaxia-burger", "sabor-e-brasa"],
  },
  operator: {
    email: "operacao@galaxiaburger.demo",
    displayName: "Operação Galaxia",
    companySlugs: ["galaxia-burger"],
  },
  companies: [
    { name: "Galaxia Burger", slug: "galaxia-burger" },
    { name: "Sabor & Brasa", slug: "sabor-e-brasa" },
  ],
}

export function requireDemoProvisioning(env: Readonly<Record<string, string | undefined>>): void {
  if (env.MATRIZ_DEMO_PROVISIONING !== "true") throw new Error("DEMO_PROVISIONING_DISABLED")
}
