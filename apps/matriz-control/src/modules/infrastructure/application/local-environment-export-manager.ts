export type LocalEnvironmentExportInspection = Readonly<{ appId: string; targetExists: boolean; gitIgnored: boolean }>

export interface LocalEnvironmentExportHost {
  inspect(appId: string): Promise<LocalEnvironmentExportInspection>
  write(appId: string): Promise<void>
}

export type LocalEnvironmentExportPreview = Readonly<{
  appId: string
  confirmationToken: string
  expiresAt: number
  title: string
  impact: readonly string[]
}>

type Options = Readonly<{ host: LocalEnvironmentExportHost; now(): number; token(): string }>
type PendingExport = Readonly<{ appId: string; expiresAt: number }>
const CONFIRMATION_TTL_MS = 5 * 60 * 1_000

export class LocalEnvironmentExportManager {
  private readonly pending = new Map<string, PendingExport>()

  constructor(private readonly options: Options) {}

  async preview(appId: string): Promise<LocalEnvironmentExportPreview> {
    const inspection = await this.options.host.inspect(appId)
    if (!inspection.gitIgnored) throw new Error(".env.development.local is not ignored by Git")
    const confirmationToken = this.options.token()
    const expiresAt = this.options.now() + CONFIRMATION_TTL_MS
    this.pending.set(confirmationToken, { appId: inspection.appId, expiresAt })
    return {
      appId: inspection.appId,
      confirmationToken,
      expiresAt,
      title: `Exportar ambiente local de ${inspection.appId}`,
      impact: [
        inspection.targetExists ? "Substitui o arquivo .env.development.local existente." : "Cria um novo arquivo .env.development.local.",
        "Restringe o arquivo ao usuário Windows atual.",
        "O arquivo contém segredos locais e deve permanecer ignorado pelo Git.",
      ],
    }
  }

  async confirm(confirmationToken: string): Promise<Readonly<{ state: "exported"; appId: string }>> {
    const pending = this.pending.get(confirmationToken)
    if (!pending) throw new Error("Environment export confirmation token is invalid or already used")
    this.pending.delete(confirmationToken)
    if (this.options.now() > pending.expiresAt) throw new Error("Environment export confirmation token expired")
    const inspection = await this.options.host.inspect(pending.appId)
    if (!inspection.gitIgnored) throw new Error(".env.development.local is not ignored by Git")
    await this.options.host.write(pending.appId)
    return { state: "exported", appId: pending.appId }
  }
}

export function serializeDevelopmentEnvironment(values: Readonly<Record<string, string>>): string {
  const lines = Object.entries(values).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error(`Invalid environment key ${name}`)
    return `${name}=${JSON.stringify(value)}`
  })
  return `# Generated explicitly by Matriz Control. Do not commit.\n${lines.join("\n")}\n`
}
