export interface SeumeiRequestContext {
  readonly tenantId: string
  readonly tenantName: string
  readonly userName: string
}

export interface EstablishmentSummary {
  readonly id: string
  readonly name: string
  readonly city: string
  readonly status: string
}

export interface EstablishmentSummaryRepository {
  listByTenant(tenantId: string): Promise<readonly EstablishmentSummary[]>
}

export interface SeumeiHomeSummary {
  readonly tenantId: string
  readonly tenantName: string
  readonly userName: string
  readonly establishmentCount: number
  readonly firstEstablishment: EstablishmentSummary | null
}

export class MissingTenantContextError extends Error {
  constructor() {
    super("A sessão não possui tenant ativo")
    this.name = "MissingTenantContextError"
  }
}

export async function readHomeSummary(
  context: SeumeiRequestContext,
  repository: EstablishmentSummaryRepository,
): Promise<SeumeiHomeSummary> {
  if (!context.tenantId.trim()) throw new MissingTenantContextError()
  const establishments = await repository.listByTenant(context.tenantId)
  return {
    ...context,
    establishmentCount: establishments.length,
    firstEstablishment: establishments[0] ?? null,
  }
}
