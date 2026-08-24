import type { CSSProperties } from "react"
import { Badge, Button, Heading, Input, Label, Stack, Text } from "@matriz/design-ui"

export type ThemeLabDensity = "comfortable" | "compact"
export type ThemeLabViewport = "desktop" | "tablet" | "mobile"

interface ThemeSpecimenProps {
  readonly density: ThemeLabDensity
  readonly mode: "light" | "dark"
  readonly style: CSSProperties
  readonly themeLabel: string
  readonly viewport: ThemeLabViewport
}

export function ThemeSpecimen({
  density,
  mode,
  style,
  themeLabel,
  viewport,
}: ThemeSpecimenProps) {
  return (
    <div className="theme-lab__viewport" data-viewport={viewport} data-testid="theme-viewport">
      <section
        aria-label={`Espécime ${themeLabel}, modo ${mode}`}
        className="theme-specimen"
        data-density={density}
        data-mode={mode}
        data-testid="theme-specimen"
        style={style}
      >
        <header className="theme-specimen__bar">
          <span className="theme-specimen__brand">M/ interface</span>
          <Badge tone="neutral">{themeLabel}</Badge>
        </header>

        <div className="theme-specimen__body">
          <Stack className="theme-specimen__copy" gap={4}>
            <Text className="theme-specimen__eyebrow" size="xs">
              Ambiente isolado · sem persistência
            </Text>
            <Heading level={2}>Decisões claras começam por contratos visuais claros.</Heading>
            <Text tone="muted">
              Cor, contraste e hierarquia respondem às variáveis canônicas sem alterar o tema
              do portal ao redor.
            </Text>
            <Button type="button">Ação principal</Button>
          </Stack>

          <div className="theme-specimen__workbench">
            <div className="theme-specimen__metric">
              <span>Contrato</span>
              <strong>v1</strong>
              <small>superfície estável</small>
            </div>
            <div className="theme-specimen__field">
              <Label htmlFor="theme-lab-example">Nome da referência</Label>
              <Input defaultValue="Componente auditado" id="theme-lab-example" readOnly />
            </div>
          </div>
        </div>

        <footer className="theme-specimen__tokens" aria-label="Amostra de tokens semânticos">
          <span>
            <i className="theme-specimen__swatch theme-specimen__swatch--action" />
            action
          </span>
          <span>
            <i className="theme-specimen__swatch theme-specimen__swatch--surface" />
            surface
          </span>
          <span>
            <i className="theme-specimen__swatch theme-specimen__swatch--muted" />
            muted
          </span>
          <span>
            <i className="theme-specimen__swatch theme-specimen__swatch--border" />
            border
          </span>
        </footer>
      </section>
    </div>
  )
}
