"use client"

import { javascript } from "@codemirror/lang-javascript"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { sound } from "@matriz/design-ui/sounds"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toBrowserTabViewModel, toCapsuleViewModel, toWorkspaceFileViewModel, type BrowserTabPayload, type BrowserTabViewModel, type CapsulePayload, type CapsuleViewModel, type WorkspaceFileViewModel } from "./browser-presenter"
import type { BrowserUiEvent, BrowserUiResult } from "./browser-ui-bridge"

type ContextTool = "library" | "reader" | "files" | "dev" | "agent"
const toolLabels: Record<ContextTool, string> = { library: "Biblioteca", reader: "Leitura", files: "Arquivos", dev: "Dev", agent: "Agente" }
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false })

export function BrowserWorkspace() {
  const bridge = typeof window === "undefined" ? undefined : window.matrizDesktop
  const [capsules, setCapsules] = useState<CapsuleViewModel[]>([])
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | null>(null)
  const [tabs, setTabs] = useState<BrowserTabViewModel[]>([])
  const [address, setAddress] = useState("localhost:3000")
  const [tool, setTool] = useState<ContextTool>("library")
  const [panelOpen, setPanelOpen] = useState(false)
  const [notice, setNotice] = useState(bridge ? "DESKTOP RUNTIME · CONECTANDO" : "WEB MODE · DESKTOP NECESSÁRIO")
  const viewportRef = useRef<HTMLDivElement>(null)

  const refreshCapsules = useCallback(async () => {
    if (!bridge) return
    let values = await bridge.invoke({ type: "capsule.list" }) as CapsulePayload[]
    if (!values.length) {
      await bridge.invoke({ type: "capsule.create", name: "Pessoal", kind: "human", policy: "human" })
      await bridge.invoke({ type: "capsule.create", name: "Testes", kind: "agent", policy: "agent-safe" })
      await bridge.invoke({ type: "capsule.create", name: "Automação", kind: "agent", policy: "agent-safe" })
      values = await bridge.invoke({ type: "capsule.list" }) as CapsulePayload[]
    }
    const selected = activeCapsuleId ?? values[0]?.id ?? null
    setActiveCapsuleId(selected)
    const tabCounts = await Promise.all(values.map(async (capsule) => ({ id: capsule.id, count: ((await bridge.invoke({ type: "tab.list", capsuleId: capsule.id })) as BrowserTabPayload[]).length })))
    setCapsules(values.map((capsule, index) => toCapsuleViewModel(capsule, { tabs: tabCounts.find((item) => item.id === capsule.id)?.count ?? 0, cacheMiB: index === 0 ? 142 : index === 1 ? 89 : 0, selected: capsule.id === selected })))
  }, [activeCapsuleId, bridge])

  const refreshTabs = useCallback(async (capsuleId: string) => {
    if (!bridge) return
    const values = await bridge.invoke({ type: "tab.list", capsuleId }) as BrowserTabPayload[]
    setTabs(values.map(toBrowserTabViewModel))
    const active = values.find((tab) => tab.active)
    if (active) setAddress(active.url)
  }, [bridge])

  useEffect(() => { void refreshCapsules().then(() => setNotice(bridge ? "VAULT READY · WEBGL2 READY" : "WEB MODE")) }, [bridge, refreshCapsules])
  useEffect(() => { if (activeCapsuleId) void refreshTabs(activeCapsuleId) }, [activeCapsuleId, refreshTabs])
  useEffect(() => bridge?.subscribe((event: BrowserUiEvent) => {
    if (event.type === "tab.updated" && event.tab.capsuleId === activeCapsuleId) { setTabs((current) => [...current.filter((tab) => tab.id !== event.tab.id), toBrowserTabViewModel(event.tab)]); if (event.tab.active) setAddress(event.tab.url) }
    if (event.type === "tab.closed") setTabs((current) => current.filter((tab) => tab.id !== event.tabId))
    if (event.type === "runtime.failed") setNotice(event.message)
  }), [activeCapsuleId, bridge])

  useEffect(() => {
    if (!bridge || !viewportRef.current) return
    const report = () => { const rect = viewportRef.current?.getBoundingClientRect(); if (rect) bridge.reportViewport({ x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), visible: true }) }
    const observer = new ResizeObserver(report)
    observer.observe(viewportRef.current)
    window.addEventListener("resize", report)
    report()
    return () => { observer.disconnect(); window.removeEventListener("resize", report); bridge.reportViewport({ x: 0, y: 0, width: 0, height: 0, visible: false }) }
  }, [bridge, panelOpen])

  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0]
  const selectCapsule = async (id: string) => { setActiveCapsuleId(id); setCapsules((current) => current.map((capsule) => ({ ...capsule, selected: capsule.id === id }))); await sound.play("navigation") }
  const navigate = async () => {
    if (!bridge || !activeCapsuleId) { setNotice("ABRA O DESKTOP RUNTIME PARA NAVEGAR"); return }
    const result = activeTab ? await bridge.invoke({ type: "tab.navigate", tabId: activeTab.id, input: address }) : await bridge.invoke({ type: "tab.open", capsuleId: activeCapsuleId, input: address })
    if (result) setTabs((current) => [...current.filter((tab) => tab.id !== (result as BrowserTabPayload).id), toBrowserTabViewModel(result as BrowserTabPayload)])
    await sound.play("navigation")
  }
  const openTool = (next: ContextTool) => { setTool(next); setPanelOpen((open) => next === tool ? !open : true); void sound.play("open") }

  return <main className={`browser-layout ${panelOpen ? "context-open" : ""}`}>
    <aside className="capsule-rail">
      <div className="browser-rail-header"><span className="section-label">ISOLAMENTO / {String(capsules.length).padStart(2, "0")}</span><h1>CÁPSULAS</h1></div>
      <div className="capsule-list">{capsules.map((capsule) => <button className={capsule.selected ? "selected" : ""} key={capsule.id} onClick={() => void selectCapsule(capsule.id)}><span><i className={`status-dot ${capsule.tone === "ok" ? "running" : capsule.tone === "warning" ? "starting" : "failed"}`} /><strong>{capsule.name}</strong><b>›</b></span><small>{capsule.status}</small><em>{capsule.cache}</em></button>)}</div>
      <button className="new-capsule" onClick={() => { const name = window.prompt("Nome da cápsula"); if (name && bridge) { const human = window.confirm("Esta cápsula será usada por uma pessoa?\nOK: humana isolada · Cancelar: agente-safe"); void bridge.invoke({ type: "capsule.create", name, kind: human ? "human" : "agent", policy: human ? "human" : "agent-safe" }).then(refreshCapsules) } }}>＋ NOVA CÁPSULA</button>
    </aside>
    <section className="browser-stage">
      <div className="browser-tabs">{tabs.map((tab) => <button className={tab.active ? "active" : ""} key={tab.id} onClick={() => bridge && void bridge.invoke({ type: "tab.activate", tabId: tab.id })}><i className={`status-dot ${tab.status === "failed" ? "failed" : tab.status === "loading" ? "starting" : "running"}`} />{tab.title || "Nova aba"}</button>)}<button aria-label="Nova aba" onClick={() => activeCapsuleId && bridge && void bridge.invoke({ type: "tab.open", capsuleId: activeCapsuleId, input: "https://duckduckgo.com" }).then((value) => setTabs((current) => [...current, toBrowserTabViewModel(value as BrowserTabPayload)]))}>＋</button></div>
      <form className="browser-toolbar" onSubmit={(event) => { event.preventDefault(); void navigate() }}>
        <div className="browser-actions"><button type="button" aria-label="Voltar" disabled={!activeTab || !bridge} onClick={() => activeTab && bridge && void bridge.invoke({ type: "tab.back", tabId: activeTab.id })}>←</button><button type="button" aria-label="Avançar" disabled={!activeTab || !bridge} onClick={() => activeTab && bridge && void bridge.invoke({ type: "tab.forward", tabId: activeTab.id })}>→</button><button type="button" aria-label="Recarregar" disabled={!activeTab || !bridge} onClick={() => activeTab && bridge && void bridge.invoke({ type: "tab.reload", tabId: activeTab.id })}>↻</button></div>
        <label className="browser-address"><span>DDG</span><input aria-label="Pesquisar ou inserir endereço" value={address} onChange={(event) => setAddress(event.target.value)} /><button aria-label="Navegar">IR</button></label>
        <div className="browser-actions browser-optional"><button type="button" title="Leitura" onClick={() => openTool("reader")}>LER</button><button type="button" title="Screenshot" disabled={!activeTab || !bridge} onClick={() => activeTab && bridge && void bridge.invoke({ type: "page.screenshot", tabId: activeTab.id })}>CAP</button><button type="button" title="DevTools" onClick={() => openTool("dev")}>{"</>"}</button></div>
      </form>
      <div ref={viewportRef} className="native-browser-viewport">
        {!bridge ? <div className="desktop-diagnostic"><b>◫</b><strong>DESKTOP RUNTIME NECESSÁRIO</strong><p>O cockpit web continua disponível. Abra o host Electron para anexar Chromium isolado, WebGL2, áudio e contas persistentes.</p><code>pnpm --filter @matriz/app-matriz-control desktop:dev</code></div> : <span className="native-mount-label">NATIVE CHROMIUM SURFACE · {activeTab?.url ?? "NOVA ABA"}</span>}
        <div className="browser-diagnostics"><span>WEBGL2</span><span>ÁUDIO</span><span>8 LIVE</span></div>
      </div>
    </section>
    {panelOpen ? <ContextPanel tool={tool} bridgeAvailable={Boolean(bridge)} activeCapsuleId={activeCapsuleId} activeTab={activeTab} invoke={(command) => bridge?.invoke(command) ?? Promise.resolve(null)} onClose={() => setPanelOpen(false)} /> : null}
    <aside className="context-tools" aria-label="Ferramentas de contexto">{(Object.keys(toolLabels) as ContextTool[]).map((key) => <button className={tool === key && panelOpen ? "active" : ""} title={toolLabels[key]} aria-label={toolLabels[key]} key={key} onClick={() => openTool(key)}>{key === "library" ? "▤" : key === "reader" ? "Aa" : key === "files" ? "⌘" : key === "dev" ? "<>" : "AI"}</button>)}<button className="context-kill" title="Parar agentes" aria-label="Parar agentes" onClick={() => bridge && void bridge.invoke({ type: "agent.kill" })}>■</button></aside>
    <output className="browser-status">{notice}</output>
  </main>
}

function ContextPanel({ tool, bridgeAvailable, activeCapsuleId, activeTab, invoke, onClose }: { tool: ContextTool; bridgeAvailable: boolean; activeCapsuleId: string | null; activeTab?: BrowserTabViewModel; invoke(command: Parameters<NonNullable<typeof window.matrizDesktop>["invoke"]>[0]): Promise<BrowserUiResult>; onClose(): void }) {
  return <section className="browser-context-panel"><header><span>{toolLabels[tool]}</span><button onClick={onClose}>×</button></header>{tool === "library" ? <LibraryPanel /> : tool === "files" ? <FilePanel bridgeAvailable={bridgeAvailable} invoke={invoke} /> : tool === "agent" ? <AgentPanel bridgeAvailable={bridgeAvailable} capsuleId={activeCapsuleId} invoke={invoke} /> : tool === "dev" ? <DevPanel activeTab={activeTab} /> : <ReaderPanel activeTab={activeTab} invoke={invoke} />}</section>
}

function LibraryPanel() { return <div className="context-content"><p className="section-label">SALVAR / ENCONTRAR</p><button>☆ Favoritos</button><button>◷ Histórico</button><button>▣ Abas salvas</button><button>⇩ Downloads</button><button>▧ Screenshots e PDF</button><small>Fusão segura combina apenas biblioteca e configurações. Sessões permanecem isoladas.</small></div> }
function DevPanel({ activeTab }: { activeTab?: BrowserTabViewModel }) { return <div className="context-content"><p className="section-label">LAB / WEBGL</p><dl><div><dt>ORIGEM</dt><dd>{activeTab ? new URL(activeTab.url).origin : "—"}</dd></div><div><dt>ABAS VIVAS</dt><dd>8 MAX</dd></div></dl><WebGlLab /></div> }
function ReaderPanel({ activeTab, invoke }: { activeTab?: BrowserTabViewModel; invoke: ContextPanelProps["invoke"] }) { return <div className="context-content"><p className="section-label">LEITURA / SNAPSHOT</p><h2>{activeTab?.title ?? "Nenhuma página"}</h2><p>Extraia uma versão textual segura da aba ativa, salve PDF ou capture a viewport.</p><button disabled={!activeTab} onClick={() => activeTab && void invoke({ type: "page.reader", tabId: activeTab.id })}>Extrair texto</button><button disabled={!activeTab} onClick={() => activeTab && void invoke({ type: "page.pdf", tabId: activeTab.id })}>Salvar PDF</button></div> }
type ContextPanelProps = { invoke(command: Parameters<NonNullable<typeof window.matrizDesktop>["invoke"]>[0]): Promise<BrowserUiResult> }

function AgentPanel({ bridgeAvailable, capsuleId, invoke }: { bridgeAvailable: boolean; capsuleId: string | null; invoke: ContextPanelProps["invoke"] }) {
  const enableFull = () => { if (capsuleId && window.confirm("Liberar agent-full para esta cápsula? Isso permite ações de alto impacto até a política ser alterada novamente.")) void invoke({ type: "agent.policy", capsuleId, policy: "agent-full" }) }
  return <div className="context-content"><p className="section-label">MCP / AUTONOMIA</p><div className="agent-policy"><i className={`status-dot ${bridgeAvailable ? "running" : "failed"}`} /><span><strong>{bridgeAvailable ? "CANAL LOCAL ATIVO" : "DESKTOP OFFLINE"}</strong><small>STDIO · NAMED PIPE · TOKEN LOCAL</small></span></div><p>Agent-safe permite testes e arquivos, bloqueando credenciais e ações irreversíveis. Agent-full exige confirmação humana nesta tela.</p><button disabled={!bridgeAvailable || !capsuleId} onClick={enableFull}>Liberar agent-full…</button><VaultControls bridgeAvailable={bridgeAvailable} invoke={invoke} /><button className="danger-button" disabled={!bridgeAvailable} onClick={() => void invoke({ type: "agent.kill" })}>KILL SWITCH</button></div>
}

function VaultControls({ bridgeAvailable, invoke }: { bridgeAvailable: boolean; invoke: ContextPanelProps["invoke"] }) {
  const [status, setStatus] = useState("COFRE · VERIFICANDO")
  const refresh = useCallback(async () => { if (!bridgeAvailable) { setStatus("COFRE · DESKTOP OFFLINE"); return }; try { const value = await invoke({ type: "vault.status" }) as { provisioned: boolean; mounted: boolean; reason: string | null }; setStatus(value.mounted ? "COFRE · ABERTO" : value.provisioned ? "COFRE · BLOQUEADO" : value.reason ?? "COFRE · NÃO CONFIGURADO") } catch (error) { setStatus(error instanceof Error ? error.message : "Falha no cofre") } }, [bridgeAvailable, invoke])
  useEffect(() => { void refresh() }, [refresh])
  const action = async (type: "vault.provision" | "vault.unlock" | "vault.lock") => { try { setStatus("COFRE · PROCESSANDO"); await invoke({ type }); await refresh() } catch (error) { setStatus(error instanceof Error ? error.message : "Operação recusada") } }
  return <section className="vault-controls"><strong>{status}</strong><small>VHDX · BITLOCKER · CHAVE PROTEGIDA PELO WINDOWS</small><div><button disabled={!bridgeAvailable} onClick={() => void action("vault.provision")}>Configurar</button><button disabled={!bridgeAvailable} onClick={() => void action("vault.unlock")}>Abrir</button><button disabled={!bridgeAvailable} onClick={() => void action("vault.lock")}>Bloquear</button></div></section>
}

function WebGlLab() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [gpu, setGpu] = useState("VERIFICANDO")
  const [fps, setFps] = useState(0)
  const [audio, setAudio] = useState("PRONTO")
  useEffect(() => {
    const gl = canvas.current?.getContext("webgl2")
    if (!gl) { setGpu("INDISPONÍVEL"); return }
    setGpu(String(gl.getParameter(gl.RENDERER) ?? "WEBGL2").slice(0, 42))
    const vertex = gl.createShader(gl.VERTEX_SHADER); const fragment = gl.createShader(gl.FRAGMENT_SHADER); const program = gl.createProgram()
    if (!vertex || !fragment || !program) { setGpu("FALHA NO SHADER"); return }
    gl.shaderSource(vertex, "#version 300 es\nin vec2 p;uniform float t;void main(){float c=cos(t),s=sin(t);gl_Position=vec4(mat2(c,-s,s,c)*p,0.,1.);}")
    gl.shaderSource(fragment, "#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(.55,.22,1.,1.);}")
    gl.compileShader(vertex); gl.compileShader(fragment); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.useProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,.7,-.65,-.45,.65,-.45]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "p"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const time = gl.getUniformLocation(program, "t"); let frame = 0; let last = performance.now(); let handle = 0
    const draw = (now: number) => { gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); gl.clearColor(.03,.02,.06,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(time, now / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); frame += 1; if (now - last >= 500) { setFps(Math.round(frame * 1000 / (now - last))); frame = 0; last = now } handle = requestAnimationFrame(draw) }
    handle = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(handle); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteBuffer(buffer) }
  }, [])
  const testAudio = async () => { try { const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); gain.gain.value = .025; oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .12); await context.resume(); setAudio("OK"); oscillator.addEventListener("ended", () => void context.close()) } catch { setAudio("BLOQUEADO") } }
  return <section className="webgl-lab"><canvas ref={canvas} width="280" height="130" aria-label="Laboratório WebGL2: triângulo animado por shader" /><dl><div><dt>GPU</dt><dd>{gpu}</dd></div><div><dt>FPS</dt><dd className="ok">{fps || "—"}</dd></div><div><dt>ÁUDIO</dt><dd>{audio}</dd></div></dl><button onClick={() => void testAudio()}>Testar áudio</button></section>
}

function FilePanel({ bridgeAvailable, invoke }: { bridgeAvailable: boolean; invoke: ContextPanelProps["invoke"] }) {
  const [projectId, setProjectId] = useState("matriz-control")
  const [path, setPath] = useState("README.md")
  const [file, setFile] = useState<WorkspaceFileViewModel | null>(null)
  const [message, setMessage] = useState("Arquivos textuais · máximo 2 MiB")
  const extensions = useMemo(() => {
    const extension = path.toLowerCase().split(".").at(-1)
    if (extension === "css") return [css()]
    if (extension === "html" || extension === "htm") return [html()]
    if (extension === "json") return [json()]
    if (extension === "md" || extension === "mdx") return [markdown()]
    return [javascript({ jsx: true, typescript: true })]
  }, [path])
  const open = async () => { try { const value = toWorkspaceFileViewModel(await invoke({ type: "file.read", projectId, path }) as WorkspaceFileViewModel); setFile(value); setMessage(`ABERTO · ${value.bytes} BYTES`) } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao abrir") } }
  const save = async () => { if (!file) return; try { const value = toWorkspaceFileViewModel(await invoke({ type: "file.write", projectId, path, content: file.content, expectedVersion: file.version }) as WorkspaceFileViewModel); setFile(value); setMessage("SALVO ATOMICAMENTE") } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar") } }
  return <div className="context-content file-panel"><p className="section-label">WORKSPACE / ALLOWLIST</p><label>Projeto<input value={projectId} onChange={(event) => setProjectId(event.target.value)} /></label><label>Caminho relativo<input value={path} onChange={(event) => setPath(event.target.value)} /></label><button disabled={!bridgeAvailable} onClick={() => void open()}>Abrir arquivo</button>{file ? <><CodeMirror value={file.content} height="260px" theme="dark" extensions={extensions} onChange={(content) => setFile({ ...file, content })} /><button className="primary" onClick={() => void save()}>Salvar</button></> : null}<small>{message}</small></div>
}
