# Plano 1 — Contracts e governança

## Entregas

- `@matriz/integration-infrastructure-contracts`: tipos, Zod, JSON Schema e
  validação determinística de catálogos.
- `infrastructure.json` para os 16 apps manifestados.
- project factory gera contrato válido; `pnpm verify:infrastructure` bloqueia
  contrato inválido, app/schema/porta duplicados e owner incorreto.
- Control mostra inventário read-only sem values, comandos ou paths absolutos.
- Leis L13–L16, ADR, ownership/access matrix, threat model e comunicação.
- Topologia e fixtures reconhecem Ops/Pay sem executar provisionamento cloud.

## Testes e gate

Testes do package, factory, presenter/loader do Control, smoke de topologia,
lint/typecheck dos consumidores, boundaries e `git diff --check`. Saída: 16
apps válidos e exatamente oito schemas com ownership único.
