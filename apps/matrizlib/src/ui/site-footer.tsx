import { Inline, Text } from "@matriz/design-ui"
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Inline className="site-footer__inner" justify="between">
        <Text className="site-footer__signature" size="sm">
          MatrizLib / contratos visuais públicos
        </Text>
        <Inline className="site-footer__links" gap={4}>
          <Link href="/components">Catálogo</Link>
          <Link href="/architecture">Governança</Link>
          <a href="#top">Voltar ao topo ↑</a>
        </Inline>
      </Inline>
    </footer>
  )
}
