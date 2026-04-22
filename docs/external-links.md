# External Links

> Esqueleto. Expandido em CP-2/CP-5.

Conceito único que conecta entidades de apps diferentes sem
acoplamento direto.

## Shape

\`\`\`ts
interface ExternalLink {
  id: string
  tenantId: string
  localApp: string         // app que "possui" a entidade local
  localEntityType: string  // ex: "contract"
  localEntityId: string
  externalApp: string      // ex: "spot"
  externalEntityType: string // ex: "gig"
  externalEntityId: string
  relationType: string     // ex: "source", "attachment", "reference"
  snapshot: Record<string, unknown> | null
  createdAt: string
}
\`\`\`

## Uso típico

Um `Contract` referencia uma `Gig` do Spot e um `Establishment` da Seumei
através de dois external links. Apps nunca importam entidades
uns dos outros — só lidam com links + snapshots.
