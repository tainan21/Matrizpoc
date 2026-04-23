export function PublicFooter() {
  return (
    <footer className="bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-xs text-muted-fg sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <strong className="text-surface-fg">Matriz</strong> · superficie
          publica gerada automaticamente a partir do InstitutionalRegistry
          (contract v1, institutional).
        </div>
        <div className="flex items-center gap-4">
          <span>leis arquiteturais L1–L12</span>
          <span>·</span>
          <span>contract v1/institutional</span>
        </div>
      </div>
    </footer>
  )
}
