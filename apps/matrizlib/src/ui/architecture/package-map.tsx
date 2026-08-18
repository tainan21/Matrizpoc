import { Heading, Text } from "@matriz/design-ui"

const packageLayers = [
  {
    index: "01",
    name: "@matriz/design-system",
    owner: "Design Foundations",
    responsibility: "Tokens, temas declarativos, CSS público e metadados visuais.",
    boundary: "Não conhece apps, domínio, storage, HTTP, entitlement ou hooks de produto.",
  },
  {
    index: "02",
    name: "@matriz/design-ui",
    owner: "Design UI",
    responsibility: "Primitivos React, metadados de componentes e histórias executáveis.",
    boundary: "Compõe contratos visuais; não assume copy, fluxo ou estado de um produto.",
  },
  {
    index: "03",
    name: "apps/<app>",
    owner: "Equipe do produto",
    responsibility: "Rotas, presenters, copy, hooks, estado e regras de domínio.",
    boundary: "Consome packages por exports públicos e nunca importa internals de outro app.",
  },
] as const

const operatingRules = [
  {
    title: "Hooks",
    body: "Nascem no app. Só viram API compartilhada após dois consumidores reais, sem semântica forte e com contrato estável.",
  },
  {
    title: "Scripts",
    body: "O system valida test, typecheck e lint. O UI acrescenta Storybook, build-storybook e a checagem de runtime das histórias.",
  },
  {
    title: "Testes",
    body: "Tokens provam consistência e fallback; componentes provam DOM e acessibilidade; cada app valida integração, tema e fluxo no próprio escopo.",
  },
] as const

export function PackageMap() {
  return (
    <section aria-labelledby="package-map-title" className="package-map">
      <header className="architecture-section__intro">
        <Text className="eyebrow" size="xs">
          Ownership por camada
        </Text>
        <Heading id="package-map-title" level={2}>
          A dependência aponta para dentro. A decisão fica com seu dono.
        </Heading>
      </header>

      <ol className="package-map__layers">
        {packageLayers.map((layer) => (
          <li key={layer.name}>
            <span className="package-map__index">{layer.index}</span>
            <div>
              <code>{layer.name}</code>
              <strong>{layer.owner}</strong>
            </div>
            <p>{layer.responsibility}</p>
            <p>{layer.boundary}</p>
          </li>
        ))}
      </ol>

      <dl className="package-map__operations">
        {operatingRules.map((rule) => (
          <div key={rule.title}>
            <dt>{rule.title}</dt>
            <dd>{rule.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
