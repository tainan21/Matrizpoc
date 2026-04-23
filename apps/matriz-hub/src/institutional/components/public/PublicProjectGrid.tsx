import type { ProjectListItemVM } from "../../presenters"

export function PublicProjectGrid({ vms }: { vms: readonly ProjectListItemVM[] }) {
  if (vms.length === 0) {
    return (
      <section id="projects" className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-muted-fg">
            Nenhum projeto publico disponivel no momento.
          </p>
        </div>
      </section>
    )
  }
  return (
    <section id="projects" className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-pretty text-2xl font-semibold tracking-tight text-surface-fg">
            Projetos da rede Matriz
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-fg">
            Cada projeto publica branding, capacidades e saude sob o mesmo
            contrato institucional. Apps internos e fontes externas convivem
            sob o mesmo shape.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vms.map((vm) => (
            <article
              key={vm.projectId}
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md"
            >
              <div className="h-1" style={{ background: vm.brandPrimaryColor }} />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <header className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-xs font-semibold"
                    style={{ background: vm.brandPrimaryColor, color: "#fff" }}
                  >
                    {vm.logoText}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-surface-fg">
                      {vm.displayName}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-fg">
                      {vm.sourceTypeLabel}
                    </div>
                  </div>
                </header>

                {vm.tagline ? (
                  <p className="text-sm leading-relaxed text-muted-fg">
                    {vm.tagline}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-fg">
                    {vm.trustLevelLabel}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: `${vm.brandPrimaryColor}15`,
                      color: vm.brandPrimaryColor,
                    }}
                  >
                    {`${vm.healthLabel} · ${vm.readinessScore}`}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
