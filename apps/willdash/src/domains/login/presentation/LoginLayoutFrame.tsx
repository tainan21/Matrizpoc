import type { ReactNode } from "react"

/**
 * Willdash-branded login frame. Dashboard-feel: metric-tile header + form.
 * Deliberately different from Spot, Hub, Seumei, Contracts.
 */
export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        fontFamily: "ui-monospace, monospace",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            border: "1px solid var(--color-border)",
            padding: "1rem",
            background: "var(--color-surface)",
          }}
        >
          <MetricTile label="auth" value="shared" />
          <MetricTile label="app" value="willdash" />
          <MetricTile label="v" value="1.1" />
        </header>
        <div
          style={{
            border: "1px solid var(--color-border)",
            padding: "1.5rem",
            background: "var(--color-surface)",
          }}
        >
          <div
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--color-muted-foreground)",
              marginBottom: "0.75rem",
            }}
          >
            sign_in / required
          </div>
          {children}
        </div>
        <footer
          style={{
            fontSize: "0.6875rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-muted-foreground)",
            textAlign: "center",
          }}
        >
          matriz · willdash · auth-v1.1 · ui-local
        </footer>
      </div>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span
        style={{
          fontSize: "0.625rem",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "var(--color-muted-foreground)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "1rem", color: "var(--color-foreground)" }}>{value}</span>
    </div>
  )
}
