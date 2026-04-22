import type { ReactNode } from "react"

/**
 * Hub-branded login frame — minimal, tipografico, dark slate. Deliberately
 * distinct from Spot/Seumei/Contracts/Willdash to show shared auth does
 * NOT enforce visual uniformity.
 */
export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "center",
        justifyItems: "center",
        padding: "2rem 1rem",
        background: "var(--surface)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--muted-fg)",
            }}
          >
            matriz / hub
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--surface-fg)",
              margin: 0,
            }}
          >
            Acesso central.
          </h1>
        </div>
        {children}
        <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", margin: 0 }}>
          {"Auth compartilhada. Identidade visual propria de cada app."}
        </p>
      </div>
    </div>
  )
}
