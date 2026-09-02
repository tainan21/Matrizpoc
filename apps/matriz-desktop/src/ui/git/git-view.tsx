import { useCallback, useEffect, useMemo, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { GitDiff, GitMergePreview, GitSnapshot } from "../../domain/types"
import { Icons } from "../icons"

export function GitView({ gateway }: { readonly gateway: DesktopGateway }) {
  const [snapshot, setSnapshot] = useState<GitSnapshot>()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [diff, setDiff] = useState<GitDiff>()
  const [message, setMessage] = useState("")
  const [branchName, setBranchName] = useState("")
  const [mergePreview, setMergePreview] = useState<GitMergePreview>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    setError(undefined)
    try {
      const next = await gateway.gitSnapshot()
      setSnapshot(next)
      setSelected(new Set())
      setDiff(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Git indisponível")
    }
  }, [gateway])

  useEffect(() => { void refresh() }, [refresh])

  const selectedChanges = useMemo(
    () => snapshot?.changes.filter(({ id }) => selected.has(id)) ?? [],
    [selected, snapshot],
  )
  const canStage = selectedChanges.some(({ hasWorktreeChanges, staged }) => hasWorktreeChanges || !staged)
  const canUnstage = selectedChanges.some(({ staged }) => staged)
  const stagedCount = snapshot?.changes.filter(({ staged }) => staged).length ?? 0

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mutate = async (kind: "stage" | "unstage") => {
    if (!snapshot || !selected.size || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const request = { revision: snapshot.revision, changeIds: [...selected] }
      const next = kind === "stage"
        ? await gateway.gitStage(request)
        : await gateway.gitUnstage(request)
      setSnapshot(next)
      setSelected(new Set())
      setDiff(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A operação Git falhou")
    } finally {
      setBusy(false)
    }
  }

  const preview = async (changeId: string) => {
    if (!snapshot) return
    setError(undefined)
    try {
      setDiff(await gateway.gitDiff({ revision: snapshot.revision, changeId }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Diff indisponível")
    }
  }

  const commit = async () => {
    if (!snapshot || !message.trim() || busy) return
    setBusy(true)
    setError(undefined)
    try {
      setSnapshot(await gateway.gitCommit({ revision: snapshot.revision, message: message.trim() }))
      setMessage("")
      setSelected(new Set())
      setDiff(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Commit falhou")
    } finally {
      setBusy(false)
    }
  }

  const remote = async (action: "fetch" | "pull" | "push") => {
    if (!snapshot || busy) return
    const labels = { fetch: "buscar atualizações", pull: "receber via fast-forward", push: "enviar os commits locais" }
    if (!window.confirm(`Confirmar: ${labels[action]} em ${snapshot.upstream ?? "upstream"}?`)) return
    setBusy(true)
    setError(undefined)
    try {
      setSnapshot(await gateway.gitRemote({ revision: snapshot.revision, action }))
      setSelected(new Set())
      setDiff(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operação remota falhou")
    } finally {
      setBusy(false)
    }
  }

  const branch = async (action: "create" | "switch", name: string) => {
    if (!snapshot || busy || !name.trim()) return
    if (action === "switch" && !window.confirm(`Trocar para a branch local ${name}?`)) return
    setBusy(true)
    setError(undefined)
    try {
      setSnapshot(await gateway.gitBranch({ revision: snapshot.revision, action, name: name.trim() }))
      if (action === "create") setBranchName("")
      setSelected(new Set())
      setDiff(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operação de branch falhou")
    } finally {
      setBusy(false)
    }
  }

  const previewMerge = async (target: string) => {
    if (!snapshot || busy) return
    setBusy(true); setError(undefined)
    try { setMergePreview(await gateway.previewGitMerge(snapshot.revision, target)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Prévia de merge falhou") }
    finally { setBusy(false) }
  }

  const confirmMerge = async () => {
    if (!mergePreview || busy) return
    setBusy(true); setError(undefined)
    try { setSnapshot(await gateway.confirmGitMerge(mergePreview.confirmationToken)); setMergePreview(undefined) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Merge falhou; revise o conflito e use abortar se necessário"); await refresh() }
    finally { setBusy(false) }
  }

  const abortMerge = async () => {
    if (!snapshot || busy || !window.confirm("Abortar o merge em andamento?")) return
    setBusy(true); setError(undefined)
    try { setSnapshot(await gateway.abortGitMerge(snapshot.revision)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abortar o merge") }
    finally { setBusy(false) }
  }

  return (
    <section className="git-view" aria-labelledby="git-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">WORKSPACE / GIT SEGURO</span>
          <h1 id="git-title">GIT</h1>
          <p>Stage, unstage e commit usam somente mudanças observadas pela revisão nativa atual.</p>
        </div>
        <div className="git-head-state">
          <span>{snapshot?.ahead ?? 0} ↑</span><span>{snapshot?.behind ?? 0} ↓</span>
          <button className="round-action" aria-label="Atualizar Git" disabled={busy} onClick={() => void refresh()}><Icons.refresh /></button>
        </div>
      </div>

      <div className="git-branch">
        <span className={`status-dot ${snapshot?.changes.length ? "degraded" : "ready"}`} />
        <div><small>BRANCH ATUAL</small><strong>{snapshot?.branch ?? "Verificando…"}</strong></div>
        <b>{snapshot ? `${snapshot.changes.length} mudanças · ${stagedCount} staged` : "—"}</b>
      </div>

      <div className="git-remote-actions" aria-label="Operações remotas Git">
        <span>{snapshot?.upstream ?? "Sem upstream configurado"}</span>
        <button disabled={!snapshot?.upstream || busy} onClick={() => void remote("fetch")}>BUSCAR</button>
        <button aria-label="Receber commits" disabled={!snapshot?.upstream || !!snapshot?.changes.length || busy} onClick={() => void remote("pull")}>RECEBER FF-ONLY</button>
        <button aria-label="Enviar commits" disabled={!snapshot?.upstream || !snapshot.ahead || busy} onClick={() => void remote("push")}>ENVIAR</button>
      </div>

      {error ? <p className="git-error" role="alert">{error}</p> : null}
      <div className="git-workspace">
        <div className="git-changes" aria-label="Mudanças Git">
          <div className="git-actions">
            <button disabled={!canStage || busy} onClick={() => void mutate("stage")}>STAGE</button>
            <button disabled={!canUnstage || busy} onClick={() => void mutate("unstage")}>UNSTAGE</button>
          </div>
          {snapshot?.changes.map((change) => (
            <div className="git-change" key={change.id}>
              <input type="checkbox" aria-label={`Selecionar ${change.path}`} checked={selected.has(change.id)} onChange={() => toggle(change.id)} />
              <span className={change.staged ? "is-staged" : ""}>{change.indexStatus}{change.worktreeStatus}</span>
              <button aria-label={`Ver diff de ${change.path}`} onClick={() => void preview(change.id)}>{change.path}</button>
            </div>
          ))}
          {snapshot && !snapshot.changes.length ? <p className="area-note">Workspace limpo.</p> : null}
        </div>

        <div className="git-inspector">
          <header><strong>DIFF</strong><small>{diff?.staged ? "STAGED" : "WORKTREE"}</small></header>
          <pre>{diff?.lines.join("\n") ?? "Selecione uma mudança para inspecionar."}</pre>
          {diff?.truncated ? <small>Diff truncado pelo limite de segurança.</small> : null}
        </div>
      </div>

      <div className="git-commit">
        <input aria-label="Mensagem do commit" maxLength={200} placeholder="feat: descreva a mudança staged" value={message} onChange={(event) => setMessage(event.target.value.replace(/[\r\n]/g, ""))} />
        <button disabled={!stagedCount || !message.trim() || busy} onClick={() => void commit()}>COMMIT</button>
      </div>

      <div className="git-history" aria-label="Histórico Git">
        {snapshot?.recent.map((commit) => <div key={commit.id}><code>{commit.shortId}</code><strong>{commit.subject}</strong><small>{commit.author}</small></div>)}
      </div>
      <div className="git-reference-grid">
        <section aria-label="Branches locais">
          <strong>BRANCHES LOCAIS</strong>
          <div><input aria-label="Nova branch local" value={branchName} maxLength={120} onChange={(event) => setBranchName(event.target.value)} /><button aria-label="Criar branch" disabled={busy || !!snapshot?.changes.length || !branchName.trim()} onClick={() => void branch("create", branchName)}>CRIAR</button></div>
          {snapshot?.branches.map((item) => <div key={item.name}><code>{item.current ? "●" : "○"}</code><button disabled={busy || item.current || !!snapshot.changes.length} aria-label={`Trocar para ${item.name}`} onClick={() => void branch("switch", item.name)}>{item.name}</button><small>{item.upstream ?? "local"}</small>{!item.current ? <button disabled={busy || !!snapshot.changes.length} aria-label={`Preparar merge de ${item.name}`} onClick={() => void previewMerge(item.name)}>MERGE</button> : null}</div>)}
          <button aria-label="Abortar merge" disabled={busy} onClick={() => void abortMerge()}>ABORTAR MERGE</button>
        </section>
        <section aria-label="Reflog recente">
          <strong>REFLOG RECENTE</strong>
          {snapshot?.reflog.map((entry, index) => <div key={`${entry.shortId}-${index}`}><code>{entry.shortId}</code><span>{entry.subject}</span></div>)}
        </section>
      </div>
      {mergePreview ? <div className="infra-confirm" role="dialog" aria-label="Confirmar merge Git"><div><small>PRÉVIA OBRIGATÓRIA</small><h2>Merge de {mergePreview.target}</h2><p>{mergePreview.commits} commits · {mergePreview.changedFiles} arquivos alterados</p></div><div><button onClick={() => setMergePreview(undefined)}>CANCELAR</button><button aria-label="Confirmar merge" onClick={() => void confirmMerge()}>CONFIRMAR</button></div></div> : null}
      <p className="area-note">Sem discard, stash, rebase, force-push ou reset destrutivo.</p>
    </section>
  )
}
