"use client"

import { useState, useTransition } from "react"
import type {
  PreviewReceiptViewModel,
  PullRequestReceiptViewModel,
} from "../presenters/delivery-artifact-presenter"

interface DeliveryArtifactsPanelProps {
  projectId: string
  requestId: string
  requestStatus: string
  checks: string[]
  initialPullRequest?: PullRequestReceiptViewModel
  initialPreview?: PreviewReceiptViewModel
}

interface PullRequestApiReceipt extends Omit<PullRequestReceiptViewModel, "number"> {
  externalId: string
  publishedAt: string
}

async function responseBody<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? "Falha ao registrar a entrega.")
  return body
}

export function DeliveryArtifactsPanel({
  projectId,
  requestId,
  requestStatus,
  checks,
  initialPullRequest,
  initialPreview,
}: DeliveryArtifactsPanelProps) {
  const [pullRequest, setPullRequest] = useState(initialPullRequest)
  const [preview, setPreview] = useState(initialPreview)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const canRecord = requestStatus === "completed" && checks.length > 0
  const base = `/api/collaboration/projects/${projectId}`

  function recordPullRequest(form: FormData) {
    setMessage("")
    startTransition(async () => {
      try {
        const response = await fetch(`${base}/github/pull-requests/${requestId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: String(form.get("url") ?? ""),
            baseBranch: String(form.get("baseBranch") ?? ""),
            headBranch: String(form.get("headBranch") ?? ""),
            headCommit: String(form.get("headCommit") ?? ""),
            expectedRevision: pullRequest?.revision,
          }),
        })
        const receipt = await responseBody<PullRequestApiReceipt>(response)
        setPullRequest({
          number: receipt.externalId,
          url: receipt.url,
          baseBranch: receipt.baseBranch,
          headBranch: receipt.headBranch,
          headCommit: receipt.headCommit,
          checks: receipt.checks,
          recordedAt: receipt.recordedAt,
          revision: receipt.revision,
        })
        setMessage(`Pull request #${receipt.externalId} registrado.`)
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Falha ao registrar pull request.")
      }
    })
  }

  function recordPreview(form: FormData) {
    setMessage("")
    startTransition(async () => {
      try {
        const response = await fetch(`${base}/vercel/previews/${requestId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deploymentId: String(form.get("deploymentId") ?? ""),
            url: String(form.get("url") ?? ""),
            environment: String(form.get("environment") ?? "preview"),
            sourceCommit: String(form.get("sourceCommit") ?? ""),
            state: String(form.get("state") ?? "ready"),
            expectedRevision: preview?.revision,
          }),
        })
        const receipt = await responseBody<PreviewReceiptViewModel>(response)
        setPreview(receipt)
        setMessage(`Preview ${receipt.state} registrado.`)
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Falha ao registrar preview.")
      }
    })
  }

  return (
    <section className="delivery-artifacts-panel">
      <header>
        <div>
          <span className="eyebrow">Projeções opcionais</span>
          <h2>Entrega externa</h2>
          <p>Registre evidências retornadas pelos providers; nenhuma publicação é iniciada daqui.</p>
        </div>
        <span className={`status-chip ${canRecord ? "ready" : "blocked"}`}>
          {canRecord ? "execução verificada" : "aguardando checks"}
        </span>
      </header>

      <div className="delivery-artifact-grid">
        <form action={recordPullRequest} className="artifact-form">
          <div className="section-heading">
            <h3>GitHub pull request</h3>
            {pullRequest ? (
              <a href={pullRequest.url} rel="noreferrer" target="_blank">
                #{pullRequest.number} ↗
              </a>
            ) : <span>não vinculado</span>}
          </div>
          <label>URL do pull request<input defaultValue={pullRequest?.url} name="url" placeholder="https://github.com/owner/repo/pull/123" required type="url" /></label>
          <div className="inline-fields">
            <label>Branch base<input defaultValue={pullRequest?.baseBranch ?? "main"} name="baseBranch" required /></label>
            <label>Branch head<input defaultValue={pullRequest?.headBranch} name="headBranch" required /></label>
          </div>
          <label>Commit imutável<input defaultValue={pullRequest?.headCommit} maxLength={40} minLength={40} name="headCommit" pattern="[0-9a-fA-F]{40}" required /></label>
          <button className="button" disabled={!canRecord || pending} type="submit">
            {pullRequest ? "Atualizar PR" : "Vincular PR"}
          </button>
        </form>

        <form action={recordPreview} className="artifact-form">
          <div className="section-heading">
            <h3>Vercel preview</h3>
            {preview ? (
              <a href={preview.url} rel="noreferrer" target="_blank">
                {preview.state} ↗
              </a>
            ) : <span>não vinculado</span>}
          </div>
          <label>URL do deployment<input defaultValue={preview?.url} name="url" placeholder="https://project-branch.vercel.app" required type="url" /></label>
          <label>Deployment ID<input defaultValue={preview?.deploymentId} name="deploymentId" required /></label>
          <div className="inline-fields">
            <label>Ambiente<select defaultValue={preview?.environment ?? "preview"} name="environment"><option value="preview">Preview</option><option value="production">Produção</option></select></label>
            <label>Estado<select defaultValue={preview?.state ?? "ready"} name="state"><option value="queued">Queued</option><option value="building">Building</option><option value="ready">Ready</option><option value="error">Error</option><option value="canceled">Canceled</option></select></label>
          </div>
          <label>Commit do deployment<input defaultValue={preview?.sourceCommit ?? pullRequest?.headCommit} key={preview?.sourceCommit ?? pullRequest?.headCommit ?? "empty-commit"} maxLength={40} minLength={40} name="sourceCommit" pattern="[0-9a-fA-F]{40}" required /></label>
          <button className="button" disabled={!canRecord || pending} type="submit">
            {preview ? "Atualizar preview" : "Vincular preview"}
          </button>
        </form>
      </div>

      {message ? <div aria-live="polite" className="toast" role="status">{message}</div> : null}
    </section>
  )
}
