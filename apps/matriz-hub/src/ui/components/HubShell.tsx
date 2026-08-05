import type { ReactNode } from "react"
import Link from "next/link"
import { Container, ThemeToggle } from "@matriz/design-ui"
import { manifest as hubManifest } from "../../manifest/manifest"

const navItems = hubManifest.routes

export function HubShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          padding: "1.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.125rem",
              color: "var(--color-foreground)",
            }}
          >
            Matriz Hub
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted-foreground)",
              marginTop: 4,
            }}
          >
            {`v${hubManifest.version} · contract ${hubManifest.contractVersion}`}
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: "block",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-md)",
                color: "var(--color-foreground)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: "auto" }}>
          <ThemeToggle appId="matriz-hub" />
        </div>
      </aside>
      <main style={{ flex: 1, padding: "2rem" }}>
        <Container>{children}</Container>
      </main>
    </div>
  )
}
