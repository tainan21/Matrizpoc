import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import path from "node:path"

function textResult(result: unknown): string {
  if (!result || typeof result !== "object" || !("content" in result)) {
    throw new Error("A tool MCP retornou um envelope inválido.")
  }
  const content = result.content
  if (!Array.isArray(content)) throw new Error("A tool MCP não retornou conteúdo.")
  const block = content.find(
    (item): item is { type: "text"; text: string } =>
      Boolean(
        item &&
        typeof item === "object" &&
        "type" in item &&
        item.type === "text" &&
        "text" in item &&
        typeof item.text === "string",
      ),
  )
  if (!block) throw new Error("A tool MCP não retornou texto.")
  return block.text
}

function isErrorResult(result: unknown): boolean {
  return Boolean(
    result &&
      typeof result === "object" &&
      "isError" in result &&
      result.isError === true,
  )
}

function jsonResult<T>(label: string, result: unknown): T {
  const text = textResult(result)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`${label} não retornou JSON: ${text.slice(0, 120)}`)
  }
}

async function main(): Promise<void> {
  const appRoot = process.cwd()
  const client = new Client({ name: "matriz-workbench-contract-check", version: "0.1.0" })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      path.join(appRoot, "node_modules", "tsx", "dist", "cli.mjs"),
      path.join(appRoot, "src", "mcp", "server.ts"),
    ],
    cwd: appRoot,
    env: {
      ...process.env,
      MATRIZ_REPO_ROOT: path.resolve(appRoot, "..", ".."),
    },
    stderr: "pipe",
  })

  try {
    await client.connect(transport)
    const tools = await client.listTools()
    const projectsResult = await client.callTool({
      name: "workbench_list_projects",
      arguments: {},
    })
    const projects = jsonResult<Array<{ id: string }>>("projects", projectsResult)
    const spotResult = await client.callTool({
      name: "workbench_get_project_inventory",
      arguments: { projectId: "spot" },
    })
    const spot = jsonResult<{
      project: { id: string }
      git: { branch?: string }
    }>("spot inventory", spotResult)
    const resource = await client.readResource({
      uri: "matriz://projects/seumei/inventory",
    })
    const guideResource = await client.readResource({
      uri: "matriz://workbench/agent-guide",
    })
    const controlResource = await client.readResource({ uri: "matriz://projects/matriz-workbench/control" })
    const scoreResult = await client.callTool({ name: "workbench_get_score_summary", arguments: { projectId: "matriz-workbench" } })
    const sourcesResult = await client.callTool({
      name: "workbench_list_registered_sources",
      arguments: {},
    })
    const sources = jsonResult<Array<{
      id: string
      available: boolean
      absolutePath?: string
    }>>("registered sources", sourcesResult)
    const uiSourceAvailable = sources.some((source) => source.id === "matriz-lib-ui" && source.available)
    const seumeiSourceAvailable = sources.some((source) => source.id === "seumei-reference" && source.available)
    let uiPackage: {
      name: string
      exports: string[]
    } | undefined
    if (uiSourceAvailable) {
      const uiPackageResult = await client.callTool({
        name: "workbench_get_registered_package_summary",
        arguments: {
          sourceId: "matriz-lib-ui",
          packageName: "@matriz/blocks",
        },
      })
      uiPackage = jsonResult("registered package", uiPackageResult)
    }
    const readinessTool = tools.tools.find(
      (tool) => tool.name === "workbench_get_package_adoption_readiness",
    )
    if (!readinessTool) {
      throw new Error("Tool de prontidao para adocao nao publicada.")
    }
    const readinessProperties = Object.keys(
      readinessTool.inputSchema.properties ?? {},
    ).sort()
    if (
      JSON.stringify(readinessProperties) !==
        JSON.stringify(["packageName", "sourceId"]) ||
      readinessTool.inputSchema.additionalProperties !== false ||
      readinessTool.annotations?.readOnlyHint !== true ||
      readinessTool.annotations.destructiveHint !== false ||
      readinessTool.annotations.idempotentHint !== true ||
      readinessTool.annotations.openWorldHint !== false
    ) {
      throw new Error("Contrato da tool de prontidao esta mais amplo que o permitido.")
    }
    let readiness: {
      status: string
      ready: boolean
      allowedSubpaths: string[]
      absolutePath?: string
    } | undefined
    if (uiSourceAvailable) {
      const readinessResult = await client.callTool({
        name: "workbench_get_package_adoption_readiness",
        arguments: {
          sourceId: "matriz-lib-ui",
          packageName: "@matriz/tokens",
        },
      })
      readiness = jsonResult("package readiness", readinessResult)
    }
    const invalidArgumentResult = await client.callTool({
      name: "workbench_get_package_adoption_readiness",
      arguments: {
        sourceId: "matriz-lib-ui",
        packageName: "@matriz/tokens",
        repositoryRoot: appRoot,
      },
    })
    if (
      !isErrorResult(invalidArgumentResult) ||
      textResult(invalidArgumentResult) !== "Parâmetros inválidos para a tool."
    ) {
      throw new Error("A tool de prontidao aceitou argumentos adicionais.")
    }
    const missingSourceResult = await client.callTool({
      name: "workbench_get_package_adoption_readiness",
      arguments: {
        sourceId: "missing-source",
        packageName: "@matriz/tokens",
      },
    })
    const publicError = textResult(missingSourceResult)
    if (
      !isErrorResult(missingSourceResult) ||
      publicError !== "Fonte ou recurso não encontrado." ||
      publicError.includes(path.resolve(appRoot, "..", "..")) ||
      /[A-Za-z]:[\\/]/.test(publicError) ||
      /(?:^|\s)\/(?:Users|home|var|tmp)\//.test(publicError)
    ) {
      throw new Error("Erro MCP expôs detalhes internos do repositório.")
    }
    let seumeiDocuments: Array<{ path: string; hash: string }> = []
    if (seumeiSourceAvailable) {
      const seumeiDocumentsResult = await client.callTool({
        name: "workbench_list_repository_documents",
        arguments: { sourceId: "seumei-reference" },
      })
      seumeiDocuments = jsonResult("seumei documents", seumeiDocumentsResult)
    }
    const siteResult = await client.callTool({
      name: "workbench_get_site_summary",
      arguments: { siteId: "example" },
    })
    const site = jsonResult<{ id: string }>("site summary", siteResult)

    if (!tools.tools.some((tool) => tool.name === "workbench_get_project_inventory")) {
      throw new Error("Tool de inventário não publicada.")
    }
    if (!tools.tools.some((tool) => tool.name === "workbench_create_project_blueprint")) {
      throw new Error("Tool de blueprint não publicada.")
    }
    if (!tools.tools.some((tool) => tool.name === "workbench_get_registered_package_summary")) {
      throw new Error("Tool de contrato de package nao publicada.")
    }
    for (const name of ["workbench_get_control_snapshot", "workbench_get_score_summary", "workbench_list_score_evidence", "workbench_review_score_evidence"]) {
      if (!tools.tools.some((tool) => tool.name === name)) throw new Error(`Tool de Controle ausente: ${name}`)
    }
    for (const name of [
      "workbench_get_engineering_operations_context",
      "workbench_check_ownership_conflicts",
      "workbench_reconcile_agent_request",
      "workbench_record_reconciliation_snapshot",
      "workbench_checkpoint_execution_attempt",
      "workbench_interrupt_execution_attempt",
    ]) {
      const tool = tools.tools.find((entry) => entry.name === name)
      if (!tool) throw new Error(`Tool de Engineering Operations ausente: ${name}`)
      const isRead = name.startsWith("workbench_get_") || name.startsWith("workbench_check_") || name.startsWith("workbench_reconcile_")
      if (
        tool.annotations?.readOnlyHint !== isRead ||
        tool.annotations?.destructiveHint !== false ||
        tool.inputSchema.additionalProperties !== false
      ) {
        throw new Error(`Permissões incorretas na tool de Engineering Operations: ${name}`)
      }
    }
    const claimTool = tools.tools.find((tool) => tool.name === "workbench_claim_agent_request")
    const claimRequired = new Set(claimTool?.inputSchema.required ?? [])
    for (const field of ["executionMode", "intendedFiles", "intendedSurfaces", "plannedChecks"]) {
      if (!claimRequired.has(field)) throw new Error(`Claim sem campo obrigatório: ${field}`)
    }
    if (!projects.some((project) => project.id === "seumei")) {
      throw new Error("Seumei não foi encontrado pelo MCP.")
    }
    if (!projects.some((project) => project.id === "spot") || spot.project.id !== "spot") {
      throw new Error("Spot não foi encontrado pelo MCP.")
    }
    if (!resource.contents.length) throw new Error("Resource de inventário vazio.")
    if (!controlResource.contents.length || !textResult(scoreResult).includes("aggregate")) throw new Error("Resource/score do Controle vazio.")
    if (
      sources.length !== 4 ||
      sources.some((source) => "absolutePath" in source)
    ) {
      throw new Error("Registro federado incompleto ou com caminho local exposto.")
    }
    if ((seumeiSourceAvailable && seumeiDocuments.length < 1) || site.id !== "example") {
      throw new Error("Catálogo federado ou projeção Sites indisponível.")
    }
    if (uiSourceAvailable && (!uiPackage ||
      uiPackage.name !== "@matriz/blocks" ||
      !uiPackage.exports.includes("./page-header")
    )) {
      throw new Error("Contrato read-only da Matriz Lib UI indisponivel.")
    }
    if (uiSourceAvailable && (!readiness ||
      readiness.status !== "candidate" ||
      readiness.ready ||
      !readiness.allowedSubpaths.includes("./css") ||
      "absolutePath" in readiness
    )) {
      throw new Error("Gate read-only de adocao da Matriz Lib UI indisponivel.")
    }
    const guideContent = guideResource.contents[0]
    const guideText =
      guideContent &&
      "text" in guideContent &&
      typeof guideContent.text === "string"
        ? guideContent.text
        : ""
    if (!guideText.includes("human + Codex") || !guideText.includes("0-100")) {
      throw new Error("Manual operacional MCP ausente ou incompleto.")
    }

    process.stdout.write(`${JSON.stringify({
      protocol: "MCP STDIO",
      tools: tools.tools.length,
      projects: projects.map((project) => project.id),
      sources: sources.map(({ id, available }) => ({ id, available })),
      seumeiDocuments: seumeiDocuments.length,
      site: site.id,
      spotBranch: spot.git.branch,
      seumeiResource: resource.contents[0]?.uri,
      agentGuideResource: guideResource.contents[0]?.uri,
      controlResource: controlResource.contents[0]?.uri,
    }, null, 2)}\n`)
  } finally {
    await client.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha no contrato MCP."}\n`)
  process.exitCode = 1
})
