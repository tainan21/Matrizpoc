type PrismaLogLevel = "warn" | "error"

export type PrismaClientConstructor<TClient> = new (options: {
  datasources: { db: { url: string } }
  log: PrismaLogLevel[]
}) => TClient

export type SchemaClientOptions<TClient> = {
  Client: PrismaClientConstructor<TClient>
  environmentName: string
  globalKey: string
}

/** Technical runtime guard and lazy singleton shared by schema entrypoints. */
export function getOrCreateSchemaClient<TClient>({
  Client,
  environmentName,
  globalKey,
}: SchemaClientOptions<TClient>): TClient {
  if (typeof window !== "undefined") {
    throw new Error("Prisma clients are server-only and cannot run in a browser")
  }

  const runtime = globalThis as typeof globalThis & Record<string, unknown>
  const existing = runtime[globalKey]
  if (existing) return existing as TClient

  const url = process.env[environmentName]
  if (!url) {
    throw new Error(`Missing ${environmentName}`)
  }

  const client = new Client({
    datasources: { db: { url } },
    log: prismaLogLevels(),
  })
  runtime[globalKey] = client
  return client
}

export function prismaLogLevels(): Array<"warn" | "error"> {
  return process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"]
}
