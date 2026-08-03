import Link from "next/link"
import {
  acceptInboxItemAction,
  discardInboxItemAction,
  triageInboxItemAction,
} from "../../../actions"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"
import { QuickInboxCapture } from "../../../../src/ui/components/quick-inbox-capture"
import { toInboxItemViewModel } from "../../../../src/ui/presenters/adaptive-work-presenter"

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ item?: string; status?: string }> }) {
  const query = await searchParams
  const repository = await WorkspaceRepository.create()
  const [items, projects] = await Promise.all([repository.listInboxItems(), repository.discoverProjects()])
  const viewModels = items.map(toInboxItemViewModel)
  const visible = query.status ? viewModels.filter((item) => item.status === query.status) : viewModels
  const selected = viewModels.find((item) => item.id === query.item) ?? visible.find((item) => !item.decision) ?? visible[0]
  const initializedProjects = projects.filter((project) => project.initialized && !project.corrupted)
  const selectedProjectItems = selected?.suggestedProjectId
    ? await repository.listWorkItems(selected.suggestedProjectId).catch(() => [])
    : []
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">Curadoria antes do compromisso</p>
          <h1>Inbox</h1>
          <p>Entradas são hipóteses. Só uma decisão humana as transforma em trabalho permanente.</p>
        </div>
        <QuickInboxCapture />
      </header>
      <section className="adaptive-summary" aria-label="Resumo da Inbox">
        <Link href="/work/inbox"><strong>{viewModels.filter((item) => item.status === "untriaged").length}</strong><span>a classificar</span></Link>
        <Link href="/work/inbox?status=triaged"><strong>{viewModels.filter((item) => item.status === "triaged").length}</strong><span>classificadas</span></Link>
        <Link href="/work/inbox?status=accepted"><strong>{viewModels.filter((item) => item.status === "accepted").length}</strong><span>aceitas</span></Link>
        <Link href="/work/inbox?status=discarded"><strong>{viewModels.filter((item) => item.status === "discarded").length}</strong><span>descartadas</span></Link>
      </section>
      <div className="adaptive-split">
        <section className="adaptive-list" aria-label="Entradas">
          {visible.map((item) => (
            <Link className={item.id === selected?.id ? "adaptive-row selected" : "adaptive-row"} href={`/work/inbox?item=${item.id}${query.status ? `&status=${query.status}` : ""}`} key={item.id}>
              <span className={`origin-mark ${item.origin}`} aria-hidden="true" />
              <span className="row-main">
                <strong>{item.title}</strong>
                <small>{item.originLabel} · {item.updatedLabel}{item.suggestedProjectId ? ` · ${item.suggestedProjectId}` : ""}</small>
              </span>
              <span className={`status-chip ${item.status}`}><i />{item.statusLabel}</span>
            </Link>
          ))}
          {!visible.length ? <div className="empty-state"><strong>Nenhuma entrada aqui.</strong><span>Capture uma frase ou remova o filtro atual.</span></div> : null}
        </section>
        <aside className="adaptive-inspector" aria-label="Refinamento da entrada">
          {selected ? (
            <>
              <div className="inspector-heading"><span>Refinamento contextual</span><code>{selected.id}</code></div>
              <h2>{selected.title}</h2>
              <p className="adaptive-lede">{selected.detail || "Ainda sem contexto adicional."}</p>
              <dl className="fact-grid">
                <div><dt>Origem</dt><dd>{selected.originLabel}</dd></div>
                <div><dt>Confiança</dt><dd>{selected.confidenceLabel ?? "—"}</dd></div>
              </dl>
              {selected.decision ? (
                <section className="decision-result">
                  <p className="eyebrow">Decisão registrada</p>
                  {selected.decision.kind === "accepted" ? <Link href={selected.decision.href}>{selected.decision.label} →</Link> : <p>{selected.decision.label}</p>}
                </section>
              ) : (
                <>
                  <form action={triageInboxItemAction} className="adaptive-form">
                    <input name="itemId" type="hidden" value={selected.id} /><input name="revision" type="hidden" value={selected.revision} />
                    <label>Título<input defaultValue={selected.title} name="title" required /></label>
                    <label>Contexto<textarea defaultValue={selected.detail} name="detail" rows={4} /></label>
                    <label>Motivo da sugestão<textarea defaultValue={selected.reason} name="reason" rows={2} /></label>
                    <div className="form-grid">
                      <label>Projeto<select defaultValue={selected.suggestedProjectId ?? ""} name="suggestedProjectId"><option value="">Não classificado</option>{initializedProjects.map((project) => <option key={project.id} value={project.id}>{project.displayName}</option>)}</select></label>
                      <label>Tipo<select defaultValue={selected.suggestedKind ?? "task"} name="suggestedKind"><option value="outcome">Outcome</option><option value="feature">Feature</option><option value="bug">Bug</option><option value="task">Task</option></select></label>
                      <label>Domínio<input defaultValue={selected.suggestedDomain ?? ""} name="suggestedDomain" /></label>
                      <label>Prioridade<select defaultValue={selected.suggestedPriority ?? "medium"} name="suggestedPriority"><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
                      <label>Grupo<input defaultValue={selected.groupKey ?? ""} name="groupKey" placeholder="chave de agrupamento" /></label>
                      <label>Duplicada de<input defaultValue={selected.duplicateOf ?? ""} name="duplicateOf" placeholder="in_…" /></label>
                    </div>
                    <button className="button" type="submit">Salvar classificação</button>
                  </form>
                  <div className="decision-actions">
                    <form action={acceptInboxItemAction} className="adaptive-form compact-form">
                      <input name="itemId" type="hidden" value={selected.id} /><input name="revision" type="hidden" value={selected.revision} />
                      <label>Projeto<select defaultValue={selected.suggestedProjectId ?? ""} name="projectId" required><option disabled value="">Escolha</option>{initializedProjects.map((project) => <option key={project.id} value={project.id}>{project.displayName}</option>)}</select></label>
                      <label>Como trabalho<select defaultValue={selected.suggestedKind ?? "task"} name="kind"><option value="outcome">Outcome</option><option value="feature">Feature</option><option value="bug">Bug</option><option value="task">Task</option></select></label>
                      <label>Outcome/Task pai<select name="parentId"><option value="">Sem pai</option>{selectedProjectItems.filter((item) => item.kind === "outcome" || item.kind === "task").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                      <input name="priority" type="hidden" value={selected.suggestedPriority ?? "medium"} />
                      <button className="button primary" type="submit">Aceitar e criar trabalho</button>
                    </form>
                    <form action={discardInboxItemAction} className="discard-form">
                      <input name="itemId" type="hidden" value={selected.id} /><input name="revision" type="hidden" value={selected.revision} />
                      <label>Motivo do descarte<input name="discardReason" placeholder="Duplicada, fora de escopo…" required /></label>
                      <button className="button" type="submit">Descartar</button>
                    </form>
                  </div>
                </>
              )}
            </>
          ) : <div className="empty-state"><strong>Inbox vazia.</strong><span>Capture uma frase; o contexto vem depois.</span></div>}
        </aside>
      </div>
    </>
  )
}
