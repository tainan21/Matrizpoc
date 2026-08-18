import { Inline, ThemeToggle } from "@matriz/design-ui"
import Link from "next/link"

const navigation = [
  { href: "/components", label: "Componentes" },
  { href: "/themes", label: "Temas" },
  { href: "/architecture", label: "Arquitetura" },
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

        <Inline className="site-header__actions" gap={4} justify="end" wrap={false}>
          <nav aria-label="Navegação principal" className="site-header__nav">
            <Inline gap={4} wrap={false}>
              {navigation.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </Inline>
          </nav>
          <ThemeToggle appId="matrizlib" className="site-header__theme" />
        </Inline>
      </Inline>
    </header>
  )
}
