# Seumei Store Identity & Publication — Acceptance

Data: 2026-08-24  
Branch: `codex/seumei-assimilation`  
Produto: `@matriz/app-seumei`, `appId: seumei`, porta canônica `3008`, web-first

## Resultado

A Seumei agora possui identidade de loja tenant-scoped com três direções visuais acessíveis, rascunho persistente, preview privado, publicação explícita em snapshot imutável e despublicação recuperável. Galaxia Burger e Sabor & Brasa usam linguagens realmente distintas sem copiar o page builder ou a persistência local da referência.

## Decisões e evidências

- O editor é app-local e orientado por presets; não aceita CSS arbitrário nem cria um package compartilhado prematuro.
- `COSMIC_DINER`, `BRAZILIAN_WARMTH` e `MARKET_FRESH` expõem somente tokens semânticos validados e com contraste testado.
- Conteúdo editável é limitado a título, aviso, descrição e imagem segura; URLs externas e esquemas perigosos são recusados.
- Cada empresa possui um draft versionado. Salvar exige a versão esperada e conflito retorna estado honesto.
- Publicar cria `StorePublicationVersion` imutável. O storefront lê exclusivamente `publishedVersionId`; o draft não vaza para a rota pública.
- Despublicar remove o ponteiro público, preserva histórico e permite publicar novamente.
- OWNER e ADMIN podem ler/editar/publicar. MEMBER e VIEWER não veem a navegação nem acessam diretamente o draft.
- APIs retornam o view model público do draft, sem `tenantId`, `companyId`, `publicationId` ou IDs de snapshot.

## Route flow validado

1. `/login` → `/` → Galaxia Burger → `/workspace/store/design`.
2. Edição e salvamento do draft → `/workspace/store/preview` mostra a nova versão.
3. `/store/galaxia-burger` continua na versão anterior até `Publicar versão`.
4. Publicação explícita atualiza a loja pública; refresh preserva o resultado.
5. `Despublicar` torna o conteúdo público indisponível sem remover o draft; republicar recupera a loja.
6. `/store/sabor-e-brasa` usa preset serifado e conteúdo próprios, sem misturar dados Galaxia.
7. Conta MEMBER Galaxia não vê `Loja` e o acesso direto exibe negação.
8. A mesma conta usando o ID conhecido da empresa Sabor recebe `403 company_forbidden`.

## Browser real e revisão visual

Chromium controlado em desktop `1280×900` e mobile `390×844`:

- estúdio, preview privado, publicação, despublicação e recuperação exercitados com dados persistidos;
- Galaxia: quatro produtos reais, preset `COSMIC_DINER`, título “Smash de outro mundo.”;
- Sabor: dois produtos reais, preset `BRAZILIAN_WARMTH`, família serifada e título “Brasil servido na brasa.”;
- mobile sem overflow horizontal (`scrollWidth = innerWidth = 390`);
- teclado/foco nativos preservados nos controles e ações nomeadas;
- console final limpo; o único `200` observado durante a despublicação continha corretamente a página not-found por streaming do Next em desenvolvimento, confirmado contra o banco e o conteúdo HTML.

Capturas revisadas visualmente:

- `assets/2026-08-24-seumei-store-identity/galaxia-studio-desktop.png`
- `assets/2026-08-24-seumei-store-identity/galaxia-preview-desktop.png`
- `assets/2026-08-24-seumei-store-identity/galaxia-published-desktop.png`
- `assets/2026-08-24-seumei-store-identity/galaxia-published-mobile.png`
- `assets/2026-08-24-seumei-store-identity/sabor-published-desktop.png`

## Persistência e segurança

- Migration aditiva: `prisma/migrations/seumei/202608240004_store_identity_publication/migration.sql`.
- O backfill cria snapshots para publicações existentes e aplica identidades distintas às duas demos.
- Índices e chaves compostas relacionam publicação e versão dentro do mesmo tenant.
- Repositories privados exigem `tenantId` e `companyId`; o navegador envia intenção e versão, nunca autoridade tenant.
- Provisionamento demo foi executado duas vezes consecutivas sem duplicar empresas ou publicações.
- Testes negativos cobrem papel sem capacidade, tenant conhecido, conflito de versão, draft invisível e resposta HTTP sem IDs internos.

## Gates da fatia

- Seumei: 68 arquivos / 321 testes;
- lint e typecheck do app aprovados;
- build do app aprovado com 54 rotas;
- seis schemas Prisma válidos com configuração explícita do banco descartável.

Os gates globais consecutivos e o smoke são registrados no relatório final consolidado da assimilação.

## Limites reais

- Não há page builder livre, domínio customizado, upload de mídia, CDN ou analytics.
- Imagens usam assets locais/HTTPS já conhecidos; um pipeline de upload exige storage e política próprios.
- A rota pública continua sendo `/store/[storeSlug]`; domínio customizado permanece uma integração futura.
- O broker de sessão local continua sendo o mock de desenvolvimento canônico do ecossistema.

## Próxima decisão

Integrações somente quando um consumidor real justificar o contrato. A primeira candidata é entrega transacional de convites por e-mail; sem credencial/provedor, a Seumei deve expor o link manual já verdadeiro e documentar o contrato de outbox, nunca simular envio.
