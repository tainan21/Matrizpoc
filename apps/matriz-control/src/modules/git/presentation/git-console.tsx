"use client"

import { useCallback, useEffect, useState } from "react"
import type { GitBranch } from "../integration/git-cli-repository"
import type { GitOverviewViewModel } from "./git-presenter"
import styles from "../../../../app/git/git.module.css"

interface GitResponse { readonly overview: GitOverviewViewModel; readonly branches: readonly GitBranch[] }
type GitResult = GitResponse | { readonly error: string }

export function GitConsole({ initial }: { readonly initial: GitResponse | null }) {
  const [data, setData] = useState<GitResponse | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [branchName, setBranchName] = useState("")
  const refresh = useCallback(async () => {
    const response = await fetch("/api/git", { cache: "no-store" })
    const body = await response.json() as GitResult
    if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Git indisponível")
    setData(body)
  }, [])
  useEffect(() => { if (!initial) void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Git indisponível")) }, [initial, refresh])
  const action = async (payload: Record<string, unknown>) => {
    setError(null)
    const response = await fetch("/api/git", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
    const body = await response.json() as GitResult
    if (!response.ok || "error" in body) { setError("error" in body ? body.error : "Falha na ação Git"); return }
    setData(body); setMessage(""); setBranchName("")
  }
  if (!data) return <main className={styles.page}><p>{error ?? "Carregando Git…"}</p></main>
  const { overview, branches } = data
  return <main className={styles.page}>
    <header className={styles.header}><div><span>GIT / REPOSITÓRIO</span><h1>Matriz Control</h1><p>Estado real do workspace configurado.</p></div><div className={styles.branch}><b>{overview.branch}</b><span data-attention={overview.attention}>{overview.status}</span><small>↑ {overview.ahead} · ↓ {overview.behind}</small></div></header>
    <nav className={styles.tabs} aria-label="Áreas do Git"><b>Visão geral</b><span>Changes {overview.changeTotal}</span><span>Branches {branches.length}</span><button onClick={() => void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Git indisponível"))}>Atualizar</button></nav>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <section className={styles.workspace}>
      <div className={styles.summary}><article><small>HEAD</small><strong>{overview.head}</strong><span>{overview.subject}</span></article><article><small>MUDANÇAS</small><strong>{overview.changeTotal}</strong><span>{overview.status}</span></article><article><small>SINCRONIZAÇÃO</small><strong>{overview.ahead} / {overview.behind}</strong><span>ahead / behind</span></article></div>
      <div className={styles.changes}><header><div><span>WORKING TREE</span><strong>{overview.changeTotal} arquivos</strong></div><button disabled={!overview.changes.length} onClick={() => void action({ action: "stage", paths: overview.changes.map((change) => change.path) })}>Stage all</button></header>{overview.changes.length ? overview.changes.map((change) => <article key={change.path}><code>{change.path}</code><span>{change.staged ? `staged · ${change.staged}` : ""}</span><div><button onClick={() => void action({ action: change.staged ? "unstage" : "stage", paths: [change.path] })}>{change.staged ? "Unstage" : "Stage"}</button><b>{change.unstaged ?? "—"}</b></div></article>) : <p>Working tree limpo. Nenhuma ação necessária.</p>}</div>
      <aside className={styles.inspector}><span>BRANCHES</span><h2>{overview.branch}</h2><div className={styles.branchList}>{branches.map((branch) => <button key={branch.name} data-current={branch.current || undefined} onClick={() => !branch.current && void action({ action: "switch-branch", name: branch.name })}><b>{branch.name}</b><small>↑{branch.ahead} ↓{branch.behind}</small></button>)}</div><form onSubmit={(event) => { event.preventDefault(); if (branchName.trim()) void action({ action: "create-branch", name: branchName.trim(), checkout: true }) }}><label>Nova branch<input value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder="feat/nova-capacidade" /></label><button>Criar e trocar</button></form><form onSubmit={(event) => { event.preventDefault(); if (message.trim()) void action({ action: "commit", message }) }}><label>Commit<input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="feat: descreva a mudança" /></label><button disabled={!message.trim()}>Commit</button></form></aside>
    </section>
  </main>
}
