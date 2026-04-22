import { Card, CardHeader, CardTitle, Text, Stack, Badge, EmptyState } from "@matriz/design-ui"
import { asTenantId } from "@matriz/foundation-types"
import { ContractsAppShell } from "../../src/ui/components/AppShell"
import { getContractsContainer } from "../../src/lib/container"
import { toContractViewModel } from "../../src/ui/presenters/contract.presenter"

const TENANT = asTenantId("tenant-acme")

export default async function ContractsListPage() {
  const useCases = getContractsContainer()
  const contracts = await useCases.listContracts(TENANT)
  const vms = contracts.map(toContractViewModel)

  return (
    <ContractsAppShell
      title="Contratos"
      description="Lista de contratos do tenant Acme."
    >
      {vms.length === 0 ? (
        <EmptyState title="Nenhum contrato" description="Contratos criados pelos apps aparecem aqui." />
      ) : (
        <Stack gap={4}>
          {vms.map((vm) => (
            <Card key={vm.id}>
              <CardHeader>
                <Stack direction="row" gap={4} align="center">
                  <CardTitle style={{ flex: 1 }}>{vm.title}</CardTitle>
                  <Badge tone={vm.statusTone}>{vm.statusLabel}</Badge>
                </Stack>
              </CardHeader>
              <Stack gap={2}>
                <Text>Origem: {vm.originLabel}</Text>
                <Text>Valor: {vm.amountDisplay}</Text>
                <Text>Vigencia: {vm.effectiveFromDisplay}</Text>
                {vm.externalReference ? (
                  <Text size="sm" tone="muted">
                    Ref. externa: {vm.externalReference}
                  </Text>
                ) : null}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </ContractsAppShell>
  )
}
