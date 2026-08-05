"use client"

import { useEffect, useMemo, useState } from "react"
import { EcosystemBar, ThemeToggle } from "@matriz/design-ui"
import { monorepoConfig } from "@matriz/platform-config"
import { createSharedCacheClient, type SharedCacheEntry } from "@matriz/platform-storage"
import type { MatrizAppId } from "@matriz/foundation-constants"

const labels: Record<MatrizAppId, string> = {
  "matriz-hub": "Hub · 3000", spot: "Spot · 3001", seumei: "Seumei · 3002",
  contracts: "Contracts · 3003", willdash: "WillDash · 3004",
  "matriz-workbench": "Workbench · 3005", sites: "Sites · 3006",
}

function CacheProof({ appId }: { appId: MatrizAppId }) {
  const client = useMemo(() => createSharedCacheClient(monorepoConfig.baseUrls["matriz-hub"]), [])
  const [entry, setEntry] = useState<SharedCacheEntry<string>>()
  const [value, setValue] = useState("")
  const [message, setMessage] = useState("Lendo prova compartilhada…")

  async function refresh() {
    try {
      const next = await client.read<string>("ecosystem-proof")
      setEntry(next)
      setValue(next?.value ?? "")
      setMessage(next ? `Atualizado por ${next.updatedBy}` : "Ainda sem valor")
    } catch { setMessage("Inicie o Hub na porta 3000") }
  }
  useEffect(() => { void refresh() }, [])

  async function save() {
    try {
      const next = await client.write("ecosystem-proof", value, appId)
      setEntry(next)
      setMessage(`Salvo por ${next.updatedBy}`)
    } catch { setMessage("Hub indisponível na porta 3000") }
  }

  return <div style={{ display: "grid", gap: 6 }}>
    <label style={{ fontSize: 11, fontWeight: 700 }}>Cache compartilhado · prova</label>
    <div style={{ display: "flex", gap: 5 }}>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Digite em um app…" style={{ minWidth: 0, flex: 1, height: 32, padding: "0 8px", borderRadius: 6, border: "1px solid var(--color-border, var(--border, #ddd))", background: "var(--color-background, var(--surface, #fff))", color: "inherit" }} />
      <button type="button" onClick={() => void save()} style={{ border: 0, borderRadius: 6, padding: "0 9px", background: "#111827", color: "white", cursor: "pointer" }}>Salvar</button>
      <button type="button" onClick={() => void refresh()} aria-label="Recarregar cache" style={{ border: "1px solid var(--color-border, var(--border, #ddd))", borderRadius: 6, background: "transparent", color: "inherit", cursor: "pointer" }}>↻</button>
    </div>
    <small style={{ opacity: .7 }}>{message}{entry ? ` · ${new Date(entry.updatedAt).toLocaleTimeString("pt-BR")}` : ""}</small>
  </div>
}

export function EcosystemAccess({ appId, ownThemeControl = false }: { appId: MatrizAppId; ownThemeControl?: boolean }) {
  const apps = Object.entries(monorepoConfig.baseUrls).map(([id, href]) => ({ id, href, label: labels[id as MatrizAppId] }))
  return <EcosystemBar currentAppId={appId} apps={apps} themeControl={ownThemeControl ? undefined : <ThemeToggle appId={appId} />} cacheControl={<CacheProof appId={appId} />} />
}
