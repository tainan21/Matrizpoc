import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { InfoHint, Inline, Stack, Text } from "@matriz/design-ui"

const meta = {
  title: "MatrizLib/Components/InfoHint",
  component: InfoHint,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
  args: {
    label: "Entender canal estável",
    children: "Canal recomendado para versões aprovadas em revisão e acessibilidade.",
  },
  decorators: [
    (Story) => (
      <div className="catalog-specimen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InfoHint>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Focus: Story = {
  name: "Aberto por foco",
  render: (args) => (
    <Inline gap={2}>
      <Text>Canal estável</Text>
      <InfoHint {...args} />
    </Inline>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Entender canal estável" })).toHaveFocus()
    await expect(canvas.getByRole("tooltip")).toBeVisible()
  },
}

export const KeyboardDismissal: Story = {
  name: "Fechamento com Escape",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Entender canal estável" })
    await userEvent.tab()
    await expect(canvas.getByRole("tooltip")).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument()
    await expect(trigger).toHaveFocus()
  },
}

export const LongContent: Story = {
  name: "Conteúdo longo",
  args: {
    label: "Entender impacto da alteração",
    children: "Esta mudança será aplicada ao próximo ciclo de publicação e precisa ser revisada nos temas claro e escuro, em densidade compacta e com preferência de movimento reduzido.",
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Entender impacto da alteração" }))
  },
}

export const CompactDark: Story = {
  name: "Compacto · escuro",
  globals: { density: "compact", theme: "dark" },
  render: (args) => (
    <Stack gap={2} align="start">
      <span className="catalog-kicker">Contrato público</span>
      <Inline gap={2}>
        <Text>@matriz/design-ui</Text>
        <InfoHint {...args}>Importe apenas pelo barrel público do pacote.</InfoHint>
      </Inline>
    </Stack>
  ),
}
