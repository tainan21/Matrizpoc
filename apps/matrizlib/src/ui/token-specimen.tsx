import { Button, Heading, Inline, Stack, Text } from "@matriz/design-ui"

const tokenRows = [
  { name: "--matriz-color-action", role: "Ação", swatch: "action" },
  { name: "--matriz-color-surface", role: "Superfície", swatch: "surface" },
  { name: "--matriz-color-text", role: "Texto", swatch: "text" },
  { name: "--matriz-color-border", role: "Divisor", swatch: "border" },
] as const

export function TokenSpecimen() {
  return (
    <div aria-label="Demonstração de tokens e componentes canônicos" className="token-specimen">
      <div className="token-specimen__rail" aria-hidden="true">
        01—04 / semantic layer
      </div>

      <Stack className="token-specimen__preview" gap={8}>
        <Stack gap={3}>
          <Text className="eyebrow" size="xs">
            Composição ao vivo
          </Text>
          <Heading className="token-specimen__heading" level={3}>
            Uma interface que fala a língua dos tokens.
          </Heading>
          <Text className="token-specimen__copy" tone="muted">
            Tipografia, espaço, ação e contraste respondem ao mesmo contrato público.
          </Text>
        </Stack>

        <Inline gap={3}>
          <form action="/components">
            <Button aria-describedby="specimen-note" size="lg" type="submit">
              Abrir catálogo
            </Button>
          </form>
          <Text className="token-specimen__note" id="specimen-note" size="sm" tone="muted">
            Button · stable
          </Text>
        </Inline>
      </Stack>

      <div className="token-specimen__tokens">
        {tokenRows.map((token, index) => (
          <div className="token-row" key={token.name}>
            <span className="token-row__index">0{index + 1}</span>
            <span aria-hidden="true" className={`token-row__swatch token-row__swatch--${token.swatch}`} />
            <code>{token.name}</code>
            <span>{token.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
