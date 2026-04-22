import type { ReactNode } from "react"

/**
 * Seumei-branded login frame. Split layout: left intro (brand), right form.
 * Visual distinct from Spot, Hub, Contracts, Willdash.
 */
export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        background: "var(--color-background)",
      }}
    >
      <aside
        style={{
          display: "none",
          padding: "3rem 2.5rem",
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
        className="md:flex md:flex-col md:justify-between"
      >
        <div>
          <div
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--color-muted-foreground)",
            }}
          >
            matriz / seumei
          </div>
          <h1
            style={{
              marginTop: "2rem",
              fontSize: "2.25rem",
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--color-foreground)",
            }}
          >
            {"Operacao real de estabelecimentos."}
          </h1>
          <p
            style={{
              marginTop: "1rem",
              color: "var(--color-muted-foreground)",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              maxWidth: 380,
            }}
          >
            {"Seumei e a ponta operacional do ecossistema Matriz. Entre com o email da operacao para receber um codigo."}
          </p>
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
          }}
        >
          {"Auth compartilhada. UI propria do Seumei."}
        </div>
      </aside>
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
      </main>
    </div>
  )
}
