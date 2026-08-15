import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Button, Inline, Stack, Text } from "@matriz/design-ui"

const meta = {
  title: "MatrizLib/Components/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
  args: {
    children: "Salvar alterações",
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <Inline gap={3}>
      <Button variant="primary">Publicar versão</Button>
      <Button variant="secondary">Revisar depois</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="link">Ver histórico</Button>
    </Inline>
  ),
}

export const Hover: Story = {
  name: "Hover real",
  parameters: {
    pseudo: { hover: ["button"] },
  },
}

export const Focus: Story = {
  name: "Foco por teclado",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Salvar alterações" })).toHaveFocus()
  },
}

export const Disabled: Story = {
  args: {
    children: "Acesso indisponível",
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    "aria-busy": true,
    children: (
      <span>
        <span className="catalog-loading-dot" aria-hidden="true" />
        Sincronizando catálogo
      </span>
    ),
    disabled: true,
  },
}

export const CompactDark: Story = {
  name: "Compacto · escuro",
  globals: {
    density: "compact",
    theme: "dark",
  },
  render: () => (
    <Stack gap={3} align="start">
      <Text size="sm" tone="muted">Última atualização há 2 minutos</Text>
      <Inline gap={2}>
        <Button size="sm">Executar verificação</Button>
        <Button size="sm" variant="secondary">Abrir log</Button>
      </Inline>
    </Stack>
  ),
}
