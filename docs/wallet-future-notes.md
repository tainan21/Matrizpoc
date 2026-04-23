# Wallet — Future Notes

Status: **100% conceitual**. Zero implementação. Zero contract real nesta
fase.

## Por que este doc existe

Para registrar, antes de ser desenhado, que a Matriz **não** vai ter
wallet/moeda/blockchain na V1.x. Documentar agora evita que o conceito se
dilua ou entre precocemente em contracts institucionais.

## Regras desta fase (V1.2)

1. **NÃO existe** tipo `Wallet`, `Coin`, `Token`, `Balance`,
   `Transaction` em nenhum package.
2. **NÃO existe** integração com blockchain, stablecoin, ou payment
   processor além do que já está em `apps/contracts`.
3. **NÃO existe** motor econômico, reputação financeira, ou coins
   circulantes.
4. O documento `circular-benefits-model.md` (conceitual também) é o único
   lugar onde o sistema econômico é descrito — e mesmo lá, só como modelo.

## Por que a tentação existe

A visão da Matriz como holding fala em "circulação de benefícios entre
projetos". É natural pensar em moeda. Porém:

- Introduzir wallet agora criaria **domínio forte** em contracts
  institucionais (viola L12).
- Exigiria KYC, compliance financeiro, custódia — prematuro.
- Pode ser modelado depois como **outro projeto** (ex.: `matriz-pay`) que
  se integra via `ProjectIntegrationCapabilities.requires` +
  `produces/consumes` de eventos, sem poluir o núcleo institucional.

## Shape hipotético (NÃO codificar ainda)

Se/quando chegar a hora, a forma provável será:

```
// NENHUM destes existe hoje. Reservado como vocabulário futuro.

type MatrizWalletId = Opaque<string, "MatrizWalletId">
type MatrizCoinAmount = { amount: string /* decimal */; currency: "MTRZ" | "BRL" | ... }

interface WalletBalance {
  walletId: MatrizWalletId
  balances: MatrizCoinAmount[]
  updatedAt: string
}

interface WalletTransaction {
  id: string
  walletId: MatrizWalletId
  kind: "credit" | "debit" | "transfer"
  amount: MatrizCoinAmount
  source: { kind: "project" | "user" | "system", id: string }
  occurredAt: string
}
```

E viveria em um package separado (`@matriz/integration-wallet-contracts`,
hipotético), **não** em `api-contracts` principal, para não forçar
projetos institucionais a carregar esse vocabulário.

## Interação com o ecossistema atual

Os `customMetrics` de `ProjectPublicMetrics` hoje já suportam métricas
financeiras (ex.: `monthly_volume_brl` na seed Ventures). Isso é
**telemetria**, não wallet. Continua sendo a única forma de expressar
"fluxo de valor" na V1.2.

## Regras de guarda (enforçadas por review)

- PR que introduza `wallet`, `coin`, `token`, `balance`, `ledger` sem ADR
  prévio → rejeitado.
- PR que adicione dependência de blockchain (`ethers`, `viem`, `solana`,
  etc.) sem ADR → rejeitado.
- Telemetria financeira via `category: "financial"` **é permitida**
  (não é wallet, é observabilidade).

## Próxima fase (quando fizer sentido)

- ADR dedicado (`docs/adr/000X-wallet-introduction.md`).
- Package `@matriz/integration-wallet-contracts` isolado.
- App próprio (`apps/matriz-pay`) implementando motor.
- Integração com `InstitutionalRegistry` via
  `ProjectIntegrationCapabilities.requires[{ kind: "wallet" }]`.
- Sem mudança no `ProjectManifest` atual — wallet é um adicional, não
  transversal.
