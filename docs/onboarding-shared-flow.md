# Onboarding Shared Flow

> Esqueleto. Expandido em CP-2 (pacote) e CP-4 (apps integram).

## Etapas (6)

1. Dados globais do tenant (nome, slug, contato)
2. Branding básico (logo placeholder, paleta)
3. Escolha de apps habilitados
4. Dados comuns de operação (fuso, idioma, moeda)
5. **Etapa específica do app atual** (extensão registrada pelo app)
6. Resumo e conclusão

## Shape compatível com Prisma futuro

O payload coletado tem shape idêntico ao do `OnboardingProgress`
no `core.prisma`, para migração direta quando DB real entrar.

## Extensões por app

Cada app registra sua própria etapa 5 via
`onboarding.registerAppStep(appId, Component, payloadSchema)` no
`bootstrap/index.ts`.

Exemplos planejados:

- Spot: nome artístico, foco em bandas
- Seumei: tipo de estabelecimento, operação
- Contracts: modelo padrão de contrato
- WillDash: preferência de metas
