import { FormEvent, useEffect, useMemo, useState } from "react"
import type { AgentPolicy, BrowserSnapshot, StoreProductView, TerminalSessionView } from "../shared"

export function App() {
  const [snapshot, setSnapshot] = useState<BrowserSnapshot>()
  const [address, setAddress] = useState("")
  const [side, setSide] = useState<"none" | "store" | "workbench">("none")
  const [terminal, setTerminal] = useState(false)
  const [error, setError] = useState("")
  const [creatingCapsule, setCreatingCapsule] = useState(false)
  const [capsuleName, setCapsuleName] = useState("")
  const [capsulePolicy, setCapsulePolicy] = useState<AgentPolicy>("human")
  const [terminals, setTerminals] = useState<readonly TerminalSessionView[]>([])
  const [activeTerminalId, setActiveTerminalId] = useState("")
  const [terminalInput, setTerminalInput] = useState("")
  const [store, setStore] = useState<readonly StoreProductView[]>([])
  const [storeStatus, setStoreStatus] = useState("Abra o Matriz Hub para carregar o catálogo.")
  const [killSwitch, setKillSwitch] = useState(false)
  const activeTab = useMemo(() => snapshot?.tabs.find((tab) => tab.id === snapshot.activeTabId), [snapshot])
  const activeTerminal = terminals.find(({ id }) => id === activeTerminalId) ?? terminals.at(-1)

  useEffect(() => {
    window.naevia.snapshot().then(setSnapshot).catch((cause) => setError(String(cause)))
    return window.naevia.subscribe(setSnapshot)
  }, [])
  useEffect(() => { if (activeTab) setAddress(activeTab.url) }, [activeTab])
  useEffect(() => {
    window.naevia.terminalSessions().then(setTerminals).catch((cause) => setError(String(cause)))
    return window.naevia.subscribeTerminals(setTerminals)
  }, [])

  const navigate = async (event: FormEvent) => {
    event.preventDefault(); if (!activeTab) return
    setError("")
    try { setSnapshot(await window.naevia.navigate(activeTab.id, address)) } catch (cause) { setError(String(cause)) }
  }
  const panels = async (nextSide: typeof side, nextTerminal = terminal) => {
    setSide(nextSide); setTerminal(nextTerminal); setError("")
    try { await window.naevia.setPanels({ side: nextSide, terminal: nextTerminal }) } catch (cause) { setError(String(cause)) }
  }
  const loadStore = async () => {
    setStoreStatus("Carregando catálogo real…")
    try { const products = await window.naevia.storeCatalog(); setStore(products); setStoreStatus(`${products.length} produtos publicados pelo Matriz Hub.`) } catch { setStore([]); setStoreStatus("Matriz Hub indisponível. Nenhuma instalação foi simulada.") }
  }
  const createCapsule = async (event: FormEvent) => {
    event.preventDefault(); setError("")
    try {
      setSnapshot(await window.naevia.createCapsule(capsuleName, capsulePolicy))
      setCapsuleName(""); setCreatingCapsule(false)
    } catch (cause) { setError(String(cause)) }
  }
  const createTerminal = async () => {
    setError("")
    try { const next = await window.naevia.createTerminal(); setTerminals(next); setActiveTerminalId(next.at(-1)?.id ?? "") } catch (cause) { setError(String(cause)) }
  }
  const sendTerminal = async (event: FormEvent) => {
    event.preventDefault(); if (!activeTerminal || !terminalInput) return
    try { await window.naevia.writeTerminal(activeTerminal.id, `${terminalInput}\n`); setTerminalInput("") } catch (cause) { setError(String(cause)) }
  }
  const controlBrowser = async (command: "back" | "forward" | "reload" | "stop" | "devtools") => {
    if (!activeTab) return
    try { await window.naevia.browserCommand(activeTab.id, command) } catch (cause) { setError(String(cause)) }
  }

  return <main className="browser-shell">
    <header className="chrome">
      <div className="brand" aria-label="NAEVIA"><span>N</span><strong>NAEVIA</strong></div>
      <div className="tabs" role="tablist" aria-label="Abas">
        {snapshot?.tabs.filter((tab) => tab.capsuleId === snapshot.activeCapsuleId).map((tab) => <div className={`tab-item ${tab.active ? "active" : ""}`} role="tab" aria-selected={tab.active} key={tab.id}><button className="tab-main" onClick={() => void window.naevia.activateTab(tab.id).then(setSnapshot)}><i>{tab.loading ? "◌" : "●"}</i>{tab.title}</button><button className="tab-close" aria-label={`Fechar ${tab.title}`} onClick={() => void window.naevia.closeTab(tab.id).then(setSnapshot).catch((cause) => setError(String(cause)))}>×</button></div>)}
        <button className="new-tab" aria-label="Nova aba" onClick={() => snapshot && void window.naevia.createTab(snapshot.activeCapsuleId).then(setSnapshot)}>＋</button>
      </div>
      <div className="nav-controls"><button aria-label="Voltar" onClick={() => void controlBrowser("back")}>←</button><button aria-label="Avançar" onClick={() => void controlBrowser("forward")}>→</button><button aria-label={activeTab?.loading ? "Parar" : "Recarregar"} onClick={() => void controlBrowser(activeTab?.loading ? "stop" : "reload")}>{activeTab?.loading ? "×" : "↻"}</button></div>
      <form className="omnibox" onSubmit={navigate}>
        <span>⌕</span><input aria-label="Pesquisar ou digitar endereço" value={address} onChange={(event) => setAddress(event.target.value)} spellCheck={false} /><kbd>↵</kbd>
      </form>
    </header>

    <nav className="rail" aria-label="Cápsulas e ferramentas">
      <div className="capsules">
        {snapshot?.capsules.map((capsule) => <button key={capsule.id} className={capsule.id === snapshot.activeCapsuleId ? "active" : ""} title={`${capsule.name} · ${capsule.policy}`} aria-label={capsule.name} onClick={() => void window.naevia.activateCapsule(capsule.id).then(setSnapshot).catch((cause) => setError(String(cause)))}><span>{capsule.name.slice(0, 1).toUpperCase()}</span><em>{capsule.name}</em></button>)}
        <button title="Nova cápsula" aria-label="Nova cápsula" onClick={() => setCreatingCapsule(true)}><span>＋</span><em>Nova cápsula</em></button>
      </div>
      <div className="tools">
        <button className={killSwitch ? "active danger" : ""} title="Kill switch" aria-label="Kill switch" onClick={() => void window.naevia.setKillSwitch(!killSwitch).then(setKillSwitch).catch((cause) => setError(String(cause)))}><span>⊘</span><em>{killSwitch ? "Reconectar" : "Kill switch"}</em></button>
        <button title="DevTools" aria-label="DevTools" onClick={() => void controlBrowser("devtools")}><span>⌘</span><em>DevTools</em></button>
        <button className={side === "workbench" ? "active" : ""} title="Coworking" aria-label="Coworking" onClick={() => void panels(side === "workbench" ? "none" : "workbench")}><span>✦</span><em>Coworking</em></button>
        <button className={side === "store" ? "active" : ""} title="Store" aria-label="Store" onClick={() => { const next = side === "store" ? "none" : "store"; void panels(next); if (next === "store") void loadStore() }}><span>◇</span><em>Store</em></button>
        <button className={terminal ? "active" : ""} title="Terminal" aria-label="Terminal" onClick={() => void panels(side, !terminal)}><span>›_</span><em>Terminal</em></button>
      </div>
    </nav>

    {side !== "none" ? <aside className="side-panel"><span>PAINEL / {side.toUpperCase()}</span><h2>{side === "store" ? "Matriz Store" : "Coworking"}</h2>{side === "store" ? <><p>{storeStatus}</p><div className="store-products">{store.map((product) => <article key={product.productId}><div><strong>{product.name}</strong><small>{product.edition} · {product.version ?? "sem release"}</small></div><i className={product.state}>{product.state}</i></article>)}</div><button onClick={() => void loadStore()}>Atualizar catálogo</button><small className="panel-note">Instalações e atualizações permanecem sob autoridade do Matriz Control.</small></> : <><p>Carregando a superfície <code>workbench-control-v1</code> do runtime local confiável.</p><small className="panel-note">Inicie o Workbench no Control caso a superfície esteja indisponível.</small></>}<button onClick={() => void panels("none")}>Fechar</button></aside> : null}
    {terminal ? <section className="terminal-drawer"><header><span>TERMINAL</span><nav>{terminals.map((session, index) => <button className={session.id === activeTerminal?.id ? "active" : ""} key={session.id} onClick={() => setActiveTerminalId(session.id)}>PS {index + 1}<i>{session.status}</i></button>)}<button aria-label="Nova sessão" onClick={() => void createTerminal()}>＋</button></nav><button onClick={() => void panels(side, false)}>Fechar</button></header>{activeTerminal ? <div className="terminal-session"><div className="terminal-meta"><span>PowerShell · pid {activeTerminal.pid} · {activeTerminal.status}</span><span>{activeTerminal.status === "running" ? <button onClick={() => void window.naevia.interruptTerminal(activeTerminal.id).catch((cause) => setError(String(cause)))}>Interromper</button> : null}<button onClick={() => void window.naevia.closeTerminal(activeTerminal.id).then(setTerminals).catch((cause) => setError(String(cause)))}>Encerrar</button></span></div><pre>{activeTerminal.lines.join("\n") || "PowerShell pronto."}</pre><form onSubmit={sendTerminal}><span>›</span><input aria-label="Entrada do terminal" value={terminalInput} onChange={(event) => setTerminalInput(event.target.value)} disabled={activeTerminal.status !== "running"} autoComplete="off" /><button disabled={activeTerminal.status !== "running"}>Enviar</button></form></div> : <div className="terminal-empty"><i>›_</i><p>Nenhuma sessão aberta.</p><small>O NAEVIA nunca cria ou executa comandos automaticamente.</small><button onClick={() => void createTerminal()}>Nova sessão PowerShell</button></div>}</section> : null}
    {creatingCapsule ? <div className="dialog-backdrop" role="presentation"><form className="capsule-dialog" aria-label="Criar cápsula" onSubmit={createCapsule}><span>CÁPSULA / NOVA</span><h2>Novo espaço isolado</h2><label>Nome<input autoFocus value={capsuleName} maxLength={50} onChange={(event) => setCapsuleName(event.target.value)} /></label><label>Política<select value={capsulePolicy} onChange={(event) => setCapsulePolicy(event.target.value as AgentPolicy)}><option value="human">Humana</option><option value="agent-safe">Agente seguro</option><option value="agent-full">Agente completo</option></select></label><small>Cada cápsula usa uma partição persistente separada.</small><footer><button type="button" onClick={() => setCreatingCapsule(false)}>Cancelar</button><button type="submit">Criar cápsula</button></footer></form></div> : null}
    {error ? <div className="error" role="alert">{error}</div> : null}
  </main>
}
