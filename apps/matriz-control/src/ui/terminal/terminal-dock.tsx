"use client"

import { useEffect, useRef, useState } from "react"
import { useTerminal } from "./terminal-context"

export function TerminalDock() {
  const terminal = useTerminal()
  const [input, setInput] = useState("")
  const outputRef = useRef<HTMLPreElement>(null)
  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight }, [terminal.activeSession?.lines])
  if (!terminal.open) return <button className="terminal-peek" type="button" onClick={() => terminal.setOpen(true)}><span>›_</span> Terminal <kbd>Ctrl J</kbd></button>
  const session = terminal.activeSession
  const style = terminal.placement === "bottom" ? { height: terminal.bottomSize } : { width: terminal.rightSize }
  return <aside className={`terminal-dock terminal-${terminal.placement}`} style={style} aria-label="Terminal global">
    <div className="terminal-resize" role="separator" aria-orientation={terminal.placement === "bottom" ? "horizontal" : "vertical"} tabIndex={0} onKeyDown={(event) => { if (["ArrowUp", "ArrowLeft"].includes(event.key)) terminal.resize(24); if (["ArrowDown", "ArrowRight"].includes(event.key)) terminal.resize(-24) }} />
    <header className="terminal-toolbar">
      <div className="terminal-tabs">{terminal.sessions.map((item) => <button className={session?.id === item.id ? "active" : ""} key={item.id} onClick={() => terminal.setActiveSessionId(item.id)}><i className={`status-dot ${item.status}`} />{item.projectName}<small>{item.actionId}</small></button>)}</div>
      <div className="terminal-tools">
        <button title="Mover terminal" onClick={() => terminal.setPlacement(terminal.placement === "bottom" ? "right" : "bottom")}>{terminal.placement === "bottom" ? "Dock right" : "Dock bottom"}</button>
        <button title="Ocultar terminal" onClick={() => terminal.setOpen(false)}>Hide</button>
      </div>
    </header>
    {session ? <>
      <div className="terminal-meta"><span>{session.projectName} / {session.actionId}</span><span>{session.status}{session.pid ? ` · PID ${session.pid}` : ""}{session.exitCode !== null ? ` · exit ${session.exitCode}` : ""}</span><span className="terminal-actions">{["running", "starting"].includes(session.status) ? <button onClick={() => void terminal.stop(session.id)}>Stop</button> : <button onClick={() => void terminal.restart(session.id)}>Restart</button>} {!(["running", "starting", "stopping"] as string[]).includes(session.status) ? <button onClick={() => void terminal.close(session.id)}>Close</button> : null}</span></div>
      <pre ref={outputRef} className="terminal-output" tabIndex={0}>{session.lines.length ? session.lines.join("\n") : "Starting process…"}</pre>
      <form className="terminal-input" onSubmit={(event) => { event.preventDefault(); if (!input) return; void terminal.sendInput(session.id, `${input}\n`); setInput("") }}><span>$</span><input aria-label="Enviar entrada ao terminal" value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" /><button>Send</button></form>
    </> : <div className="terminal-empty"><strong>›_</strong><h2>Nenhuma sessão aberta</h2><p>Inicie um app ou abra uma sessão na página Terminal.</p></div>}
  </aside>
}
