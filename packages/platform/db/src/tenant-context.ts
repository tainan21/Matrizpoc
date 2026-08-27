type TenantTransaction = {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>
}

type TransactionClient<TTransaction extends TenantTransaction> = {
  $transaction<TResult>(work: (transaction: TTransaction) => Promise<TResult>): Promise<TResult>
}

const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/

/**
 * Runs work with a PostgreSQL transaction-local tenant setting. The caller
 * must pass tenantId from a server-built AuthorizationContext, never request
 * input. `is_local=true` prevents pooled connections from retaining authority.
 */
export async function withTenantContext<TTransaction extends TenantTransaction, TResult>(
  client: TransactionClient<TTransaction>,
  tenantId: string,
  work: (transaction: TTransaction) => Promise<TResult>,
): Promise<TResult> {
  if (!TENANT_ID_PATTERN.test(tenantId)) throw new Error("Invalid tenant id")

  return client.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SELECT set_config('matriz.tenant_id', $1, true)",
      tenantId,
    )
    return work(transaction)
  })
}
