# Theming Governance

Status: **conceitual** (modelo) + **parcialmente implementado** (cores via
`ProjectBrandIdentity`).

## Problema

A Matriz é uma holding com múltiplos projetos de branding distintos
(Spot, Seumei, Contracts, Willdash, ventures externas). Cada um precisa:
- Manter identidade visual própria.
- Respeitar tokens semânticos do design system (`@matriz/design-ui`).
- Renderizar lado a lado no Hub e no site institucional sem conflito.

## Níveis de theming

```
Nível 1 — Design system (packages/design/*)
  Tokens semânticos universais: bg-background, text-surface-fg, border, brand…
  Definidos em globals.css por app. Nenhum projeto deve sobrescrever.

Nível 2 — Project brand identity (ProjectBrandIdentity, V1.2)
  Cores por projeto: primaryColor, accentColor, tone.
  Injetadas via CSS custom properties ou inline styles localizados.
  Escopo: cards, badges, headers de projeto.

Nível 3 — App theme (futuro, conceitual)
  Um app inteiro (ex.: spot, seumei) pode ter seu próprio tema completo.
  Herda do Nível 1, customiza via CSS variables no layout raiz do app.
```

## O que é permitido

- Usar `primaryColor` / `accentColor` do `ProjectBrandIdentity` em:
  - Logo badge de card (cor de fundo)
  - Borda/destaque de card
  - Dot/indicador pequeno
- Usar `tone` para escolher variantes da UI system
  (`institutional` = mais sóbrio, `product` = mais colorido).

## O que NÃO é permitido

- Reescrever tokens semânticos globais (`--background`, `--surface-fg`, etc.)
  em nome de um projeto.
- Misturar cores de múltiplos projetos em um mesmo componente (quebra
  acessibilidade e hierarquia).
- Usar cores institucionais em elementos interativos primários
  (buttons, links) — eles devem seguir tokens da design system para
  consistência de hover/focus.
- Gradientes multi-cor de projetos (L12 do guia de design).

## Validação automática (conceito)

Um lint futuro pode checar:
- `ProjectBrandIdentity.primaryColor` está no formato `#RRGGBB`.
- Contraste `primaryColor` × `logoText` passa AA (`>= 4.5:1`).
- `tone` é um dos valores canônicos.

## Quem é dono do quê

| Artefato | Dono | Auditor |
|---|---|---|
| Design system tokens | `design` package owners | Core |
| `ProjectBrandIdentity` por app interno | App owner (L9) | Hub/Core |
| `ProjectBrandIdentity` por fonte externa | Fonte de ingestão | Hub |

## Exemplos ingeridos hoje

```
Matriz Hub  → #111827 / #6366f1 → tone: institutional
Spot        → #0f766e / #14b8a6 → tone: product
Seumei      → #7c2d12 / #f97316 → tone: product
Contracts   → #1e3a8a / #3b82f6 → tone: product
Willdash    → #581c87 / #a855f7 → tone: product
Ventures    → #0b1324 / #b58e3a → tone: institutional (externo)
Spot-Pay    → #065f46 / #10b981 → tone: product (externo)
```

## Próximos passos (conceitual)

- Tema runtime switch (light/dark/high-contrast) por projeto.
- Logo em SVG/PNG via `vercel-blob` (hoje é texto).
- Figma tokens sync via `style-dictionary`.
- Reclassificação automática de tone por heurística de domínio.
