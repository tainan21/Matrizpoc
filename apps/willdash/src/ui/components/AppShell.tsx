import type { ReactNode } from "react"
import { Container, Stack, Heading, Text } from "@matriz/design-ui"

interface AppShellProps {
  title: string
  description?: string
  children: ReactNode
}

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/telemetry", label: "Telemetria bruta" },
  { href: "/onboarding", label: "Onboarding" },
]

export function WilldashAppShell({ title, description, children }: AppShellProps) {
  return (
    <Container>
      <Stack gap={6}>
        <header>
          <Stack gap={2}>
            <Text size="sm" tone="muted">
              Matriz / Willdash
            </Text>
            <Heading level={1}>{title}</Heading>
            {description ? <Text tone="muted">{description}</Text> : null}
          </Stack>
          <nav aria-label="Navegacao principal">
            <Stack direction="row" gap={4}>
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}
                >
                  {item.label}
                </a>
              ))}
            </Stack>
          </nav>
        </header>
        <main>{children}</main>
      </Stack>
    </Container>
  )
}
