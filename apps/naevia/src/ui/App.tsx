import { FormEvent, useEffect, useMemo, useState } from "react"
import type { BrowserSnapshot } from "../shared"

export function App() {
  const [snapshot, setSnapshot] = useState<BrowserSnapshot>()
  const [address, setAddress] = useState("")
  const [side, setSide] = useState<"none" | "store" | "workbench">("none")
  const [terminal, setTerminal] = useState(false)
  const [error, setError] = useState("")
  const activeTab = useMemo(() => snapshot?.tabs.find((tab) => tab.id === snapshot.activeTabId), [snapshot])

  useEffect(() => {
    window.naevia.snapshot().then(setSnapshot).catch((cause) => setError(String(cause)))
    return window.naevia.subscribe(setSnapshot)
  }, [])
  useEffect(() => { if (activeTab) setAddress(activeTab.url) }, [activeTab])

  const navigate = async (event: FormEvent) => {
    event.preventDefault(); if (!activeTab) return
    setError("")
    try { setSnapshot(await window.naevia.navigate(activeTab.id, address)) } catch (cause) { setError(String(cause)) }
  }
  const panels = async (nextSide: typeof side, nextTerminal = terminal) => {
    setSide(nextSide); setTerminal(nextTerminal); await window.naevia.setPanels({ side: nextSide, terminal: nextTerminal })
  }

  return <main className="browser-shell">
    <header className="chrome">
      <div className="brand" aria-label="NAEVIA"><span>N</span><strong>NAEVIA</strong></div>
      <div className="tabs" role="tablist" aria-label="Abas">
        {snapshot?.tabs.filter((tab) => tab.capsuleId === snapshot.activeCapsuleId).map((tab) => <button className={tab.active ? "active" : ""} role="tab" aria-selected={tab.active} key={tab.id} onClick={() => void window.naevia.activateTab(tab.id).then(setSnapshot)}><i>{tab.loading ? "◌" : "●"}</i>{tab.title}</button>)}
        <button className="new-tab" aria-label="Nova aba" onClick={() => snapshot && void window.naevia.createTab(snapshot.activeCapsuleId).then(setSnapshot)}>＋</button>
      </div>
      <form className="omnibox" onSubmit={navigate}>
        <span>⌕</span><input aria-label="Pesquisar ou digitar endereço" value={address} onChange={(event) => setAddress(event.target.value)} spellCheck={false} /><kbd>↵</kbd>
      </form>
    </header>

    <nav className="rail" aria-label="Cápsulas e ferramentas">
      <div className="capsules">
        {snapshot?.capsules.map((capsule) => <button key={capsule.id} className={capsule.id === snapshot.activeCapsuleId ? "active" : ""} title={`${capsule.name} · ${capsule.policy}`} aria-label={capsule.name}><span>{capsule.name.slice(0, 1).toUpperCase()}</span><em>{capsule.name}</em></button>)}
      </div>
      <div className="tools">
        <button className={side === "workbench" ? "active" : ""} title="Coworking" aria-label="Coworking" onClick={() => void panels(side === "workbench" ? "none" : "workbench")}><span>✦</span><em>Coworking</em></button>
        <button className={side === "store" ? "active" : ""} title="Store" aria-label="Store" onClick={() => void panels(side === "store" ? "none" : "store")}><span>◇</span><em>Store</em></button>
        <button className={terminal ? "active" : ""} title="Terminal" aria-label="Terminal" onClick={() => void panels(side, !terminal)}><span>›_</span><em>Terminal</em></button>
      </div>
    </nav>

    {side !== "none" ? <aside className="side-panel"><span>PAINEL / {side.toUpperCase()}</span><h2>{side === "store" ? "Matriz Store" : "Coworking"}</h2><p>{side === "store" ? "Produtos confiáveis e instalados estarão disponíveis aqui." : "O painel Workbench será conectado pelo protocolo controlado."}</p><button onClick={() => void panels("none")}>Fechar</button></aside> : null}
    {terminal ? <section className="terminal-drawer"><header><span>TERMINAL</span><button onClick={() => void panels(side, false)}>Fechar</button></header><div><i>›_</i><p>Nenhuma sessão aberta.</p><small>O NAEVIA nunca cria ou executa comandos automaticamente.</small></div></section> : null}
    {error ? <div className="error" role="alert">{error}</div> : null}
  </main>
}
