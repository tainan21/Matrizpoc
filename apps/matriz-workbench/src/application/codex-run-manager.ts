import { randomUUID } from "node:crypto"
import path from "node:path"
import {
  type CodexApproval,
  type CodexRunRecord,
  type CodexRunSnapshot,
} from "../domain/codex-run"
import { WorkspaceError } from "../domain/errors"
import type { AgentRequest } from "../domain/schemas"
import {
  buildCheckExecution,
  buildExecutionAttempt,
  finishExecutionAttempt,
  recordCheckResult,
} from "../domain/execution-evidence"
import {
  CodexAppServerClient,
  resolveCodexRuntime,
  type CodexRuntimeInfo,
  type RpcNotification,
  type RpcServerRequest,
} from "../integration/codex/app-server-client"
import { CodexRunStore } from "../integration/codex/codex-run-store"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { GitObservationProvider } from "../integration/git/git-observation-provider"
import { enqueueOptionalNotifications } from "./collaboration/notification-service"
import { buildContextBundle } from "./context-bundle"

type ApprovalDecision = "accept" | "accept_for_session" | "decline" | "cancel"
type Subscriber = (snapshot: CodexRunSnapshot) => void

interface ThreadResponse {
  thread: { id: string }
}

interface TurnResponse {
  turn: { id: string }
}

interface Session {
  key: string
  projectId: string
  requestId: string
  repositoryRoot: string
  projectRoot: string
  client: CodexAppServerClient
  record: CodexRunRecord
  connected: boolean
  cancelRequested: boolean
  executionMode?: "plan_only" | "change"
  approvals: Map<string, { rpcId: string | number; method: string }>
  subscribers: Set<Subscriber>
  persistTimer?: NodeJS.Timeout
}

function sessionKey(projectId: string, requestId: string): string {
  return `${projectId}:${requestId}`
}

function clamp(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function normalizeCommandStatus(
  status: unknown,
): CodexRunRecord["commands"][number]["status"] {
  if (status === "completed" || status === "failed" || status === "declined") return status
  return "in_progress"
}

function normalizePlanStatus(
  status: unknown,
): CodexRunRecord["plan"][number]["status"] {
  if (status === "completed" || status === "pending") return status
  return "in_progress"
}

function maxConcurrentCodexRuns(): number {
  const configured = Number(process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS ?? "2")
  return Number.isInteger(configured) && configured >= 1 && configured <= 4 ? configured : 2
}

export function mutationApprovalRejection(
  executionMode: Session["executionMode"],
): string | undefined {
  if (!executionMode) {
    return "Mutação recusada: a solicitação não possui claim de execução com escopo declarado."
  }
  if (executionMode === "plan_only") {
    return "Mutação recusada: uma execução plan-only não pode alterar arquivos nem executar comandos aprovados."
  }
  return undefined
}

export function assertExecutionCanStart(
  request: AgentRequest,
  observedAt = new Date().toISOString(),
): void {
  if (!request.executionClaim) {
    throw new WorkspaceError(
      "Declare ownership, escopo e checks pelo workflow de claim antes de iniciar.",
      "CONFLICT",
    )
  }
  if (Date.parse(request.executionClaim.lease.expiresAt) <= Date.parse(observedAt)) {
    throw new WorkspaceError(
      "A ownership lease expirou; reconcilie e faça um novo claim antes de iniciar.",
      "CONFLICT",
    )
  }
}

export function hasRequiredCheckEvidence(
  executionMode: Session["executionMode"],
  checks: readonly string[],
): boolean {
  return executionMode === "plan_only" || (executionMode === "change" && checks.length > 0)
}

export async function completeCodexRequestRecord(
  repository: WorkspaceRepository,
  projectId: string,
  requestId: string,
  result: { resultSummary: string; changedFiles: string[]; checks: string[] },
) {
  const request = await repository.getAgentRequest(projectId, requestId)
  if (request.status === "completed" || request.status === "cancelled") return request
  return repository.updateAgentRequest(
    projectId,
    requestId,
    {
      status: "completed",
      resultSummary: result.resultSummary,
      changedFiles: result.changedFiles,
      checks: result.checks,
    },
    request.revision,
    "codex",
  )
}

export class CodexRunManager {
  private readonly sessions = new Map<string, Session>()
  private readonly pendingStarts = new Set<string>()

  async runtimeInfo(): Promise<CodexRuntimeInfo & {
    activeRuns: number
    maxConcurrentRuns: number
  }> {
    const runtime = await resolveCodexRuntime()
    return {
      ...runtime,
      activeRuns:
        [...this.sessions.values()].filter((session) => session.connected).length +
        this.pendingStarts.size,
      maxConcurrentRuns: maxConcurrentCodexRuns(),
    }
  }

  async getSnapshot(
    projectId: string,
    requestId: string,
  ): Promise<CodexRunSnapshot | undefined> {
    const active = this.sessions.get(sessionKey(projectId, requestId))
    if (active) return { ...active.record, connected: active.connected }
    const repository = await WorkspaceRepository.create()
    const record = await new CodexRunStore(repository.repositoryRoot).read(projectId, requestId)
    return record ? { ...record, connected: false } : undefined
  }

  subscribe(projectId: string, requestId: string, subscriber: Subscriber): () => void {
    const session = this.sessions.get(sessionKey(projectId, requestId))
    if (!session) return () => undefined
    session.subscribers.add(subscriber)
    subscriber({ ...session.record, connected: session.connected })
    return () => session.subscribers.delete(subscriber)
  }

  async start(
    projectId: string,
    requestId: string,
    expectedRevision: string,
  ): Promise<CodexRunSnapshot> {
    const key = sessionKey(projectId, requestId)
    const existingSession = this.sessions.get(key)
    if (existingSession?.connected) {
      throw new WorkspaceError("Esta solicitação já possui uma execução ativa.", "CONFLICT")
    }
    if (this.pendingStarts.has(key)) {
      throw new WorkspaceError("Esta solicitação já está iniciando.", "CONFLICT")
    }
    const activeRuns = [...this.sessions.values()].filter((session) => session.connected).length
    if (activeRuns + this.pendingStarts.size >= maxConcurrentCodexRuns()) {
      throw new WorkspaceError(
        "O limite local de execuções simultâneas do Codex foi atingido.",
        "RATE_LIMITED",
      )
    }
    this.pendingStarts.add(key)

    try {
    const repository = await WorkspaceRepository.create()
    const runtime = await resolveCodexRuntime()
    if (!runtime.available || !runtime.executable) {
      throw new WorkspaceError(
        runtime.reason ?? "Runtime local do Codex indisponível.",
        "NOT_FOUND",
      )
    }
    let request = await repository.getAgentRequest(projectId, requestId)
    if (request.revision !== expectedRevision) {
      throw new WorkspaceError("A solicitação foi alterada. Recarregue a página.", "CONFLICT")
    }
    if (request.status === "completed" || request.status === "cancelled") {
      throw new WorkspaceError("A solicitação já está encerrada.", "CONFLICT")
    }
    assertExecutionCanStart(request)
    const claimOwner = request.executionClaim!.claimedBy
    if (request.status === "queued" || request.status === "blocked" || request.status === "interrupted") {
      request = await repository.updateAgentRequest(
        projectId,
        requestId,
        { status: "claimed", claimedBy: claimOwner },
        request.revision,
        "codex",
      )
    }
    if (request.status !== "in_progress") {
      request = await repository.updateAgentRequest(
        projectId,
        requestId,
        { status: "in_progress" },
        request.revision,
        "codex",
      )
    }

    const projectRoot = path.join(repository.repositoryRoot, "apps", projectId)
    const store = new CodexRunStore(repository.repositoryRoot)
    const previous = await store.read(projectId, requestId)
    const timestamp = new Date().toISOString()
    const plannedCheckExecutions = request.executionClaim
      ? request.executionClaim.plannedChecks.map((command) => buildCheckExecution({
          id: `check_${randomUUID()}`,
          name: command,
          command,
          source: "app_server",
          baseCommit: request.executionClaim!.baseGit.commit,
        }))
      : []
    const record = await store.write({
      schemaVersion: 1,
      projectId,
      requestId,
      backlogItemId: request.backlogItemId,
      status: "starting",
      threadId: previous?.threadId,
      latestMessage: "",
      plan: [],
      commands: [],
      changedFiles: [],
      checks: [],
      attempts: previous?.attempts ?? [],
      checkExecutions: [...(previous?.checkExecutions ?? []), ...plannedCheckExecutions].slice(-100),
      approvals: [],
      diff: "",
      startedAt: timestamp,
      completedAt: undefined,
      error: undefined,
    })
    const client = new CodexAppServerClient(runtime.executable, repository.repositoryRoot)
    const session: Session = {
      key,
      projectId,
      requestId,
      repositoryRoot: repository.repositoryRoot,
      projectRoot,
      client,
      record,
      connected: true,
      cancelRequested: false,
      executionMode: request.executionClaim?.executionMode,
      approvals: new Map(),
      subscribers: existingSession?.subscribers ?? new Set(),
    }
    this.sessions.set(key, session)
    this.bind(session)
    this.publish(session)

    try {
      await client.connect()
      const context = await buildContextBundle(repository, projectId, {
        agentRequestId: requestId,
      })
      const thread = previous?.threadId
        ? await client.request<ThreadResponse>("thread/resume", {
            threadId: previous.threadId,
            cwd: projectRoot,
            approvalPolicy: "on-request",
            sandbox: "read-only",
          })
        : await client.request<ThreadResponse>("thread/start", {
            cwd: projectRoot,
            approvalPolicy: "on-request",
            sandbox: "read-only",
            serviceName: "matriz_workbench",
          })
      session.record = await store.write({
        ...session.record,
        threadId: thread.thread.id,
        status: "running",
      })
      const prompt = [
        "Execute a solicitação abaixo no projeto selecionado.",
        "Obedeça aos AGENTS.md carregados pelo Codex.",
        "Não edite .matriz/** diretamente e não conclua a solicitação pelo MCP; o Workbench registrará o resultado.",
        "Trabalhe no menor escopo possível, execute verificações proporcionais e finalize com um resumo objetivo.",
        "",
        context.content,
      ].join("\n")
      const turn = await client.request<TurnResponse>(
        "turn/start",
        {
          threadId: thread.thread.id,
          cwd: projectRoot,
          approvalPolicy: "on-request",
          sandboxPolicy: {
            type: "readOnly",
            networkAccess: false,
          },
          input: [{ type: "text", text: prompt, text_elements: [] }],
        },
        60_000,
      )
      session.record = await store.write({
        ...session.record,
        turnId: turn.turn.id,
        status: "running",
        attempts: [
          ...session.record.attempts,
          buildExecutionAttempt({
            id: `attempt_${randomUUID()}`,
            requestId,
            threadId: thread.thread.id,
            turnId: turn.turn.id,
            startedAt: new Date().toISOString(),
          }),
        ].slice(-50),
      })
      await repository.appendActivity(projectId, {
        actor: "codex",
        action: "codex.run.started",
        summary: `Execução Codex iniciada: ${request.title}`,
        entityType: "agent_request",
        entityId: requestId,
        metadata: { threadId: thread.thread.id, turnId: turn.turn.id },
      })
      this.publish(session)
      return { ...session.record, connected: true }
    } catch (error) {
      await this.finishWithFailure(
        session,
        error instanceof Error ? error.message : "Falha ao iniciar o Codex.",
      )
      throw error
    }
    } finally {
      this.pendingStarts.delete(key)
    }
  }

  async cancel(projectId: string, requestId: string): Promise<CodexRunSnapshot> {
    const session = this.requireSession(projectId, requestId)
    if (!session.record.threadId || !session.record.turnId) {
      throw new WorkspaceError("A execução ainda não possui um turno ativo.", "CONFLICT")
    }
    session.cancelRequested = true
    await session.client.request("turn/interrupt", {
      threadId: session.record.threadId,
      turnId: session.record.turnId,
    })
    return { ...session.record, connected: session.connected }
  }

  async resolveApproval(
    projectId: string,
    requestId: string,
    approvalId: string,
    decision: ApprovalDecision,
  ): Promise<CodexRunSnapshot> {
    const session = this.requireSession(projectId, requestId)
    const pending = session.approvals.get(approvalId)
    if (!pending) {
      throw new WorkspaceError("A aprovação não está mais pendente.", "NOT_FOUND")
    }
    const wireDecision =
      decision === "accept_for_session" ? "acceptForSession" : decision
    session.client.respond(pending.rpcId, { decision: wireDecision })
    session.approvals.delete(approvalId)
    session.record = await this.persistNow(session, {
      ...session.record,
      status: session.approvals.size ? "waiting_approval" : "running",
      approvals: session.record.approvals.map((approval) =>
        approval.id === approvalId
          ? {
              ...approval,
              status:
                decision === "accept"
                  ? "accepted"
                  : decision === "accept_for_session"
                    ? "accepted_for_session"
                    : decision === "decline"
                      ? "declined"
                      : "cancelled",
              resolvedAt: new Date().toISOString(),
            }
          : approval,
      ),
    })
    this.publish(session)
    return { ...session.record, connected: session.connected }
  }

  private bind(session: Session): void {
    session.client.on("notification", (notification: RpcNotification) => {
      void this.handleNotification(session, notification)
    })
    session.client.on("serverRequest", (request: RpcServerRequest) => {
      void this.handleServerRequest(session, request)
    })
    session.client.on("exit", () => {
      session.connected = false
      this.publish(session)
    })
  }

  private async handleNotification(
    session: Session,
    notification: RpcNotification,
  ): Promise<void> {
    const params = objectValue(notification.params)
    if (notification.method === "item/agentMessage/delta") {
      session.record.latestMessage = clamp(
        `${session.record.latestMessage}${stringValue(params.delta)}`,
        8_000,
      )
      this.schedulePersist(session)
      this.publish(session)
      return
    }
    if (notification.method === "turn/diff/updated") {
      session.record.diff = clamp(stringValue(params.diff), 120_000)
      this.schedulePersist(session)
      this.publish(session)
      return
    }
    if (notification.method === "turn/plan/updated") {
      const plan = Array.isArray(params.plan) ? params.plan : []
      session.record.plan = plan.slice(0, 50).map((entry) => {
        const item = objectValue(entry)
        return {
          step: clamp(stringValue(item.step) || "Etapa sem descrição", 500),
          status: normalizePlanStatus(item.status),
        }
      })
      this.schedulePersist(session)
      this.publish(session)
      return
    }
    if (notification.method === "item/started" || notification.method === "item/completed") {
      this.applyItem(session, objectValue(params.item))
      this.schedulePersist(session)
      this.publish(session)
      return
    }
    if (notification.method === "turn/completed") {
      await this.completeTurn(session, objectValue(params.turn))
    }
  }

  private applyItem(session: Session, item: Record<string, unknown>): void {
    const type = stringValue(item.type)
    if (type === "agentMessage" && stringValue(item.text)) {
      session.record.latestMessage = clamp(stringValue(item.text), 8_000)
      return
    }
    if (type === "commandExecution") {
      const id = stringValue(item.id) || `command-${session.record.commands.length + 1}`
      const command = {
        id,
        command: clamp(stringValue(item.command) || "comando não informado", 2_000),
        cwd: clamp(stringValue(item.cwd), 500),
        status: normalizeCommandStatus(item.status),
        exitCode: typeof item.exitCode === "number" ? item.exitCode : null,
        output: clamp(stringValue(item.aggregatedOutput), 4_000),
      }
      const index = session.record.commands.findIndex((entry) => entry.id === id)
      if (index >= 0) session.record.commands[index] = command
      else session.record.commands = [...session.record.commands, command].slice(-50)
      const plannedCheckIndex = session.record.checkExecutions.findIndex(
        (entry) => entry.command === command.command && ["planned", "running"].includes(entry.state),
      )
      if (plannedCheckIndex >= 0 && command.status === "in_progress") {
        const current = session.record.checkExecutions[plannedCheckIndex]
        session.record.checkExecutions[plannedCheckIndex] = {
          ...current,
          state: "running",
          startedAt: current.startedAt ?? new Date().toISOString(),
        }
      }
      session.record.checks = session.record.checkExecutions.length
        ? session.record.checkExecutions
            .filter((entry) => entry.state === "passed")
            .map((entry) => clamp(entry.command, 500))
            .slice(0, 100)
        : session.record.commands
            .filter((entry) => entry.status === "completed" && entry.exitCode === 0)
            .map((entry) => clamp(entry.command, 500))
            .slice(0, 100)
      return
    }
    if (type === "fileChange") {
      const changes = Array.isArray(item.changes) ? item.changes : []
      const files = changes
        .map((change) => this.repositoryRelativePath(session, stringValue(objectValue(change).path)))
        .filter((file): file is string => Boolean(file))
      session.record.changedFiles = Array.from(
        new Set([...session.record.changedFiles, ...files]),
      ).slice(0, 100)
    }
  }

  private async handleServerRequest(
    session: Session,
    request: RpcServerRequest,
  ): Promise<void> {
    if (
      request.method !== "item/commandExecution/requestApproval" &&
      request.method !== "item/fileChange/requestApproval"
    ) {
      session.client.respondError(
        request.id,
        -32601,
        "O Workbench suporta aprovações de comandos e alterações de arquivo nesta fase.",
      )
      return
    }
    const params = objectValue(request.params)
    const approval: CodexApproval = {
      id: `apr_${randomUUID()}`,
      kind:
        request.method === "item/commandExecution/requestApproval"
          ? "command"
          : "file_change",
      status: "pending",
      title:
        request.method === "item/commandExecution/requestApproval"
          ? clamp(stringValue(params.command) || "Executar comando solicitado", 500)
          : "Aplicar alterações de arquivo",
      detail: clamp(
        [
          stringValue(params.reason),
          stringValue(params.cwd),
          stringValue(params.grantRoot),
        ]
          .filter(Boolean)
          .join("\n"),
        4_000,
      ),
      createdAt: new Date().toISOString(),
    }
    const rejectionReason = mutationApprovalRejection(session.executionMode)
    if (rejectionReason) {
      session.client.respond(request.id, { decision: "decline" })
      const declinedApproval: CodexApproval = {
        ...approval,
        status: "declined",
        detail: clamp([approval.detail, rejectionReason].filter(Boolean).join("\n"), 4_000),
        resolvedAt: new Date().toISOString(),
      }
      session.record = await this.persistNow(session, {
        ...session.record,
        approvals: [...session.record.approvals, declinedApproval].slice(-50),
      })
      this.publish(session)
      return
    }
    session.approvals.set(approval.id, { rpcId: request.id, method: request.method })
    session.record = await this.persistNow(session, {
      ...session.record,
      status: "waiting_approval",
      approvals: [...session.record.approvals, approval].slice(-50),
    })
    this.publish(session)
  }

  private async completeTurn(
    session: Session,
    turn: Record<string, unknown>,
  ): Promise<void> {
    const status = stringValue(turn.status)
    if (status === "completed") await this.finalizePlannedChecks(session)
    if (status === "completed" && hasRequiredCheckEvidence(session.executionMode, session.record.checks)) {
      session.record = await this.persistNow(session, {
        ...this.finishActiveAttempt(session.record, "completed"),
        status: "completed",
        completedAt: new Date().toISOString(),
      })
      await this.completeRequest(session)
    } else if (status === "interrupted") {
      session.record = await this.persistNow(session, {
        ...this.finishActiveAttempt(
          session.record,
          session.cancelRequested ? "cancelled" : "interrupted",
          session.cancelRequested ? "Execução cancelada pelo usuário." : "Execução interrompida.",
        ),
        status: "interrupted",
        error: session.cancelRequested ? "Execução cancelada pelo usuário." : "Execução interrompida.",
        completedAt: new Date().toISOString(),
      })
      await this.stopRequest(session, session.cancelRequested ? "cancelled" : "interrupted")
    } else {
      const error = objectValue(turn.error)
      const message =
        stringValue(error.message) ||
        (status === "completed"
          ? "O agente terminou sem executar uma verificação válida."
          : "A execução Codex falhou.")
      await this.finishWithFailure(session, message)
      return
    }
    session.connected = false
    this.publish(session)
    session.client.close()
  }

  private async completeRequest(session: Session): Promise<void> {
    const repository = await WorkspaceRepository.create(session.repositoryRoot)
    const completedRequest = await completeCodexRequestRecord(
      repository,
      session.projectId,
      session.requestId,
      {
        resultSummary: session.record.latestMessage || "Execução concluída pelo Codex.",
        changedFiles: session.record.changedFiles,
        checks: session.record.checks,
      },
    )
    await enqueueOptionalNotifications(session.repositoryRoot, {
      projectId: session.projectId,
      event: "review_ready",
      idempotencyKey: `agent-request:${completedRequest.id}:review-ready:${completedRequest.revision}`,
      title: "Execução pronta para revisão",
      body: completedRequest.resultSummary,
      workbenchPath: `/projects/${session.projectId}/agents/${completedRequest.id}`,
      backlogItemId: completedRequest.backlogItemId,
      agentRequestId: completedRequest.id,
    })
  }

  private async stopRequest(
    session: Session,
    status: "blocked" | "cancelled" | "interrupted",
  ): Promise<void> {
    const repository = await WorkspaceRepository.create(session.repositoryRoot)
    const request = await repository.getAgentRequest(session.projectId, session.requestId)
    if (request.status === "completed" || request.status === "cancelled") return
    const stoppedRequest = await repository.updateAgentRequest(
      session.projectId,
      session.requestId,
      {
        status,
        resultSummary: session.record.latestMessage || session.record.error,
        changedFiles: session.record.changedFiles,
        checks: session.record.checks,
      },
      request.revision,
      "codex",
    )
    if (status === "blocked") {
      await enqueueOptionalNotifications(session.repositoryRoot, {
        projectId: session.projectId,
        event: "blocked",
        idempotencyKey: `agent-request:${stoppedRequest.id}:blocked:${stoppedRequest.revision}`,
        title: "Execução bloqueada",
        body: stoppedRequest.resultSummary,
        workbenchPath: `/projects/${session.projectId}/agents/${stoppedRequest.id}`,
        backlogItemId: stoppedRequest.backlogItemId,
        agentRequestId: stoppedRequest.id,
      })
    }
  }

  private async finishWithFailure(session: Session, message: string): Promise<void> {
    session.record = await this.persistNow(session, {
      ...this.finishActiveAttempt(session.record, "failed", message),
      status: "failed",
      error: clamp(message, 4_000),
      completedAt: new Date().toISOString(),
    })
    await this.stopRequest(session, "blocked").catch(() => undefined)
    await WorkspaceRepository.create(session.repositoryRoot)
      .then((repository) =>
        repository.appendActivity(session.projectId, {
          actor: "codex",
          action: "codex.run.failed",
          summary: `Execução Codex falhou: ${clamp(message, 800)}`,
          entityType: "agent_request",
          entityId: session.requestId,
        }),
      )
      .catch(() => undefined)
    session.connected = false
    this.publish(session)
    session.client.close()
  }

  private async finalizePlannedChecks(session: Session): Promise<void> {
    const pending = session.record.checkExecutions.some((check) =>
      check.state === "planned" || check.state === "running",
    )
    if (!pending) return
    const observation = await new GitObservationProvider(session.repositoryRoot)
      .observeCurrent()
      .catch(() => undefined)
    if (!observation) return
    const headCommit = observation.headCommit
    const finishedAt = new Date().toISOString()
    session.record.checkExecutions = session.record.checkExecutions.map((check) => {
      if (check.state !== "planned" && check.state !== "running") return check
      const command = session.record.commands.find((candidate) =>
        candidate.command === check.command &&
        (candidate.status === "completed" || candidate.status === "failed") &&
        typeof candidate.exitCode === "number",
      )
      if (!command || typeof command.exitCode !== "number") return check
      return recordCheckResult(check, {
        startedAt: check.startedAt ?? session.record.startedAt,
        finishedAt,
        exitCode: command.exitCode,
        output: command.output,
        headCommit,
      })
    })
    session.record.checks = session.record.checkExecutions
      .filter((check) => check.state === "passed")
      .map((check) => clamp(check.command, 500))
      .slice(0, 100)
  }

  private finishActiveAttempt(
    record: CodexRunRecord,
    status: "completed" | "failed" | "interrupted" | "cancelled",
    error?: string,
  ): CodexRunRecord {
    let index = -1
    for (let candidate = record.attempts.length - 1; candidate >= 0; candidate -= 1) {
      if (record.attempts[candidate].status === "running") {
        index = candidate
        break
      }
    }
    if (index < 0) return record
    const attempts = [...record.attempts]
    attempts[index] = finishExecutionAttempt(
      attempts[index],
      status,
      new Date().toISOString(),
      error,
    )
    return { ...record, attempts }
  }

  private repositoryRelativePath(session: Session, file: string): string | undefined {
    if (!file) return undefined
    const absolute = path.isAbsolute(file) ? file : path.resolve(session.projectRoot, file)
    const relative = path.relative(session.repositoryRoot, absolute).replaceAll("\\", "/")
    if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) return undefined
    return relative
  }

  private requireSession(projectId: string, requestId: string): Session {
    const session = this.sessions.get(sessionKey(projectId, requestId))
    if (!session?.connected) {
      throw new WorkspaceError("A execução Codex não está conectada.", "NOT_FOUND")
    }
    return session
  }

  private schedulePersist(session: Session): void {
    if (session.persistTimer) return
    session.persistTimer = setTimeout(() => {
      session.persistTimer = undefined
      void this.persistNow(session, session.record).catch(() => undefined)
    }, 250)
  }

  private async persistNow(
    session: Session,
    record: CodexRunRecord,
  ): Promise<CodexRunRecord> {
    if (session.persistTimer) {
      clearTimeout(session.persistTimer)
      session.persistTimer = undefined
    }
    return new CodexRunStore(session.repositoryRoot).write(record)
  }

  private publish(session: Session): void {
    const snapshot = { ...session.record, connected: session.connected }
    for (const subscriber of session.subscribers) subscriber(snapshot)
  }
}

const globalRuntime = globalThis as typeof globalThis & {
  __matrizCodexRunManager?: CodexRunManager
}

export function getCodexRunManager(): CodexRunManager {
  globalRuntime.__matrizCodexRunManager ??= new CodexRunManager()
  return globalRuntime.__matrizCodexRunManager
}
