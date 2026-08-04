# Matriz Decision Log

## 2026-08-04 — Project Factory declarativa

- **Decisão:** declarar runtime local em `localAppRuntimes` e operar apps por
  uma CLI única, mantendo manifest e package como fontes das próprias áreas.
- **Motivo:** evitar scripts, portas, switcher e validações divergentes à medida
  que novos apps entram no ecossistema.
- **Impacto:** portas são estritas, health é uniforme, scaffolds exigem preview
  e imports entram em staging ignorado e fora do workspace.
- **Revisar quando:** auth, CORS e Workbench consumirem um protocolo aprovado
  de URLs temporárias; somente então reconsiderar override/fallback de porta.

Decisões curtas que alteram os limites do monorepo. ADRs detalhados permanecem
próximos do app responsável.

## 2026-07-28 — Matriz Workbench file-backed

- **Decisão:** criar `apps/matriz-workbench` como ferramenta local-first, com
  estado canônico em `apps/<app>/.matriz/**` versionado pelo Git.
- **Motivo:** permitir coworking humano, Codex e agentes sem introduzir banco,
  serviço cloud ou acoplamento entre domínios na primeira versão.
- **Impacto:** o Workbench pode ler metadados públicos de `apps/*`, mas nunca
  importar ou executar internals de outro app. A UI escreve somente em
  `.matriz/**`; alterações de código continuam sob as permissões normais do Codex.
- **L1:** a regra de schema por app vale para apps que adotam persistência em
  banco. Tooling file-backed sem banco não recebe schema Prisma vazio.
- **Revisar quando:** multiusuário, sincronização cloud ou persistência remota
  forem requisitos reais.
