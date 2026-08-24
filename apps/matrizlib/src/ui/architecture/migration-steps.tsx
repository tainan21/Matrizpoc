import { Heading, Text } from "@matriz/design-ui"

const migrationSteps = [
  {
    index: "01",
    title: "Inventariar no app",
    detail: "Nomeie o comportamento, o owner, a superfície atual e os consumidores reais antes de mover qualquer arquivo.",
  },
  {
    index: "02",
    title: "Provar a promoção",
    detail: "Exija dois consumidores, ausência de domínio forte, API estável e redução concreta de manutenção.",
  },
  {
    index: "03",
    title: "Publicar o contrato",
    detail: "Defina export público, metadata, história e ownership. Mantenha aliases legados enquanto houver consumidor auditado.",
  },
  {
    index: "04",
    title: "Testar a superfície",
    detail: "Cubra comportamento, teclado, foco, contraste, conteúdo longo, light/dark, movimento reduzido e viewports suportados.",
  },
  {
    index: "05",
    title: "Migrar incrementalmente",
    detail: "Troque imports por app, rode validações focadas e preserve rollback. Remova somente depois do inventário final.",
  },
] as const

export function MigrationSteps() {
  return (
    <section aria-labelledby="migration-title" className="migration-guide">
      <header className="architecture-section__intro">
        <Text className="eyebrow" size="xs">
          Promoção com evidência
        </Text>
        <Heading id="migration-title" level={2}>
          Do uso local ao contrato público, uma fronteira por vez.
        </Heading>
      </header>

      <ol className="migration-guide__steps">
        {migrationSteps.map((step) => (
          <li key={step.index}>
            <span>{step.index}</span>
            <Heading level={3}>{step.title}</Heading>
            <p>{step.detail}</p>
          </li>
        ))}
      </ol>

      <aside aria-labelledby="external-reference-title" className="external-reference">
        <span aria-hidden="true" className="external-reference__mark">R/</span>
        <div>
          <Text className="eyebrow" size="xs">
            Limite externo
          </Text>
          <Heading id="external-reference-title" level={3}>
            Referência não é dependência.
          </Heading>
        </div>
        <div>
          <code>C:\Apps\matrizlibUI</code>
          <p>
            Serve somente para consulta histórica e comparação. Não entra em runtime, alias,
            import, cópia em massa ou fonte canônica. Qualquer ideia útil recomeça pelo
            inventário, recebe owner, contrato público, testes, revisão de acessibilidade e
            rollback.
          </p>
        </div>
      </aside>
    </section>
  )
}
