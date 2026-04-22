"use client"

import { useState } from "react"
import { Button, Alert, Stack } from "@matriz/design-ui"
import type { TenantId } from "@matriz/foundation-types"
import { getSpotContainer } from "../../src/lib/container"
import { gigToCreateContractInput } from "../../src/integration/adapters/gig-to-contract.adapter"

export function GigActions({
  gigId,
  tenantId,
  gigTitle,
  status,
}: {
  gigId: string
  tenantId: TenantId
  gigTitle: string
  status: string
}) {
  const [busy, setBusy] = useState<"none" | "contract">("none")
  const [message, setMessage] = useState<{ tone: "info" | "success" | "danger"; text: string } | null>(null)

  async function handleRequestContract() {
    try {
      setBusy("contract")
      const { useCases, gateways } = getSpotContainer()
      const gig = await useCases.getGig(tenantId, gigId as never)
      if (!gig) {
        setMessage({ tone: "danger", text: "Gig nao encontrada." })
        return
      }
      const bands = await useCases.listBands(tenantId)
      const band = bands.find((b) => b.id === gig.bandId)
      const input = gigToCreateContractInput(gig, {
        bandName: band?.name ?? gig.title,
        counterpartyName: gig.venue,
      })
      const summary = await gateways.contracts.requestContractFromGig(input)
      setMessage({
        tone: "success",
        text: `Solicitacao enviada ao Contracts. Resumo retornado: ${summary.id}`,
      })
    } catch (err) {
      setMessage({
        tone: "danger",
        text: `Falhou: ${(err as Error).message}`,
      })
    } finally {
      setBusy("none")
    }
  }

  return (
    <Stack gap={2}>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleRequestContract}
          disabled={busy === "contract"}
        >
          {busy === "contract" ? "Enviando..." : "Gerar contrato"}
        </Button>
        <span className="self-center text-xs text-muted-fg">
          Status: {status} · Gig: {gigTitle}
        </span>
      </div>
      {message ? (
        <Alert tone={message.tone === "success" ? "success" : message.tone === "danger" ? "danger" : "info"}>
          {message.text}
        </Alert>
      ) : null}
    </Stack>
  )
}
