"use client"

import { useEffect, useMemo, useState } from "react"
import { CapabilityThemeController, EcosystemBar, ThemeToggle } from "@matriz/design-ui"
import { monorepoConfig } from "@matriz/platform-config"
import { createSharedCacheClient, type SharedCacheEntry } from "@matriz/platform-storage"
import type { MatrizAppId } from "@matriz/foundation-constants"

const labels: Record<MatrizAppId, string> = {
  "matriz-identity": "Matriz Identity · auth",
  "matriz-hub": "Hub · 3000", "matriz-desktop": "Matriz Control · native", spot: "Spot · 3001",
  "matriz-control": "Matriz Control · 3009",
  "matriz-admin": "Matriz Admin · 3002", seumei: "Seumei · 3008",
  contracts: "Contracts · 3003", willdash: "WillDash · 3004",
  "matriz-workbench": "Workbench · 3005", sites: "Sites · 3006", matrizlib: "MatrizLib · 3007",
  health: "Health · 3010",
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

function OrganizationThemeSuggestion({ appId }: { appId: MatrizAppId }) {
  const [suggestion, setSuggestion] = useState<string>()
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    void fetch(`${monorepoConfig.baseUrls["matriz-hub"]}/api/v1/capabilities/appearance?appId=${appId}`, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ appearance?: { suggestedThemeKey?: string } }> : undefined)
      .then((payload) => setSuggestion(payload?.appearance?.suggestedThemeKey))
      .catch(() => undefined)
  }, [appId])
  if (!suggestion || dismissed) return null
  const label = suggestion.split("-").map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ")
  return <aside aria-label="Sugestão de aparência" style={{ position: "fixed", right: 16, bottom: 16, zIndex: 50, width: "min(320px, calc(100vw - 32px))", padding: 14, display: "grid", gap: 8, background: "var(--surface, #fff)", color: "var(--text, #111)", border: "1px solid var(--line, #ddd)", boxShadow: "0 18px 50px #0003" }}>
    <strong style={{ fontSize: 13 }}>Sua organização recomenda {label}.</strong>
    <span style={{ fontSize: 12, opacity: .72 }}>Experimente sem alterar sua preferência atual.</span>
    <div style={{ display: "flex", gap: 10 }}><a href={`${monorepoConfig.baseUrls["matriz-hub"]}/settings/appearance`} style={{ color: "inherit", fontSize: 12 }}>Experimentar</a><button type="button" onClick={() => setDismissed(true)} style={{ border: 0, padding: 0, background: "transparent", color: "inherit", opacity: .65, cursor: "pointer", fontSize: 12 }}>Agora não</button></div>
  </aside>
}

export function EcosystemAccess({ appId, ownThemeControl = false }: { appId: MatrizAppId; ownThemeControl?: boolean }) {
  const apps = Object.entries(monorepoConfig.baseUrls).map(([id, href]) => ({ id, href, label: labels[id as MatrizAppId] }))
  return <><CapabilityThemeController appId={appId} hubBaseUrl={monorepoConfig.baseUrls["matriz-hub"]} /><EcosystemBar currentAppId={appId} apps={apps} themeControl={ownThemeControl ? undefined : <ThemeToggle appId={appId} />} cacheControl={<CacheProof appId={appId} />} /><OrganizationThemeSuggestion appId={appId} /></>
}
