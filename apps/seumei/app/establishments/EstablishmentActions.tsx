"use client"

import { useState } from "react"
import { Button, Alert, Stack } from "@matriz/design-ui"
import type { TenantId } from "@matriz/foundation-types"
import { getSeumeiContainer } from "../../src/lib/container"
import { establishmentToCreateContractInput } from "../../src/integration/adapters/establishment-to-contract.adapter"

export function EstablishmentActions({
  establishmentId,
  establishmentName,
  tenantId,
}: {
  establishmentId: string
  establishmentName: string
  tenantId: TenantId
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "info" | "success" | "danger"; text: string } | null>(null)

  async function handleRequestContract() {
    try {
      setBusy(true)
      const { useCases, gateways } = getSeumeiContainer()
      const est = await useCases.getEstablishment(tenantId, establishmentId as never)
      if (!est) {
        setMessage({ tone: "danger", text: "Estabelecimento nao encontrado." })
        return
      }
      const input = establishmentToCreateContractInput(est, {
        counterpartyName: "Organizador Matriz",
        serviceDescription: `Locacao do espaco ${establishmentName} para evento.`,
      })
      const summary = await gateways.contracts.requestContractFromEstablishment(input)
      setMessage({ tone: "success", text: `Contrato solicitado: ${summary.id}` })
    } catch (err) {
      setMessage({ tone: "danger", text: `Falhou: ${(err as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={2}>
      <Button
        aria-describedby={message ? "contract-request-status" : undefined}
        variant="primary"
        size="sm"
        onClick={handleRequestContract}
        disabled={busy}
      >
        {busy ? "Enviando..." : "Solicitar contrato de prestacao"}
      </Button>
      {message ? (
        <Alert
          id="contract-request-status"
          tone={message.tone === "success" ? "success" : message.tone === "danger" ? "danger" : "info"}
        >
          <span aria-hidden="true">{message.tone === "success" ? "✓" : "!"}</span>{" "}
          <span>{message.text}</span>
        </Alert>
      ) : null}
    </Stack>
  )
}
