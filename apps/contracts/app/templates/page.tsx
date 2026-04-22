import { Card, CardHeader, CardTitle, CardDescription, Stack, Badge } from "@matriz/design-ui"
import { asTenantId } from "@matriz/foundation-types"
import { ContractsAppShell } from "../../src/ui/components/AppShell"
import { createInMemoryContractTemplateRepository } from "../../src/mock/repositories"

const TENANT = asTenantId("tenant-acme")

export default async function TemplatesPage() {
  const repo = createInMemoryContractTemplateRepository()
  const templates = await repo.list(TENANT)

  return (
    <ContractsAppShell
      title="Templates"
      description="Modelos usados pelos adaptadores DTO -> Contract."
    >
      <Stack gap={4}>
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <Stack direction="row" gap={4} align="center">
                <CardTitle style={{ flex: 1 }}>{t.name}</CardTitle>
                <Badge tone={t.active ? "success" : "neutral"}>{t.active ? "ativo" : "inativo"}</Badge>
                <Badge tone="brand">{t.category}</Badge>
              </Stack>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </Stack>
    </ContractsAppShell>
  )
}
