import Link from "next/link"
import type { DeliveryEvidenceViewModel } from "../presenters/delivery-evidence-presenter"

export function DeliveryEvidence({
  evidence,
  projectId,
  variant = "default",
}: {
  evidence: DeliveryEvidenceViewModel
  projectId: string
  variant?: "default" | "compact"
}) {
  return (
    <section className={`delivery-evidence ${variant === "compact" ? "delivery-evidence-compact" : ""}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Cadeia auditável</span>
          <h2>Evidências de entrega</h2>
        </div>
        <span>{evidence.runs.length} execuções</span>
      </div>

      <div className="evidence-summary">
        <span className={evidence.hasSuccessfulChecks ? "ready" : ""}>
          {evidence.hasSuccessfulChecks ? "✓" : "○"} checks registrados
        </span>
        <span className={evidence.hasChangedFiles ? "ready" : ""}>
          {evidence.hasChangedFiles ? "✓" : "○"} arquivos afetados
        </span>
        {evidence.issue ? (
          <a href={evidence.issue.url} rel="noreferrer" target="_blank">
            ✓ issue #{evidence.issue.number} ↗
          </a>
        ) : (
          <span>○ entrega externa opcional</span>
        )}
        <span className={evidence.hasPullRequest ? "ready" : ""}>
          {evidence.hasPullRequest ? "✓" : "○"} pull request
        </span>
        <span className={evidence.hasReadyPreview ? "ready" : ""}>
          {evidence.hasReadyPreview ? "✓" : "○"} preview validado
        </span>
      </div>

      {evidence.runs.map((run) => (
        <article className="evidence-run" key={run.requestId}>
          <header>
            <div>
              <span className="eyebrow">{run.requestId}</span>
              <strong>{run.title}</strong>
            </div>
            <span className={`status-chip ${run.runStatus ?? run.requestStatus}`}>
              {(run.runStatus ?? run.requestStatus).replace("_", " ")}
            </span>
          </header>
          {run.resultSummary ? <p>{run.resultSummary}</p> : null}
          <div className="evidence-columns">
            <div>
              <small>Arquivos</small>
              {run.changedFiles.map((file) => <code key={file}>{file}</code>)}
              {!run.changedFiles.length ? <span className="muted">Nenhum arquivo alterado.</span> : null}
            </div>
            <div>
              <small>Verificações</small>
              {run.checks.map((check) => <code key={check}>{check}</code>)}
              {!run.checks.length ? <span className="muted">Nenhum check registrado.</span> : null}
            </div>
          </div>
          {run.pullRequest || run.preview ? (
            <div className="evidence-artifacts">
              {run.pullRequest ? (
                <a href={run.pullRequest.url} rel="noreferrer" target="_blank">
                  GitHub PR #{run.pullRequest.number} · {run.pullRequest.headCommit.slice(0, 8)} ↗
                </a>
              ) : null}
              {run.preview ? (
                <a href={run.preview.url} rel="noreferrer" target="_blank">
                  Vercel {run.preview.environment} · {run.preview.state} ↗
                </a>
              ) : null}
            </div>
          ) : null}
          <footer>
            <Link href={`/projects/${projectId}/agents/${run.requestId}`}>
              Abrir execução{run.threadId ? ` · ${run.threadId}` : ""}
            </Link>
            <time dateTime={run.updatedAt}>
              {new Date(run.updatedAt).toLocaleString("pt-BR")}
            </time>
          </footer>
        </article>
      ))}

      {!evidence.runs.length ? (
        <div className="empty-inline">
          <strong>Nenhuma execução vinculada</strong>
          <span>Crie uma solicitação para iniciar a cadeia de evidências.</span>
        </div>
      ) : null}
    </section>
  )
}
