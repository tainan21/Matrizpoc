import { Inline, ThemeToggle } from "@matriz/design-ui"
import Link from "next/link"

const primaryNavigation = [
  { href: "/components", label: "Componentes" },
  { href: "/themes", label: "Temas" },
  { href: "/sounds", label: "Sons" },
] as const

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <Inline className="site-header__inner" justify="between" wrap={false}>
        <Link aria-label="MatrizLib — início" className="site-header__brand" href="/">
          <span aria-hidden="true" className="site-header__mark">
            M/
          </span>
          <span>MatrizLib</span>
        </Link>

        <Inline className="site-header__actions" gap={3} justify="end" wrap>
          <div className="site-header__navigation">
            <nav aria-label="Navegação principal" className="site-header__nav">
              <Inline gap={4} wrap>
                {primaryNavigation.map((item) => (
                  <Link href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </Inline>
            </nav>
            <nav aria-label="Navegação técnica" className="site-header__technical">
              <Inline gap={2} wrap>
                <Link href="/architecture">Arquitetura</Link>
              </Inline>
            </nav>
          </div>
          <ThemeToggle appId="matrizlib" className="site-header__theme" />
        </Inline>
      </Inline>
    </header>
  )
}
