import type { Meta, StoryObj } from "@storybook/react-vite"

import { Alert, Badge, Button, EmptyState, Inline, Stack } from "@matriz/design-ui"

const meta = {
  title: "MatrizLib/Components/Feedback",
  component: Alert,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Statuses: Story = {
  render: () => (
    <Inline gap={2}>
      <Badge>Rascunho</Badge>
      <Badge tone="brand">Em revisão</Badge>
      <Badge tone="success">Disponível</Badge>
      <Badge tone="warning">Atenção</Badge>
      <Badge tone="danger">Bloqueado</Badge>
    </Inline>
  ),
}

export const Success: Story = {
  args: {
    tone: "success",
    title: "Versão publicada",
    children: "O catálogo está disponível para os apps do workspace.",
  },
}

export const Error: Story = {
  args: {
    tone: "danger",
    title: "Publicação interrompida",
    children: "Dois contratos públicos não passaram pela verificação de compatibilidade.",
  },
}

export const LongContent: Story = {
  name: "Conteúdo longo",
  args: {
    tone: "warning",
    title: "Revisão necessária antes de continuar",
    children: "A alteração afeta componentes usados por múltiplas aplicações. Confirme o tema escuro, a densidade compacta, a navegação por teclado e os textos extensos antes de promover esta versão para o canal estável.",
  },
}

export const Empty: Story = {
  render: () => (
    <div className="catalog-specimen">
      <EmptyState
        title="Nenhuma verificação pendente"
        description="Novos resultados aparecerão aqui após a próxima execução do pipeline."
        action={<Button variant="secondary">Executar agora</Button>}
      />
    </div>
  ),
}

export const OperationalSequence: Story = {
  name: "Sequência operacional",
  globals: { theme: "dark", density: "compact" },
  render: () => (
    <Stack gap={3}>
      <Alert tone="info" title="Verificação iniciada">7 superfícies na fila.</Alert>
      <Alert tone="success" title="Contratos válidos">Tokens e exports públicos estão estáveis.</Alert>
      <Alert tone="warning" title="Revisão manual">Confirme o comportamento de foco do InfoHint.</Alert>
    </Stack>
  ),
}
