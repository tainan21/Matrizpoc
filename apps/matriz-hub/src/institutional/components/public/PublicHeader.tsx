import Link from "next/link"

export function PublicHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/public" className="flex items-center gap-2 no-underline">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold"
            style={{ background: "#111827", color: "#fff" }}
          >
            M
          </div>
          <span className="text-sm font-semibold tracking-tight text-surface-fg">
            Matriz
          </span>
          <span className="hidden text-xs text-muted-fg sm:inline">
            · ecossistema institucional
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#projects" className="text-muted-fg no-underline hover:text-surface-fg">
            Projetos
          </a>
          <a href="#stats" className="text-muted-fg no-underline hover:text-surface-fg">
            Ecossistema
          </a>
          <Link
            href="/"
            className="rounded-md border border-border px-3 py-1 text-surface-fg no-underline hover:bg-muted"
          >
            Acessar Hub
          </Link>
        </nav>
      </div>
    </header>
  )
}
