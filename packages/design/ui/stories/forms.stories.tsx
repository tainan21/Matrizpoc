import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { FormField, Input, Stack } from "@matriz/design-ui"

const meta = {
  title: "MatrizLib/Components/Forms",
  component: FormField,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
  args: {
    id: "workspace-name",
    label: "Nome do workspace",
    helper: "Visível para as pessoas com acesso a este ambiente.",
    children: <Input placeholder="Operação Sudeste" />,
  },
  decorators: [
    (Story) => (
      <div className="catalog-frame catalog-measure">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
}

export const Focus: Story = {
  name: "Foco por teclado",
  args: {
    id: "release-channel",
    label: "Canal de publicação",
    helper: "Use um nome curto e reconhecível.",
    children: <Input placeholder="stable" />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await expect(canvas.getByRole("textbox", { name: "Canal de publicação" })).toHaveFocus()
  },
}

export const Error: Story = {
  args: {
    id: "environment-url",
    label: "URL do ambiente",
    helper: "Informe a origem completa, incluindo HTTPS.",
    error: "A origem precisa começar com https://.",
    children: <Input defaultValue="matriz.local" />,
  },
}

export const Disabled: Story = {
  args: {
    id: "owner-team",
    label: "Time responsável",
    helper: "Gerenciado pelo contrato de acesso do workspace.",
    children: <Input defaultValue="Plataforma" disabled />,
  },
}

export const LongContent: Story = {
  name: "Conteúdo longo",
  args: {
    id: "change-summary",
    label: "Resumo público da alteração que será exibido no histórico de versões e nas revisões operacionais",
    helper: "Descreva o impacto para quem opera o sistema, a condição de reversão e qualquer dependência que precise ser verificada antes da publicação.",
    children: <Input placeholder="Ex.: ajusta o contrato visual do seletor de tenant" />,
  },
}

export const CompactMobile: Story = {
  name: "Compacto · mobile",
  globals: { density: "compact" },
  parameters: { viewport: { defaultViewport: "mobile" } },
  render: () => (
    <Stack gap={3}>
      <FormField id="app" label="Aplicação">
        <Input defaultValue="Matriz Hub" />
      </FormField>
      <FormField id="version" label="Versão" helper="Formato semântico.">
        <Input defaultValue="1.4.0" />
      </FormField>
    </Stack>
  ),
}
