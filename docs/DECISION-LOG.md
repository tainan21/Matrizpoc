# Matriz Decision Log

## 2026-08-04 — Broker mockado e fluxo visual de login compartilhado

- **Decisão:** centralizar desafios e sessão mockados no Matriz Hub para Hub,
  Spot, Seumei, Contracts e WillDash; compartilhar a composição visual por
  `@matriz/flows-auth` e manter skins declarativas em cada app.
- **Motivo:** provar SSO local e reduzir duplicação sem apagar a identidade dos
  produtos nem mover domínio forte para packages.
- **Impacto:** `localhost:3000` é necessário para autenticar na POC. Workbench
  preserva o token local e Sites permanece público. Reiniciar o Hub encerra a
  sessão em memória.
- **Revisar quando:** autenticação real, multiusuário, persistência remota ou
  implantação em domínios diferentes entrarem no escopo.

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
