# Auditoria de adoção — Matriz Lib UI

Data da evidência: 2026-07-30.

Escopo read-only: `C:\Apps\MatrizLibUiOficial`. Esta auditoria não altera,
instala ou copia código da biblioteca.

## Conclusão

O Infra Hub ainda não deve consumir `@matriz/product-ui` como fundação. O
package mistura composição de showcase com conceitos fortes de Billing,
Wallet, Payment Methods, Orders e Kanban. Isso viola a lei L12 se esses
conceitos forem tratados como infraestrutura compartilhada.

`@matriz/blocks` é um candidato real, mas sua adoção deve ser condicional:
imports por subpath, allowlist explícita, ViewModels do app na entrada e
validação da biblioteca publicada. O barrel raiz não deve ser usado.

## Evidências observadas

### `@matriz/blocks`

- versão declarada `0.1.0`;
- 10 subpaths públicos no `package.json`;
- 9 exports no barrel raiz;
- `./smart-sidebar` está no mapa de exports, mas não no barrel raiz;
- zero arquivos `test`, `spec` ou `stories` nos dois packages auditados;
- oito implementações usam `use client`;
- `data-table.tsx` tem 893 linhas;
- `filter-bar.tsx` tem 784 linhas;
- `notification-center.tsx` tem 724 linhas;
- `PageHeader` é uma composição genérica baseada em slots React;
- `SectionPanel` é client component embora sua API básica seja estrutural.

A ausência de testes não prova defeito, mas impede promover a superfície a
contrato estável sem uma verificação adicional no repositório proprietário.

### `@matriz/product-ui`

- versão declarada `0.1.0`;
- depende de DnD Kit e Recharts além da base visual;
- exporta Billing, Wallet, Coins, Payment Methods, Orders e Kanban no barrel;
- `smart-list-orders.tsx` tem 1.589 linhas;
- `dashboard-shell.tsx` tem 1.579 linhas;
- `wallet.tsx` tem 1.435 linhas;
- `smart-kanban-board.tsx` tem 1.430 linhas;
- presets incluem navegação de showcase, como `/kanban`;
- o próprio `AGENTS.md` da biblioteca classifica `product-ui` como camada de
  showcase/migração, não como fundação.

## Classificação

| Superfície | Estado | Regra |
|---|---|---|
| `@matriz/tokens` | candidata auditada | nomes e paridade CSS aprovados; distribuição e versionamento pendentes |
| `@matriz/themes` | bloqueada nesta fase | validar flash e segundo passe no cliente |
| `@matriz/primitives` | candidata | validar acessibilidade e peers |
| `@matriz/ui` | candidata | consumir somente API pública e estável |
| `@matriz/blocks/page-header` | candidata prioritária | composição com ViewModel |
| `@matriz/blocks/section-panel` | candidata | revisar client boundary |
| `@matriz/blocks/filter-bar` | condicional | provar acessibilidade e reduzir tamanho |
| `@matriz/blocks/data-table` | condicional | testar performance, SSR e a11y |
| `@matriz/blocks/notification-center` | condicional | mapear vocabulário do app para props |
| `@matriz/blocks` raiz | não adotar | superfície ampla e menos controlável |
| `@matriz/product-ui` | proibida como fundação | contém domínio forte e staging |

## Gate operacional no Workbench

A fonte portátil do gate é
`.matriz/adoption-policies/matriz-lib-ui.json`. O Workbench combina essa
política com a projeção read-only do `package.json` registrado e apresenta o
resultado em **Conhecimento → Matriz Lib UI**. O mesmo resultado compacto pode
ser consultado por
`workbench_get_package_adoption_readiness`.

Os seis estados iniciais são:

| Package | Estado inicial | Escopo inicial permitido |
|---|---|---|
| `@matriz/tokens` | `candidate` | `.`, `./css` |
| `@matriz/primitives` | `candidate` | `.`, `./button` |
| `@matriz/ui` | `candidate` | `.`, `./stat-card` |
| `@matriz/blocks` | `candidate` | `./page-header` |
| `@matriz/themes` | `blocked` | `.`, `./provider` |
| `@matriz/product-ui` | `blocked` | nenhum |

Nenhum package está aprovado nesta data. A ordem de evolução é
`tokens → primitives → ui → blocks → themes`. `product-ui` permanece
bloqueado como fundação enquanto carregar domínio forte e superfícies de
showcase/migração.

O gate não publica, instala nem consome fisicamente um package. Ele também não
executa os checks listados: somente confirma que os nomes dos scripts, exports
permitidos e documentos exigidos estão presentes. Promoção para `approved`
exige evidência executada nos dois repositórios e revisão humana da política.

A auditoria específica de nomes, CSS, empacotamento e versionamento de
`@matriz/tokens` está em
`MATRIZ-TOKENS-ADOPTION-AUDIT-2026-07-31.md`. Ela confirmou a paridade de 67
custom properties nos dez sistemas, build determinístico, Changesets e consumo
externo por tarball. O package permanece candidato somente porque o remoto
atual ainda não pode publicar legitimamente o namespace `@matriz` no GitHub
Packages e nenhuma versão de registry foi emitida.

## Contrato de adoção

1. A biblioteca precisa ser publicada ou referenciada por mecanismo portátil;
   dependência `file:C:\...` é proibida.
2. O consumidor importa apenas subpath aprovado.
3. O app converte seu domínio em ViewModel antes do componente.
4. O package não recebe entidades, repositories ou use cases do app.
5. Lint, typecheck, build, acessibilidade e um teste visual passam nos dois
   repositórios.
6. A versão e o mapa de exports ficam visíveis no Workbench antes do upgrade.
7. A reversão consiste em retirar o adapter app-local, sem alterar domínio.

## Próxima prova física

Após publicação portátil e testes na Matriz Lib UI, adotar somente
`@matriz/blocks/page-header` em uma tela não crítica do Workbench. Não migrar
outras superfícies no mesmo passo.
