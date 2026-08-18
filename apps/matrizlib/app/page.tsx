import { Heading, Inline, Stack, Text } from "@matriz/design-ui"
import Link from "next/link"

import { componentCatalog } from "../src/catalog/component-catalog"
import { Reveal } from "../src/ui/reveal"
import { TokenSpecimen } from "../src/ui/token-specimen"

const availableCount = componentCatalog.filter((entry) => entry.stage === "available").length
const qualifiedCount = componentCatalog.filter(
  (entry) => entry.qualification === "qualified",
).length

const authorityRows = [
  {
    index: "01",
    title: "Design system",
    description: "Tokens semânticos definem cor, espaço, tipografia e movimento.",
    path: "@matriz/design-system",
  },
  {
    index: "02",
    title: "Design UI",
    description: "Primitivos estáveis compõem interfaces sem carregar domínio de produto.",
    path: "@matriz/design-ui",
  },
  {
    index: "03",
    title: "MatrizLib",
    description: "O portal demonstra contratos públicos; não os duplica nem os redefine.",
    path: "apps/matrizlib",
  },
] as const

export default function HomePage() {
  return (
    <main id="main-content">
      <section aria-labelledby="hero-title" className="hero">
        <div className="hero__grid" aria-hidden="true" />
        <div className="hero__orbit" aria-hidden="true">
          <span>token</span>
          <span>component</span>
          <span>contract</span>
        </div>

        <Stack className="hero__content" gap={6}>
          <Text className="hero__kicker" size="sm">
            Laboratório editorial · Matriz design
          </Text>
          <Heading className="hero__title" id="hero-title" level={1}>
            MatrizLib
          </Heading>
          <Text className="hero__statement" size="lg">
            A referência viva para construir interfaces Matriz com clareza, consistência e
            fronteiras explícitas.
          </Text>
          <Inline className="hero__actions" gap={3}>
            <Link className="action-link action-link--primary" href="/components">
              Explorar componentes <span aria-hidden="true">↗</span>
            </Link>
            <Link className="action-link" href="/architecture">
              Ler arquitetura <span aria-hidden="true">→</span>
            </Link>
          </Inline>
        </Stack>

        <div className="hero__proof" aria-label="Resumo do catálogo">
          <div>
            <strong>{String(componentCatalog.length).padStart(2, "0")}</strong>
            <span>componentes auditados</span>
          </div>
          <div>
            <strong>{String(availableCount).padStart(2, "0")}</strong>
            <span>contratos publicados</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="authority-title" className="editorial-section authority-section">
        <Reveal className="section-intro">
          <Text className="eyebrow" size="xs">
            Autoridade por camada
          </Text>
          <Heading id="authority-title" level={2}>
            A fonte certa,
            <br /> no lugar certo.
          </Heading>
          <Text tone="muted">
            O portal aponta para as APIs canônicas e mantém conteúdo explicativo local.
          </Text>
        </Reveal>

        <div className="authority-list">
          {authorityRows.map((row) => (
            <Reveal className="authority-row" key={row.index}>
              <span className="authority-row__index">{row.index}</span>
              <Heading level={3}>{row.title}</Heading>
              <Text tone="muted">{row.description}</Text>
              <code>{row.path}</code>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="specimen-title" className="specimen-section">
        <Reveal className="specimen-section__intro">
          <Text className="eyebrow" size="xs">
            Specimen 001
          </Text>
          <Heading id="specimen-title" level={2}>
            O contrato aparece antes do ornamento.
          </Heading>
        </Reveal>
        <Reveal>
          <TokenSpecimen />
        </Reveal>
      </section>

      <section aria-labelledby="themes-title" className="theme-section">
        <Reveal className="theme-section__content">
          <Text className="eyebrow" size="xs">
            Tema canônico / light + dark
          </Text>
          <Heading id="themes-title" level={2}>
            Uma ação.
            <br /> Duas atmosferas.
          </Heading>
          <Text tone="muted">
            Mude o tema no cabeçalho. A hierarquia permanece; só os tokens semânticos
            respondem.
          </Text>
          <Link className="text-link" href="/themes">
            Abrir laboratório de temas <span aria-hidden="true">→</span>
          </Link>
        </Reveal>

        <Reveal className="theme-field">
          <div className="theme-field__axis" aria-hidden="true">
            <span>surface</span>
            <span>action</span>
            <span>type</span>
          </div>
          <div className="theme-field__sample">
            <span className="theme-field__label">semantic/action</span>
            <strong>Aa</strong>
            <span className="theme-field__caption">Contraste que acompanha o contexto.</span>
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="governance-title" className="editorial-section governance-section">
        <Reveal className="governance-section__lead">
          <Text className="eyebrow" size="xs">
            Governança verificável
          </Text>
          <Heading id="governance-title" level={2}>
            Compartilhar exige evidência.
          </Heading>
        </Reveal>

        <div className="governance-section__body">
          <Reveal className="catalog-evidence">
            <span className="catalog-evidence__number">{qualifiedCount}</span>
            <Text>
              candidatos qualificados pelo inventário atual — publicados somente quando o
              contrato público estiver provado.
            </Text>
          </Reveal>
          <Reveal>
            <ol className="governance-list">
              <li>
                <span>01</span>
                Uso real em dois ou mais apps.
              </li>
              <li>
                <span>02</span>
                Nenhuma semântica forte de produto.
              </li>
              <li>
                <span>03</span>
                Superfície pública estável e acessível.
              </li>
            </ol>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="final-cta">
        <Reveal className="final-cta__content">
          <Text className="eyebrow" size="xs">
            Comece pela superfície pública
          </Text>
          <Heading id="cta-title" level={2}>
            Veja o que já está pronto para uso.
          </Heading>
          <Link className="action-link action-link--inverse" href="/components">
            Consultar catálogo <span aria-hidden="true">↗</span>
          </Link>
        </Reveal>
        <span aria-hidden="true" className="final-cta__monogram">
          M/
        </span>
      </section>
    </main>
  )
}
