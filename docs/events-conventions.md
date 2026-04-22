# Events Conventions

> Esqueleto. Expandido em CP-2.

## Nomeação

`<dominio>.<entidade>.<verbo>` em lowercase.

## Eventos obrigatórios da V1

- `onboarding.completed`
- `spot.gig.created`
- `seumei.establishment.selected`
- `contract.created`
- `contract.linked`
- `hub.app.opened`

## Envelope

\`\`\`ts
interface EventEnvelope<TName extends string, TPayload> {
  id: string
  name: TName
  version: "v1"
  tenantId: string
  sourceApp: string
  occurredAt: string  // ISO
  payload: TPayload
}
\`\`\`

## Bus

`packages/integration/events` expõe `emit`, `on`, `off`, `history`.
Em CP-2 ele será híbrido: in-memory server-side + BroadcastChannel +
localStorage client-side para permitir que apps rodando em portas
diferentes vejam eventos um do outro.
