"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { generatePatternsAction } from "./actions"
import type { GeneratePatternsActionState } from "./actions"
import type {
  PatternGenerationVM,
  PracticeItemVM,
} from "../../src/domains/praticies/presentation/presenters"
import styles from "./praticies.module.css"

interface PraticiesWorkbenchProps {
  readonly practices: readonly PracticeItemVM[]
  readonly initialGeneration: PatternGenerationVM | null
}

const validationCommands = [
  {
    label: "Types",
    command: "pnpm --filter @matriz/app-matriz-hub typecheck",
  },
  {
    label: "Lint",
    command: "pnpm --filter @matriz/app-matriz-hub lint",
  },
  {
    label: "Smoke",
    command: "pnpm test:smoke",
  },
] as const

const compassLinks = [
  { label: "Network health", href: "/health", code: "HLT" },
  { label: "Ecosystem map", href: "/ecosystem", code: "ECO" },
  { label: "MatrizDocs", href: "/docs", code: "DOC" },
] as const

function RunButton() {
  const { pending } = useFormStatus()
  return (
    <button className={styles.runButton} type="submit" disabled={pending}>
      <span className={styles.runGlyph} aria-hidden="true">
        {pending ? "···" : "↗"}
      </span>
      <span>
        <strong>{pending ? "Mapeando workspace" : "Gerar patterns"}</strong>
        <small>{pending ? "Aguarde alguns instantes" : "Executar agora"}</small>
      </span>
    </button>
  )
}

function PatternsWorkspace({
  generation,
}: {
  generation: PatternGenerationVM | null
}) {
  return (
    <div className={styles.patternsWorkspace}>
      <div className={styles.workspaceHeading}>
        <span className={styles.sequence}>01 / AUTOMATION</span>
        <div>
          <h1>Project<br />patterns</h1>
          <p>
            Uma leitura estrutural do monorepo, sem abrir arquivos. Dois formatos,
            um único clique e contexto suficiente para humanos e agentes.
          </p>
        </div>
      </div>

      <div className={styles.executionBand}>
        <div className={styles.scopeNote}>
          <span>ESCOPO FIXO</span>
          <strong>Somente diretórios</strong>
          <p>Ignora dependências, caches, worktrees e o próprio output.</p>
        </div>
        <RunButton />
      </div>

      <div className={styles.workspaceMetrics} aria-label="Resumo do último mapa">
        <Metric
          value={generation?.mappedDirectoryCount ?? "—"}
          label="pastas"
        />
        <Metric
          value={generation?.applicationBoundaryCount ?? "—"}
          label="apps"
        />
        <Metric
          value={generation?.packageGroupCount ?? "—"}
          label="package groups"
        />
        <Metric
          value={generation?.inaccessibleDirectoryCount ?? "—"}
          label="inacessíveis"
        />
      </div>
    </div>
  )
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function ValidationWorkspace({
  onCopy,
  copied,
}: {
  onCopy: (value: string, key: string) => void
  copied: string | null
}) {
  return (
    <div className={styles.utilityWorkspace}>
      <span className={styles.sequence}>02 / SNIPPETS</span>
      <header>
        <h1>Validation<br />recipes</h1>
        <p>O caminho curto entre uma mudança local e evidência confiável.</p>
      </header>
      <div className={styles.commandList}>
        {validationCommands.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onCopy(item.command, item.label)}
          >
            <span>{item.label}</span>
            <code>{item.command}</code>
            <strong>{copied === item.label ? "Copiado" : "Copiar"}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

function CompassWorkspace() {
  return (
    <div className={styles.utilityWorkspace}>
      <span className={styles.sequence}>03 / SHORTCUTS</span>
      <header>
        <h1>Project<br />compass</h1>
        <p>Três entradas para localizar saúde, contexto e direção.</p>
      </header>
      <nav className={styles.compassList} aria-label="Atalhos operacionais">
        {compassLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <span>{item.code}</span>
            <strong>{item.label}</strong>
            <small>abrir ↗</small>
          </Link>
        ))}
      </nav>
    </div>
  )
}

const releaseTemplate = `# Entrega\n\n## O que mudou\n- \n\n## Como foi validado\n- \n\n## Riscos e limites\n- \n\n## Próximo passo\n- `

function ReleaseNotesWorkspace({ onCopy, copied }: { onCopy: (value: string, key: string) => void; copied: string | null }) {
  return (
    <div className={styles.utilityWorkspace}>
      <span className={styles.sequence}>04 / SNIPPET</span>
      <header><h1>Release<br />notes</h1><p>Uma entrega legível, com evidência e próximo passo explícito.</p></header>
      <div className={styles.commandList}>
        <button type="button" onClick={() => onCopy(releaseTemplate, "release-notes")}>
          <span>Markdown</span><code>mudança · validação · riscos · próximo passo</code><strong>{copied === "release-notes" ? "Copiado" : "Copiar"}</strong>
        </button>
      </div>
    </div>
  )
}

function PlannedWorkspace() {
  return (
    <div className={styles.plannedWorkspace}>
      <span className={styles.sequence}>04 / GADGET</span>
      <div className={styles.orbit} aria-hidden="true">
        <span>CTX</span>
      </div>
      <header>
        <p>EM DESENHO</p>
        <h1>Context brief</h1>
        <span>
          Próximo passo: combinar docs preferidos, estado do roadmap e mudanças
          recentes em um handoff curto e versionado.
        </span>
      </header>
    </div>
  )
}

export function PraticiesWorkbench({
  practices,
  initialGeneration,
}: PraticiesWorkbenchProps) {
  const initialState: GeneratePatternsActionState = {
    status: "idle",
    message: initialGeneration
      ? `Última geração: ${initialGeneration.generatedAtLabel}.`
      : "Nenhum pattern foi gerado neste workspace.",
    generation: initialGeneration,
  }
  const [state, formAction] = useActionState(generatePatternsAction, initialState)
  const [selectedId, setSelectedId] = useState("patterns")
  const [copied, setCopied] = useState<string | null>(null)
  const generation = state.generation ?? initialGeneration

  useEffect(() => {
    const requested = window.location.hash.slice(1)
    if (practices.some((practice) => practice.id === requested)) setSelectedId(requested)
  }, [practices])

  function copyCommand(value: string, key: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1800)
    })
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Voltar ao MyHub">
          <span aria-hidden="true">M</span>
          <strong>Matriz / Praticies</strong>
        </Link>
        <p>Utilitários locais para mover trabalho pequeno com precisão.</p>
        <div className={styles.environment}>
          <Link href="/praticies/apps">Instalar apps</Link>
          <span aria-hidden="true" /> LOCAL WORKSPACE
        </div>
      </header>

      <div className={styles.canvas}>
        <aside className={styles.catalog}>
          <div className={styles.catalogTitle}>
            <span>CATÁLOGO</span>
            <strong>{String(practices.length).padStart(2, "0")}</strong>
          </div>
          <nav aria-label="Praticidades disponíveis">
            {practices.map((practice, index) => (
              <button
                key={practice.id}
                type="button"
                aria-pressed={selectedId === practice.id}
                className={selectedId === practice.id ? styles.activePractice : undefined}
                onClick={() => setSelectedId(practice.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{practice.name}</strong>
                  <small>{practice.kindLabel}</small>
                </div>
                <i data-ready={practice.ready}>{practice.statusLabel}</i>
              </button>
            ))}
          </nav>
          <div className={styles.catalogFooter}>
            <span>PRINCÍPIO</span>
            <p>Pequenas ações. Saídas claras. Nenhuma surpresa.</p>
          </div>
        </aside>

        <section className={styles.workspace}>
          {selectedId === "patterns" ? (
            <form action={formAction} className={styles.actionScope}>
              <PatternsWorkspace generation={generation} />
            </form>
          ) : null}
          {selectedId === "validation-recipes" ? (
            <ValidationWorkspace onCopy={copyCommand} copied={copied} />
          ) : null}
          {selectedId === "project-compass" ? <CompassWorkspace /> : null}
          {selectedId === "release-notes" ? <ReleaseNotesWorkspace onCopy={copyCommand} copied={copied} /> : null}
          {selectedId === "context-brief" ? <PlannedWorkspace /> : null}
        </section>

        <aside className={styles.inspector}>
          <div className={styles.inspectorHeader}>
            <span>OUTPUT</span>
            <i data-status={state.status} aria-hidden="true" />
          </div>
          <div className={styles.statusBlock} aria-live="polite">
            <small>
              {state.status === "error" ? "FALHA NA EXECUÇÃO" : "ÚLTIMA EXECUÇÃO"}
            </small>
            <strong>{generation?.generatedAtLabel ?? "Ainda não executado"}</strong>
            <p className={state.status === "error" ? styles.errorMessage : undefined}>
              {state.message}
            </p>
          </div>

          <div className={styles.artifacts}>
            <span>ARTEFATOS</span>
            {generation?.artifacts.map((artifact) => (
              <a key={artifact.format} href={artifact.downloadHref} download>
                <div>
                  <strong>{artifact.label}</strong>
                  <code>{artifact.relativePath}</code>
                </div>
                <small>{artifact.sizeLabel} ↓</small>
              </a>
            )) ?? <p>Os downloads aparecerão após a primeira geração.</p>}
          </div>

          <div className={styles.guardrails}>
            <span>GUARDRAILS</span>
            <ul>
              <li>não lê conteúdo de arquivos</li>
              <li>não segue links simbólicos</li>
              <li>escreve apenas em .patterns/</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}
