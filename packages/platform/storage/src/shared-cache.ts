export interface SharedCacheEntry<T = unknown> {
  readonly key: string
  readonly value: T
  readonly updatedAt: string
  readonly updatedBy: string
}

export interface SharedCacheClient {
  read<T>(key: string): Promise<SharedCacheEntry<T> | undefined>
  write<T>(key: string, value: T, updatedBy: string): Promise<SharedCacheEntry<T>>
}

export function createSharedCacheClient(baseUrl: string): SharedCacheClient {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/ecosystem/cache`
  return {
    async read<T>(key: string) {
      const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
        cache: "no-store",
      })
      if (response.status === 404) return undefined
      if (!response.ok) throw new Error("Nao foi possivel ler o cache compartilhado.")
      return (await response.json()) as SharedCacheEntry<T>
    },
    async write<T>(key: string, value: T, updatedBy: string) {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value, updatedBy }),
      })
      if (!response.ok) throw new Error("Nao foi possivel atualizar o cache compartilhado.")
      return (await response.json()) as SharedCacheEntry<T>
    },
  }
}
