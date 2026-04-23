export interface PublicHeroProps {
  totalPublic: number
  internalCount: number
  institutionalCount: number
}

export function PublicHero({
  totalPublic,
  internalCount,
  institutionalCount,
}: PublicHeroProps) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-fg">
              Rede Matriz · v1.2 institucional
            </span>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-surface-fg sm:text-5xl">
              Uma rede de produtos, ventures e fontes operando sob o mesmo
              contrato institucional.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-fg sm:text-lg">
              O ecossistema Matriz consolida apps internos, fontes externas e
              registries institucionais em uma camada publica comum: branding,
              saude, capacidades de integracao e metricas abertas.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 sm:gap-8">
            <Stat label="Projetos publicos" value={totalPublic} />
            <Stat label="Apps internos" value={internalCount} />
            <Stat label="Fontes institucionais" value={institutionalCount} />
          </dl>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-fg">{label}</dt>
      <dd className="text-3xl font-semibold text-surface-fg sm:text-4xl">
        {value}
      </dd>
    </div>
  )
}
