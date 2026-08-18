import { Heading, Text } from "@matriz/design-ui"
import Link from "next/link"

import type { ComponentCatalogDetailViewModel } from "../../catalog/presenters"
import { ComponentPreview } from "./component-preview"

function ReferenceList({
  title,
  items,
}: {
  readonly title: string
  readonly items: readonly string[]
}) {
  if (items.length === 0) return null

  return (
    <section className="component-reference-group">
      <Heading level={2}>{title}</Heading>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export function ComponentDetail({
  component,
}: {
  readonly component: ComponentCatalogDetailViewModel
}) {
  return (
    <article className="component-detail">
      <Link className="component-detail__back" href="/components">
        <span aria-hidden="true">←</span> Voltar ao catálogo
      </Link>

      <header className="component-detail__header">
        <div className="component-detail__identity">
          <span>{component.id}</span>
          <span>{component.categoryLabel}</span>
          <span className={`catalog-stage catalog-stage--${component.stage}`}>
            {component.stageLabel}
          </span>
        </div>
        <Heading level={1}>{component.name}</Heading>
        <Text tone="muted">{component.description}</Text>
      </header>

      <ComponentPreview component={component} />

      {component.stage === "available" ? (
        <section className="component-contract" aria-labelledby="contract-title">
          <div>
            <span className="eyebrow">Contrato público</span>
            <Heading id="contract-title" level={2}>
              Pronto para composição.
            </Heading>
          </div>
          <dl>
            <div>
              <dt>Status do pacote</dt>
              <dd>{component.packageStatus}</dd>
            </div>
            <div>
              <dt>Origem</dt>
              <dd>{component.source}</dd>
            </div>
          </dl>
          {component.importStatement ? <code>{component.importStatement}</code> : null}
        </section>
      ) : (
        <section className="component-contract component-contract--candidate">
          <div>
            <span className="eyebrow">
              {component.hasAuditedPublicExport
                ? "Metadata do catálogo pendente"
                : "Contrato ainda não publicado"}
            </span>
            <Heading level={2}>Documentação, não promessa de API.</Heading>
          </div>
          {component.hasAuditedPublicExport ? (
            <Text>
              Este candidato possui export público auditado, mas ainda não está qualificado por um
              metadata canônico no catálogo. Por isso, esta página não publica import nem preview ao
              vivo.
            </Text>
          ) : (
            <Text>
              Este candidato não possui export público, import documentado ou comportamento de
              runtime. A anatomia acima registra intenção para avaliação.
            </Text>
          )}
        </section>
      )}

      <div className="component-reference">
        <ReferenceList title="Tokens" items={component.tokens} />
        <ReferenceList title="Acessibilidade" items={component.accessibility} />
        <ReferenceList title="Relacionados" items={component.related} />
      </div>

      <section className="component-evidence" aria-labelledby="evidence-title">
        <span className="eyebrow">Decisão de compartilhamento</span>
        <Heading id="evidence-title" level={2}>
          Evidência e fronteira
        </Heading>
        <dl>
          <div>
            <dt>Evidência atual</dt>
            <dd>{component.evidence}</dd>
          </div>
          <div>
            <dt>Consumidores potenciais</dt>
            <dd>{component.potentialConsumers}</dd>
          </div>
          <div>
            <dt>Limite de domínio</dt>
            <dd>{component.domainBoundary}</dd>
          </div>
          <div>
            <dt>Qualificação</dt>
            <dd>{component.qualificationLabel}</dd>
          </div>
        </dl>
      </section>
    </article>
  )
}
