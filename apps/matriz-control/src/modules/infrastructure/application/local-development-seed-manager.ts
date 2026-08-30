export type LocalSeedPrerequisites = Readonly<{
  servicesHealthy: boolean
  migrationsClean: boolean
  workspaceAvailable: boolean
}>

export interface LocalDevelopmentSeedHost {
  prerequisites(): Promise<LocalSeedPrerequisites>
  execute(): Promise<void>
}

export type LocalDevelopmentSeedPreview = Readonly<{
  confirmationToken: string
  expiresAt: number
  title: string
  impact: readonly string[]
}>

export type LocalDevelopmentSeedResult = Readonly<{ state: "ready"; message: string }>

type Options = Readonly<{
  host: LocalDevelopmentSeedHost
  now(): number
  token(): string
}>

const CONFIRMATION_TTL_MS = 5 * 60 * 1_000

export class LocalDevelopmentSeedManager {
  private readonly confirmations = new Map<string, number>()

  constructor(private readonly options: Options) {}

  async preview(): Promise<LocalDevelopmentSeedPreview> {
    assertPrerequisites(await this.options.host.prerequisites())
    const confirmationToken = this.options.token()
    const expiresAt = this.options.now() + CONFIRMATION_TTL_MS
    this.confirmations.set(confirmationToken, expiresAt)
    return {
      confirmationToken,
      expiresAt,
      title: "Popular ambiente local Matriz",
      impact: [
        "Cria ou atualiza fixtures locais idempotentes nos oito schemas.",
        "Registra clientes OIDC locais usando apenas fingerprints no Core.",
        "Cria credenciais locais do Identity; senhas permanecem no vault do Control.",
      ],
    }
  }

  async confirm(confirmationToken: string): Promise<LocalDevelopmentSeedResult> {
    const expiresAt = this.confirmations.get(confirmationToken)
    if (expiresAt === undefined) throw new Error("Seed confirmation token is invalid or already used")
    this.confirmations.delete(confirmationToken)
    if (this.options.now() > expiresAt) throw new Error("Seed confirmation token expired")
    assertPrerequisites(await this.options.host.prerequisites())
    await this.options.host.execute()
    return { state: "ready", message: "Ambiente local populado e credenciais do Identity sincronizadas." }
  }
}

function assertPrerequisites(prerequisites: LocalSeedPrerequisites): void {
  if (!prerequisites.workspaceAvailable) throw new Error("The local workspace is unavailable for seed execution")
  if (!prerequisites.servicesHealthy) throw new Error("All Matriz services must be healthy before seeding")
  if (!prerequisites.migrationsClean) throw new Error("All database migrations must be clean before seeding")
}
