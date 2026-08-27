# Seumei Essential Finance — Acceptance

Data: 2026-08-24  
Branch: `codex/seumei-assimilation`  
Produto: `@matriz/app-seumei`, `appId: seumei`, porta canônica `3008`, web-first

## Resultado

A Seumei agora possui um financeiro operacional persistente e tenant-scoped. Pedidos geram recebimentos pagos exatamente uma vez dentro da mesma transação do checkout; OWNER e ADMIN podem registrar entradas ou saídas manuais, acompanhar competência e vencimento e liquidar ou cancelar registros abertos sem remoção de histórico.

## Decisões e evidências

- Valores usam centavos inteiros e `BRL`; nenhuma regra usa ponto flutuante como autoridade.
- `FinancialEntry` preserva origem `ORDER` ou `MANUAL`, status, categoria, competência, vencimento, pagamento, versão e autoria.
- `FinancialEntryEvent` é append-only e registra criação, pagamento ou cancelamento.
- Recebimento de pedido é criado na transação serializável do checkout e protegido por unicidade composta de tenant/pedido.
- Lançamento derivado de pedido é imutável. Somente manual aberto aceita `PAID` ou `CANCELLED`, com versão esperada.
- O browser envia intenção e versão, nunca `tenantId`; sessão, empresa ativa, membership e capacidade são resolvidas no servidor.
- A referência externa contribuiu regras e problemas observados; storage no browser, floats, remoção destrutiva e CMV inventado não foram copiados.

## Route flow validado

1. `/login` → `/` → Galaxia Burger → `/workspace/finance`.
2. Pedido persistido → recebimento `ORDER/SALES/PAID` no livro financeiro.
3. `/workspace/finance` → criação de saída manual → `/workspace/finance/entries/[entryId]`.
4. Entrada manual aberta → `Marcar como pago` → evento adicional e ações removidas.
5. Empresa ativa Sabor & Brasa + ID conhecido de lançamento Galaxia → estado indisponível.
6. Conta `MEMBER` Galaxia → navegação sem Financeiro e acesso direto negado.

## Browser real

Chromium controlado, desktop `1440×1000` e mobile `390×844`:

- conta global autenticada e duas empresas visíveis;
- Galaxia com dois recebimentos de R$ 29,90 reconciliados a partir dos pedidos;
- saída manual “Gás da cozinha” de R$ 129,90 criada e liquidada;
- histórico com eventos de criação e pagamento após refresh;
- isolamento tenant A/B e negação por capacidade observados;
- mobile sem overflow horizontal (`scrollWidth = clientWidth = 390`);
- console limpo no fluxo final; falhas de CORS ocorreram apenas na tentativa inicial em porta auxiliar não autorizada e foram eliminadas ao usar uma porta local permitida, sem alteração de contrato.

Capturas:

- `assets/2026-08-24-seumei-finance/finance-overview-desktop.png`
- `assets/2026-08-24-seumei-finance/finance-entry-open-desktop.png`
- `assets/2026-08-24-seumei-finance/finance-overview-mobile.png`

## Persistência e segurança

- Migration aditiva: `prisma/migrations/seumei/202608240003_essential_finance/migration.sql`.
- Constraints impedem valor não positivo, datas incoerentes, pagamento sem data e origem de pedido inconsistente.
- Todas as leituras e mutações privadas recebem tenant resolvido; não existe método empresarial sem escopo.
- Testes negativos cobrem tenant conhecido, papel sem capacidade, entrada de pedido imutável, conflito de versão e idempotência.
- Provisionamento demo executado duas vezes seguidas, sem duplicar empresas, memberships, pedidos ou recebimentos.

## Gates

Duas rodadas consecutivas sobre o mesmo estado funcional foram aprovadas:

- Seumei: 61 arquivos / 290 testes, lint, typecheck e build com 51 rotas;
- smoke global: 24 arquivos / 158 testes;
- seis schemas Prisma válidos;
- lint e typecheck globais: 37/37 tarefas;
- build global: 10/10 tarefas.

Os avisos observados são preexistentes e não bloqueantes: raiz inferida do Next em worktree e API CJS legada do Vite no smoke. Nenhum gate foi relaxado.

## Limites reais

- Não há pagamento real, conciliação bancária, fiscal, emissão de documento, parcelamento, recorrência ou contabilidade formal.
- O caixa realizado desta fatia é operacional e filtrado pelo período consultado; não é extrato bancário.
- RLS PostgreSQL e papel restrito por tenant ainda não existem; isolamento está em constraints, contexto, repositories, autorização e testes.
- Sessão de desenvolvimento continua usando o broker mock local já existente no ecossistema.

## Próxima fatia

Identidade visual e publicação: draft versionado, presets/tokens acessíveis, preview privado e publicação explícita, sem page builder livre.
