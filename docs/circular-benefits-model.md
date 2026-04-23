# Circular Benefits Model

Status: **100% conceitual**. Nenhuma linha de código nesta fase.

## Visão

Projetos Matriz se beneficiam mutuamente: um usuário ativo no Spot tende
a engajar mais no Seumei; um contrato fechado em Contracts gera lead
para Willdash; um parceiro externo ganha visibilidade institucional ao
aparecer no `/public`.

Este modelo **não** é implementado na V1.2. Está documentado para servir
de norte à evolução sem contaminar o núcleo.

## Primitivas conceituais

| Primitiva | O que é | Onde viveria |
|---|---|---|
| `benefit` | Vantagem concedida a um usuário/projeto por outro projeto | Futuro package `@matriz/integration-benefits-contracts` |
| `attribution` | Registro de qual projeto gerou qual benefício | Telemetria categorizada (`ecosystem`) |
| `redemption` | Ato de consumir um benefício | Evento cross-app |
| `circle` | Grupo de projetos que trocam benefícios entre si | Propriedade do `InstitutionalRegistry` |

## Regra central

> Benefícios circulam via **eventos** e **capabilities declaradas**, nunca
> via acoplamento direto entre projetos.

O emissor declara:
```
capabilities.produces: [{ kind: "event", name: "benefit.granted" }]
```

O receptor declara:
```
capabilities.consumes: [{ kind: "event", name: "benefit.granted" }]
```

O Hub já faz isso funcionar hoje (no `Ecosystem`) — o que falta é o
**vocabulário de benefícios** em si.

## Exemplos hipotéticos

```
Spot → Seumei:  "usuário que fez 3 bookings no Spot ganha cupom no Seumei"
Contracts → Willdash: "empresa que assinou contrato ganha painel gratuito no Willdash"
Ventures → Todos: "parceiro externo aparece com destaque no /public por 30 dias"
```

Todos modeláveis como eventos cross-app, SEM wallet real.

## Métrica de saúde

O quanto o ecossistema é circular pode ser medido por:

```
circular_health = eventos_cross_project / eventos_totais
```

Quanto maior, mais integrado. Hoje o Hub já conta eventos produzidos
vs. consumidos cruzados (`Ecosystem > Eventos compartilhados`). A extensão
natural é rotular alguns como "benefícios" via convenção de nome
(`benefit.*`).

## Relação com wallet

Nenhuma. Benefícios **não** precisam virar moeda. Podem ser:

- Cupons (strings identificadoras)
- Acessos (feature flags temporárias)
- Destaques (posicionamento em `/public`)
- Métricas (contagem de referências)

Se/quando virar moeda → ver `wallet-future-notes.md`.

## Regras de guarda

- Nenhum contract institucional atual carrega "benefit". Se aparecer, é
  L12 violado.
- Métricas financeiras são livres; atribuição de benefício é domínio
  futuro.
- Qualquer evento com prefixo `benefit.*` deve ser documentado no
  manifest do emissor antes de ser emitido em produção.

## Próxima fase (quando fizer sentido)

- Package `@matriz/integration-benefits-contracts` (separado do núcleo).
- UI `/ecosystem/circles` no Hub (visualização de circularidade).
- Eventos canônicos: `benefit.granted`, `benefit.redeemed`,
  `benefit.expired`.
- Métrica `circular_health` computada por janela em
  `/intelligence`.
