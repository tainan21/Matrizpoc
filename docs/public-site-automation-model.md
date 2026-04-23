# Public Site Automation Model

Status: **implementado** (Fase 4 — rota `/public`) + **conceitual**
(evolução para site institucional independente).

## Por que existe

A Matrizpoc precisa provar que o control plane não é só interno: projetos
classificados como públicos expõem **uma superfície pública institucional**
(branding, health, métricas públicas, capabilities) derivada
automaticamente do `ProjectManifest`, sem código específico por projeto.

## Forma atual (V1.2)

A rota `/public` do `matriz-hub`:
1. Não requer autenticação (bypass no `HubAuthShell`).
2. Não adota `HubShell` (layout próprio, branding institucional).
3. Consome o `InstitutionalRegistry` global.
4. Filtra projetos com `institutionalTags` contendo `"public"`.
5. Renderiza, para cada projeto:
   - `brand.brandName`, `tagline`, `primaryColor`, `accentColor`, `logoText`
   - `health.status` + `readinessScore`
   - Até 3 métricas públicas de `metrics.customMetrics`
   - Até 3 capabilities de `capabilities.exposes`
   - `sourceType` + `trustLevel` como badge

**Zero** código específico por projeto. Um novo projeto institucional
aparece automaticamente na home pública ao ser ingerido com a tag `public`.

## Separação estrutural

```
apps/matriz-hub/
├── app/
│   ├── page.tsx              ← home interna (requer auth)
│   ├── projects/, health/…   ← control plane (requer auth)
│   └── public/
│       └── page.tsx          ← landing pública (sem auth)
└── src/
    └── institutional/
        └── components/
            └── public/
                ├── PublicHeader.tsx
                ├── PublicHero.tsx
                ├── PublicEcosystemStats.tsx
                ├── PublicProjectGrid.tsx
                └── PublicFooter.tsx
```

Componentes `public/*` **não** herdam do shell interno. Podem ser
extraídos para um app próprio no futuro sem dor.

## Evolução conceitual: site institucional independente

Na próxima fase, quando houver produto real (Matriz Holding Site):

```
apps/holding-site/      ← novo app independente
├── app/
├── public-contract.ts
└── src/
```

Este app:
- Lê o `InstitutionalRegistry` via `SnapshotPullAdapter` (consumindo um
  endpoint público do Hub: `/api/institutional/projects.json`).
- NÃO compartilha código com o Hub além dos contracts (L3, L4).
- Tem branding próprio, domínio próprio (`matriz.example`).
- Deploy independente.

O contract que permite isso **já existe hoje**: `ProjectManifest` +
`SnapshotPullAdapter`. Não há mudança de API necessária.

## Regra de classificação pública

Um projeto só aparece no `/public` se **todas** as condições abaixo forem
verdadeiras:

1. `institutionalTags` inclui `"public"`.
2. `brand` está completo (brandName, cores).
3. `health.status` não é `"unhealthy"` (projetos doentes não são
   promovidos).
4. `trustLevel` é `"core"` ou `"verified"`.

Isso é verificado no presenter (`toPublicVM` em `presenters.ts`), não na
UI. Mudar a regra = mudar em 1 lugar.

## Automação de branding

- **Cores** vêm direto de `ProjectBrandIdentity`. Cada card usa
  `primaryColor` como background do logo e `accentColor` como borda.
- **Tom institucional** (`tone`) pode gerar variantes visuais
  (`institutional`, `product`, `legacy`, `experimental`). Na V1.2 só
  `institutional` e `product` são usados.
- **Logo** é texto (`logoText`) por padrão. Logos em imagem virão com
  `vercel-blob` em fase futura (conceito, não implementação).

## Próximos passos (conceitual)

- SEO/OG dinâmico por projeto (`/public/projects/[id]` com metadata
  derivada de `ProjectManifest`).
- RSS/sitemap gerados automaticamente da lista de projetos públicos.
- A/B de tone institucional vs. product em escala de holding.
- Internacionalização via `brand.i18n` opcional (conceito).
