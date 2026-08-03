import type { ReactNode } from "react"
import type { MatrizAppId } from "@matriz/foundation-constants"
import { ThemeToggle } from "./theme-controller"

export interface MatrizAuthLayoutProps {
  appId: MatrizAppId
  product: string
  productLabel: string
  mark: string
  version?: string
  eyebrow: string
  headline: string
  description: string
  panelEyebrow?: string
  panelTitle: string
  footer: string
  children: ReactNode
}

export function MatrizAuthLayout({
  appId,
  product,
  productLabel,
  mark,
  version = "Matriz / 01",
  eyebrow,
  headline,
  description,
  panelEyebrow = "Acesso protegido",
  panelTitle,
  footer,
  children,
}: MatrizAuthLayoutProps) {
  const variant = appId === "matriz-hub" ? "hub" : appId

  return (
    <div className={`matriz-auth-layout auth-${variant}`}>
      <aside className="matriz-auth-story" aria-label={product}>
        <div className="matriz-auth-topline">
          <div className="matriz-auth-brand">
            <span className="matriz-auth-mark" aria-hidden="true">{mark}</span>
            <span className="matriz-auth-brand-copy">
              <strong>{product}</strong>
              <small>{productLabel}</small>
            </span>
          </div>
          <span className="matriz-auth-version">{version}</span>
        </div>

        <div className="matriz-auth-statement">
          <p className="matriz-auth-kicker">{eyebrow}</p>
          <h1>{headline}</h1>
          <p>{description}</p>
        </div>

        <div className="matriz-auth-system" aria-label="Matriz Design System">
          <div className="matriz-auth-system-head">
            <strong>Matriz Design System</strong>
            <span>Light + Dark</span>
          </div>
          <div className="matriz-auth-palette">
            <strong>Aa</strong>
            <span className="matriz-auth-swatches" aria-label="Cores semânticas">
              <i title="Accent" /><i title="Success" /><i title="Warning" /><i title="Neutral" />
            </span>
          </div>
          <div className="matriz-auth-system-rules" aria-hidden="true">
            <span>Tipografia</span><span>Cor semântica</span><span>Ritmo 4px</span>
          </div>
        </div>
      </aside>

      <main className="matriz-auth-access">
        <div className="matriz-auth-access-head">
          <span className="matriz-auth-local">Ecossistema Matriz</span>
          <ThemeToggle appId={appId} />
        </div>
        <div className="matriz-auth-panel">
          <p className="matriz-auth-panel-label">{panelEyebrow}</p>
          <h2 className="matriz-auth-panel-title">{panelTitle}</h2>
          {children}
        </div>
        <p className="matriz-auth-footer">{footer}</p>
      </main>
    </div>
  )
}
