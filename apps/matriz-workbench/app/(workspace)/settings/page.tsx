import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"
import { getCodexRunManager } from "../../../src/application/codex-run-manager"
import { buildOperationalHealth } from "../../../src/application/operational-health"
import { ThemeSystemPicker } from "../../../src/ui/components/theme-system-picker"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default async function SettingsPage() {
  const repository = await WorkspaceRepository.create()
  const health = await buildOperationalHealth(repository, getCodexRunManager())
  return (
    <main className="workspace-page">
      <header className="page-header"><div><p className="eyebrow">Ambiente local</p><h1>Configurações</h1><p>Estado operacional e limites deliberados da V1.</p></div></header>
      <ThemeSystemPicker variant="gallery" />
      <section className="health-dashboard" aria-labelledby="health-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Health local</p>
            <h2 id="health-title">Operação observável</h2>
          </div>
          <small>Atualizado {new Date(health.generatedAt).toLocaleTimeString("pt-BR")}</small>
        </div>
        <div className="health-metrics">
          <article>
            <span>Projetos</span>
            <strong>{health.projects.initialized}/{health.projects.detected}</strong>
            <small>{health.projects.corrupted ? `${health.projects.corrupted} corrompido(s)` : "sem corrupção detectada"}</small>
          </article>
          <article>
            <span>Codex runtime</span>
            <strong>{health.codex.available ? "disponível" : "indisponível"}</strong>
            <small>{health.codex.activeRuns}/{health.codex.maxConcurrentRuns} execuções ativas</small>
          </article>
          <article>
            <span>Outbox</span>
            <strong>{health.notifications.queued} pendente(s)</strong>
            <small>{health.notifications.failed} falha(s) · {health.notifications.delivered} entregue(s)</small>
          </article>
          <article>
            <span>Adapters</span>
            <strong>desconectados</strong>
            <small>fila local não equivale a entrega externa</small>
          </article>
        </div>
        <div className="health-projects">
          {health.notifications.projects.map((project) => (
            <div key={project.projectId}>
              <strong>{project.projectId}</strong>
              <span className={`status-chip status-${project.status}`}>{project.status}</span>
              <span>{project.enabled ? project.channels.join(", ") || "sem canal" : "opt-in desligado"}</span>
              <small>{project.queued} fila · {project.failed} falhas</small>
            </div>
          ))}
        </div>
      </section>
      <section className="settings-list">
        <div><span>Raiz do repositório</span><code>{repository.repositoryRoot}</code></div>
        <div><span>Persistência</span><strong>Git · JSON · Markdown · JSONL</strong></div>
        <div><span>Servidor</span><strong>127.0.0.1:3005</strong></div>
        <div><span>Autenticação</span><strong>Token local → cookie HTTP-only</strong></div>
        <div><span>Contexto padrão</span><strong>12.000 caracteres</strong></div>
        <div><span>Contexto máximo</span><strong>40.000 caracteres</strong></div>
        <div><span>Discovery</span><strong>{health.projects.discoveryDurationMs.toFixed(2)} ms · {health.projects.detected} apps</strong></div>
        <div><span>Assets do browser</span><strong>{health.build.available ? `${formatBytes(health.build.totalBytes)} · ${health.build.fileCount} arquivos` : "execute um build"}</strong></div>
        <div><span>Maior asset</span><strong>{health.build.largestAsset ? `${health.build.largestAsset.path} · ${formatBytes(health.build.largestAsset.bytes)}` : "ainda não medido"}</strong></div>
        <div><span>MCP</span><strong>STDIO · named tools only</strong></div>
        <div><span>Cloud</span><strong>Desativada na V1</strong></div>
        <div><span>Unlock</span><strong>8 tentativas / 5 minutos</strong></div>
        <div><span>Codex start</span><strong>12 tentativas / minuto · máximo {health.codex.maxConcurrentRuns} simultâneas</strong></div>
      </section>
    </main>
  )
}
