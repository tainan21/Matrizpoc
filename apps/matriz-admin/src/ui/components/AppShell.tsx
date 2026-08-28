import Link from "next/link"
import { Container, Stack, Badge, ThemeToggle } from "@matriz/design-ui"
import { manifest } from "../../manifest/manifest"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/establishments", label: "Estabelecimentos" },
  { href: "/owners", label: "Proprietarios" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/distribution", label: "Distribuicao" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <Container>
          <div className="flex items-center justify-between gap-6 py-4">
            <Link href="/" className="flex items-center gap-3 text-surface-fg no-underline">
              <Badge tone="brand">Matriz Admin</Badge>
              <span className="text-sm text-muted-fg">{manifest.description}</span>
            </Link>
            <nav className="flex gap-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-surface-fg no-underline hover:text-brand"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <a
              href="http://localhost:3000"
              className="text-sm text-muted-fg no-underline hover:text-brand"
            >
              Voltar ao Hub
            </a>
            <ThemeToggle appId="matriz-admin" />
          </div>
        </Container>
      </header>
      <main className="flex-1 py-10">
        <Container>
          <Stack gap={6}>{children}</Stack>
        </Container>
      </main>
    </div>
  )
}
