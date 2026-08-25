# Matriz Decision Log

## 2026-08-24 — Matriz Control owns local process orchestration

- **Decision:** create `apps/matriz-control` on port 3008 with an app-local process supervisor and global terminal dock.
- **Reason:** operational terminal access must remain available across the cockpit without weakening the Workbench prohibition on generic shell execution.
- **Impact:** Control may execute only server-resolved actions from validated project metadata; it never imports product internals, accepts arbitrary browser commands, or persists terminal output.
- **Review when:** a second real consumer needs the supervisor, native PTY fidelity becomes mandatory, or remote/multiuser operation enters scope.

## 2026-08-18 — MatrizLib sound language is a public design-ui subpath

- **Decision:** publish typed semantic sound contracts, registry, packs,
  preferences, and playback through `@matriz/design-ui/sounds`; make Sounds an
  equal portal pillar beside Components and Themes.
- **Reason:** products need one opt-in feedback language without direct audio
  calls, physical-filename coupling, a competing configuration system, or a
  new premature package.
- **Impact:** 12 complete real WAV cues ship in `Matriz Default`; packs are
  replaceable without changing calls. Browser startup respects user activation,
  shutdown never blocks, and audible state always requires an equivalent visual
  or textual state. The portal owns catalog UI only.
- **Review when:** two or more packs need independent distribution, native
  drivers become real consumers, or shared component sound props stabilize.

## 2026-08-18 — MatrizLib portal is the eighth app

- **Decision:** register `apps/matrizlib` on port 3007 as the public reference
  portal for the canonical local design packages, with an audited C001-C099
  catalog, theme laboratory, and architecture guide.
- **Reason:** make contracts and migration evidence discoverable without moving
  product domain into a package or turning documentation into an API authority.
- **Impact:** `@matriz/design-system` still owns tokens/themes and
  `@matriz/design-ui` still owns stable React exports. Fourteen catalog entries
  are available and 85 remain explicit candidates. `C:\Apps\matrizlibUI` is
  reference-only; screenshots and `.next/` stay untracked, while the official
  generated `next-env.d.ts` is versioned.
- **Review when:** a candidate has two real consumers and an audited stable
  surface, or a portable external-library adoption is separately approved.

## 2026-08-15 — Local design packages are canonical MatrizLib

- **Decision:** local `@matriz/design-system` and `@matriz/design-ui` are the
  canonical authority; the external library is reference-only.
- **Reason:** this preserves public contracts, domain boundaries, and
  compatibility without an unapproved dependency or code copy.
- **Impact:** consumers use local public exports only; Design Alpha and any
  external library do not enter runtime.
- **Review when:** a separate portable adoption is approved with public surface,
  license, security, accessibility, and rollback audited.

## 2026-08-12 — Estado de Praticies compartilhado como flow

- **Decisão:** criar `@matriz/flows-praticies` para regras versionadas de
  catálogo, instalação, recentes e layout, com Hub e Workbench como consumidores.
- **Motivo:** o segundo consumidor tornou a extração legítima; compartilhar o
  domínio transversal reduz duplicação sem compartilhar componentes ou semântica
  forte de um app.
- **Impacto:** cada app mantém presenter, links, UI e namespace de browser. O
  estado não entra em `.matriz/**` e nenhuma automação é executada pelo package.
- **Revisar quando:** catálogo remoto, sincronização multiusuário, permissões ou
  execução de plugins reais entrarem no escopo.

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
# 2026-08-13 — Capability Platform CSS-first

- Decisão: temas permanecem versionados em código; Hub guarda preferências e direitos, nunca CSS arbitrário.
- Motivo: segurança, fallback previsível e adoção simples entre 2 ou 100 apps.
- Impacto: `design/system`, `flows/themes`, Capability API e schema Hub formam a superfície pública.
- Revisar quando: publicação remota de temas ou a biblioteca de 74 sistemas entrar no produto.
