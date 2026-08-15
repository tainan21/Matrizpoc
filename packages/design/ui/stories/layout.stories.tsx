import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge, Container, Heading, Inline, Stack, Surface, Text } from "@matriz/design-ui"

const meta = {
  title: "MatrizLib/Components/Layout",
  component: Stack,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
} satisfies Meta<typeof Stack>

export default meta
type Story = StoryObj<typeof meta>

export const OperationalList: Story = {
  name: "Lista operacional",
  render: () => (
    <Container size="lg">
      <Stack gap={6}>
        <Stack gap={2}>
          <span className="catalog-kicker">Releases · hoje</span>
          <Heading level={2}>Fila de publicação</Heading>
          <Text tone="muted">Alterações prontas para revisão e promoção.</Text>
        </Stack>
        <Surface padding="none" aria-label="Fila de publicação">
          <div className="catalog-row">
            <Stack gap={1}><strong>design-ui</strong><Text size="sm" tone="muted">v0.1.0</Text></Stack>
            <Inline justify="between"><Text>Contrato base de componentes</Text><Badge tone="success">Pronto</Badge></Inline>
          </div>
          <div className="catalog-row">
            <Stack gap={1}><strong>matriz-hub</strong><Text size="sm" tone="muted">v1.4.0</Text></Stack>
            <Inline justify="between"><Text>Navegação de ambientes</Text><Badge tone="warning">Revisão</Badge></Inline>
          </div>
        </Surface>
      </Stack>
    </Container>
  ),
}

export const SurfaceHierarchy: Story = {
  name: "Hierarquia de superfícies",
  render: () => (
    <Stack gap={4}>
      <Surface variant="subtle"><Text>Canvas: contexto e orientação.</Text></Surface>
      <Surface><Text>Superfície: conteúdo principal.</Text></Surface>
      <Surface variant="raised"><Text>Elevada: atenção temporária.</Text></Surface>
    </Stack>
  ),
}

export const CompactMobile: Story = {
  name: "Compacto · mobile",
  globals: { density: "compact", theme: "dark" },
  parameters: { viewport: { defaultViewport: "mobile" } },
  render: () => (
    <Stack gap={4}>
      <Heading level={3}>Atividade recente</Heading>
      <div className="catalog-row">
        <Text size="sm">08:42</Text>
        <Text size="sm">Verificação de contratos concluída sem bloqueios.</Text>
      </div>
      <div className="catalog-row">
        <Text size="sm">08:39</Text>
        <Text size="sm">Tema escuro aplicado ao ambiente de homologação.</Text>
      </div>
    </Stack>
  ),
}
