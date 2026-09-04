import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REQUIRED_RESULTS_PER_RUN = 98

function redact(value) {
  return String(value ?? "")
    .replace(new RegExp("C:\\\\Users\\\\[^\\\\\\s]+", "gi"), "%USERPROFILE%")
    .replace(new RegExp("C:\\\\", "gi"), "<drive>\\")
}

function fixed(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "n/d"
}

function runReady(run) {
  const ids = new Set(run.results.map((result) => result.id))
  return run.results.length === REQUIRED_RESULTS_PER_RUN
    && ids.size === REQUIRED_RESULTS_PER_RUN
    && run.results.every((result) => result.status === "pass")
    && run.lifecycle?.status === "pass"
    && run.lifecycle?.uninstalled === true
}

export function generateReport(input) {
  const runs = [...input.packagedRuns].sort((left, right) => left.runId.localeCompare(right.runId))
  const hashes = new Set(runs.map((run) => run.installation?.installerSha256).filter(Boolean))
  const ready = runs.length === 2 && runs.every(runReady) && hashes.size === 1
  const passed = runs.reduce((total, run) => total + run.results.filter((result) => result.status === "pass").length, 0)
  const required = runs.length * REQUIRED_RESULTS_PER_RUN
  const visualCases = runs.flatMap((run) => run.visual?.results ?? [])
  const noOverflow = visualCases.every((result) => Number(result.scrollWidth) <= Number(result.clientWidth))
  const named = visualCases.every((result) => Number(result.unnamedControls) === 0)
  const focused = visualCases.every((result) => result.focusVisible === true)
  const findingRows = input.findings.length
    ? input.findings.map((finding) => `| ${finding.severity} | ${finding.title} | ${finding.status} |`).join("\n")
    : "| — | Nenhum | — |"
  const runRows = runs.map((run) => {
    const performance = run.performance ?? {}
    return `| ${run.runId} | ${run.results.filter((result) => result.status === "pass").length}/${REQUIRED_RESULTS_PER_RUN} | ${redact(run.installation?.installerSha256)} | ${fixed(performance.startupToObservedInteractiveMsUpperBound, 0)} ms | ${fixed(performance.averageWorkingSetMb)} MB | ${fixed(performance.averageCpuPercent, 4)}% | ${run.lifecycle?.uninstalled ? "sim" : "não"} |`
  }).join("\n")

  return `# Matriz Control — relatório de aceitação Windows

Gerado em: ${input.generatedAt}

## Resultado executivo

**Verdict: ${ready ? "Ready" : "Not Ready"}**

- Contrato instalado: ${passed}/${required || REQUIRED_RESULTS_PER_RUN} resultados verdes.
- Ciclos consecutivos completos: ${runs.filter(runReady).length}/2.
- Mesmo artefato nos dois ciclos: ${hashes.size === 1 && runs.length === 2 ? "sim" : "não"}.
- Overflow horizontal: ${noOverflow ? "zero" : "encontrado"}.
- Controles sem nome acessível: ${named ? "zero" : "encontrados"}.
- Foco por teclado: ${focused ? "visível" : "incompleto"}.

## Targets

### Installed baseline

O baseline representa o aplicativo que já estava instalado antes da recuperação. Ele é evidência histórica e não certifica o candidato atual.

- Versão: ${redact(input.baseline?.productVersion ?? "não disponível")}
- SHA-256: ${redact(input.baseline?.artifactSha256 ?? "não disponível")}
- Executável: ${redact(input.baseline?.executablePath ?? "não disponível")}

### Packaged candidate

O candidato é o NSIS produzido pelo commit atual, instalado, exercitado dentro do WebView2 real, encerrado pela API do produto e desinstalado em cada ciclo.

| Ciclo | Casos | SHA-256 do instalador | Startup ≤ | RAM média | CPU idle | Desinstalado |
|---|---:|---|---:|---:|---:|---|
${runRows || "| nenhum | 0/98 | — | — | — | — | não |"}

## Produto validado

1. Portas e processos — inventário, PID, refresh, kill e kill-all autorizados por snapshot.
2. Terminal — PowerShell/ConPTY real, seis abas, Unicode, Ctrl+C e encerramento limpo.
3. Apps — catálogo de nove produtos; nove ciclos completos de runtime e proteção de listeners externos.
4. Ações — gates tipados de types, lint, smoke e Prisma com saída observável.
5. Doctor — workspace, Node, pnpm e Git verificados localmente.
6. Git pulse — branch e estado do worktree sem transformar o app em cliente Git genérico.
7. Quick jumps — Explorer, Terminal e destinos Matriz allowlisted.
8. Preferências — sons, volume, tray, startup e workspace persistidos.
9. Matriz Admin nativo — gerar, verificar SHA-256, instalar, abrir e fechar pelo Control.

## Evidência visual e acessibilidade

- Viewports: 420×560, 760×700 e 1440×900.
- Áreas: Portas, Apps, Terminal, Ações, Doctor e Ajustes.
- Capturas por ciclo: ${visualCases.length / Math.max(runs.length, 1)}.
- Política de movimento: transições limitadas a 100 ms e removidas quando o sistema solicita redução.
- Terminal largo: dock lateral; terminal compacto: área dedicada sempre acessível.

## Segurança e limites

- A UI automatizada envia somente IDs tipados; não envia executáveis, argumentos ou comandos de shell.
- Kill exige PID observado e snapshot atual; processos protegidos e ownership divergente são rejeitados.
- Instaladores só executam dentro do workspace após SHA-256 válido.
- O harness instalado aceita somente o diretório oficial ou a raiz isolada de aceitação.
- O terminal é a única superfície arbitrária e fica isolado em sessões ConPTY limitadas.
- O instalador 1.1 permanece sem assinatura; distribuição pública deve aguardar signing e canal confiável.

## Achados residuais

| Severidade | Achado | Estado |
|---|---|---|
${findingRows}

## Conclusão

${ready ? "O Matriz Control está pronto para uso local e distribuição interna controlada no Windows." : "O Matriz Control ainda não satisfaz o contrato de release; consulte os ciclos incompletos acima."}
`
}

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"))
}

async function loadBaseline(outputRoot) {
  const entries = await readdir(outputRoot, { withFileTypes: true }).catch(() => [])
  const candidates = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      const installation = await json(path.join(outputRoot, entry.name, "installation.json"))
      if (installation.target === "installed-baseline") candidates.push(installation)
    } catch { /* optional historical evidence */ }
  }
  return candidates.sort((left, right) => String(left.capturedAt).localeCompare(String(right.capturedAt))).at(-1)
}

export async function loadReportInput(outputRoot, runIds) {
  const packagedRuns = []
  for (const runId of runIds) {
    const runRoot = path.join(outputRoot, runId)
    packagedRuns.push({
      runId,
      results: await json(path.join(runRoot, "results.json")),
      installation: await json(path.join(runRoot, "installation.json")),
      lifecycle: await json(path.join(runRoot, "lifecycle.json")),
      performance: await json(path.join(runRoot, "performance.json")),
      visual: await json(path.join(runRoot, "visual.json")),
    })
  }
  return {
    generatedAt: new Date().toISOString(),
    baseline: await loadBaseline(outputRoot),
    packagedRuns,
    findings: [{ severity: "minor", title: "Instalador 1.1 ainda não assinado", status: "aceito para distribuição interna" }],
  }
}

async function main() {
  const file = fileURLToPath(import.meta.url)
  const appRoot = path.dirname(path.dirname(file))
  const workspaceRoot = path.resolve(appRoot, "../..")
  const outputRoot = path.join(workspaceRoot, "output", "matriz-control-acceptance")
  const destination = path.join(workspaceRoot, "docs", "audit", "2026-08-20-matriz-control-acceptance.md")
  const requestedRunIds = process.argv.slice(2)
  if (requestedRunIds.length !== 0 && requestedRunIds.length !== 2) {
    throw new Error("Provide exactly two installed acceptance run IDs")
  }
  const input = await loadReportInput(outputRoot, requestedRunIds.length === 2 ? requestedRunIds : ["final-1", "final-2"])
  await writeFile(destination, generateReport(input), "utf8")
  process.stdout.write(`${destination}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
