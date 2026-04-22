import type { ReactNode } from "react"

/**
 * Contracts-branded login frame. Serif + centered document column.
 * Deliberately different from Spot (card), Hub (dark slate), Seumei (split).
 */
export function LoginLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        fontFamily: "Georgia, ui-serif, serif",
        padding: "4rem 1.5rem 3rem",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <header style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.6875rem",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: "var(--color-muted-foreground)",
            }}
          >
            matriz · contracts
          </div>
          <h1
            style={{
              marginTop: "1.5rem",
              fontSize: "2.5rem",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--color-foreground)",
              lineHeight: 1.1,
            }}
          >
            {"Prezado(a),"}
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "1rem",
              color: "var(--color-muted-foreground)",
              lineHeight: 1.6,
            }}
          >
            {"Solicite um link magico para acessar os contratos da sua organizacao."}
          </p>
        </header>
        <div
          style={{
            padding: "2rem",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {children}
        </div>
        <footer
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.1em",
          }}
        >
          {"— matriz v1.1 · auth compartilhada —"}
        </footer>
      </div>
    </div>
  )
}
