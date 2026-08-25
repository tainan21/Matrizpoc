import type { EngineeringOperationViewModel } from "../presenters/engineering-operation-presenter"

export function EngineeringOperationsPanel({ operation }: { operation: EngineeringOperationViewModel }) {
  return (
    <section className="codex-console" aria-labelledby="engineering-operations-title">
      <header className="codex-console-header">
        <div>
          <span className="eyebrow">Engineering Operations</span>
          <h2 id="engineering-operations-title">Ownership e reconciliação</h2>
          <p>{operation.modeLabel} · owner <strong>{operation.owner}</strong> · lease {operation.leaseLabel}</p>
        </div>
        <span className={`status-chip ${operation.reconciliationLabel === "atual" ? "completed" : "blocked"}`}>
          {operation.reconciliationLabel}
        </span>
      </header>
      <div className="codex-console-grid">
        <div>
          <div className="section-heading"><h3>Scope declarado</h3><span>{operation.intendedFiles.length}</span></div>
          {operation.intendedFiles.map((file) => <div className="run-line" key={file}><code>{file}</code></div>)}
          {operation.intendedSurfaces.map((surface) => <div className="run-line" key={surface}><span>{surface}</span></div>)}
          {!operation.intendedFiles.length && !operation.intendedSurfaces.length ? <p className="muted">Scope não declarado em registro legado.</p> : null}
          <div className="section-heading"><h3>Dirty paths preexistentes</h3><span>{operation.preexistingPaths.length}</span></div>
          {operation.preexistingPaths.map((file) => <div className="run-line" key={file}><code>{file}</code></div>)}
        </div>
        <aside className="codex-run-inspector">
          <div className="section-heading"><h3>Checks planejados</h3><span>{operation.plannedChecks.length}</span></div>
          {operation.plannedChecks.map((check) => <div className="run-line" key={check}><code>{check}</code></div>)}
          <div className="section-heading"><h3>Checks observados</h3><span>{operation.executedChecks.length}</span></div>
          {operation.executedChecks.map((check) => (
            <div className="run-line" key={`${check.name}-${check.statusLabel}`}>
              <span>{check.name}</span><strong>{check.statusLabel}</strong>
            </div>
          ))}
          <p className="muted">Revisão humana da execução: {operation.humanReviewLabel}.</p>
        </aside>
      </div>
      {operation.findings.length ? (
        <div className="codex-warning danger">
          <strong>Findings de reconciliação</strong>
          {operation.findings.map((finding, index) => (
            <p key={`${finding.severity}-${index}`}>{finding.severity}: {finding.summary}</p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
