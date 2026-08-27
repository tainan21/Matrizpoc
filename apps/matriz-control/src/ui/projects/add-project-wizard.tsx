"use client"

import type { ProjectPreparationPreview } from "../../modules/projects/application/project-preparation-service"
import type { ProjectViewModel } from "../../modules/projects/presentation/project-presenter"

export function projectWizardStep(project: ProjectViewModel): number { if (project.state === "unknown" || project.state === "inspecting") return 2; if (project.state === "needs_review") return 3; if (!project.prepared && project.prepareActions.length) return 4; if (["starting", "running", "degraded"].includes(project.state)) return 6; return 5 }

export function AddProjectWizard({ project, preview, busy, onInspect, onApprove, onPreview, onPrepare }: { project: ProjectViewModel; preview: ProjectPreparationPreview | null; busy: boolean; onInspect(): void; onApprove(): void; onPreview(): void; onPrepare(): void }) {
  const step = projectWizardStep(project)
  return <section className="project-wizard" aria-label="Configuração do projeto"><header><span>ETAPA {step} / 6</span><strong>{["", "Selecionar", "Inspecionar", "Revisar", "Preparar", "Executar", "Acompanhar"][step]}</strong></header>
    {step === 2 ? <><p>A inspeção é limitada e somente leitura. Nenhum arquivo será executado.</p><button disabled={busy} onClick={onInspect}>Inspecionar projeto</button></> : null}
    {step === 3 ? <><p>Revise as ações detectadas. Comandos e variáveis são resolvidos exclusivamente pelo processo nativo.</p>{project.runActions.map((action) => <code key={action.id}>{action.commandPreview}</code>)}<button disabled={busy} onClick={onApprove}>Aprovar receita</button></> : null}
    {step === 4 ? preview ? <><p>Confirme a preparação. Esta ação pode alterar dependências dentro do projeto.</p><code>{[preview.executable, ...preview.args].join(" ")}</code><p>{preview.warning}</p><button disabled={busy} onClick={onPrepare}>Confirmar preparo</button></> : <><p>O preparo é opcional e exige confirmação explícita.</p><button disabled={busy} onClick={onPreview}>Revisar preparo</button></> : null}
    {step >= 5 ? <p>{step === 6 ? "Projeto supervisionado pelo Matriz Control." : "Projeto pronto para iniciar."}</p> : null}
  </section>
}
