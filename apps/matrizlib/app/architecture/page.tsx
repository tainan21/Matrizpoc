import type { Metadata } from "next"
import { Heading, Text } from "@matriz/design-ui"

import { MigrationSteps } from "../../src/ui/architecture/migration-steps"
import { PackageMap } from "../../src/ui/architecture/package-map"

export const metadata: Metadata = {
  title: "Arquitetura",
  description: "Mapa de ownership e guia de promoção incremental da MatrizLib.",
}

export default function ArchitecturePage() {
  return (
    <main className="architecture-page" id="main-content">
      <header className="reference-masthead reference-masthead--architecture">
        <Text className="eyebrow" size="xs">
          Limites antes de abstrações
        </Text>
        <Heading level={1}>Arquitetura</Heading>
        <Text tone="muted">
          Um mapa operacional para manter tokens, componentes e decisões de produto em suas
          camadas corretas.
        </Text>
      </header>

      <PackageMap />
      <MigrationSteps />
    </main>
  )
}
