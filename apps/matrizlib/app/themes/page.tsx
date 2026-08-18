import type { Metadata } from "next"
import { Heading, Text } from "@matriz/design-ui"

import { ThemeLab } from "../../src/ui/theme/theme-lab"

export const metadata: Metadata = {
  title: "Temas",
  description: "Laboratório isolado dos temas canônicos do ecossistema Matriz.",
}

export default function ThemesPage() {
  return (
    <main className="themes-page" id="main-content">
      <header className="reference-masthead reference-masthead--themes">
        <Text className="eyebrow" size="xs">
          Registro canônico · sessão local
        </Text>
        <Heading level={1}>Temas</Heading>
        <Text tone="muted">
          Compare atmosfera, densidade e enquadramento sem mudar a aparência do portal nem
          criar uma segunda fonte de tokens.
        </Text>
      </header>

      <ThemeLab />
    </main>
  )
}
