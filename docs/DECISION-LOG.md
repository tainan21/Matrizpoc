# Matriz Decision Log

## 2026-08-18 — Tauri establishes the Matriz native application boundary

- **Decision:** create `apps/matriz-desktop` as Matriz Control using Tauri 2,
  Rust and the existing React/MatrizLib surface; ship Windows x64 through a
  current-user NSIS installer.
- **Reason:** the first desktop product needs low idle cost, fast startup and
  direct Windows process/tray integration without embedding a second Node
  runtime or exposing a generic shell to the renderer.
- **Impact:** Win32 authority stays app-local and every privileged operation is
  allowlisted in Rust. The first release provides nine compact developer
  capabilities and becomes the reference shape for future native apps.
- **Review when:** a second native app proves a stable shared shell contract,
  a signed update channel exists, or macOS/Linux become release targets.

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

## 2026-08-18 — Terminal ConPTY e Seumei nativo permanecem app-local

- **Decisão:** o Matriz Control hospeda até seis sessões ConPTY e mantém toda
  automação em catálogo tipado; `apps/seumei/desktop` entrega o mesmo domínio
  Seumei em Tauri, com persistência local e instalador NSIS independente.
- **Motivo:** terminal explícito precisa de semântica real de console, enquanto
  ações automáticas não devem receber comandos da UI. O segundo shell Tauri
  ainda não justifica extrair um framework desktop compartilhado.
- **Impacto:** Control pode gerar, instalar e abrir Seumei; o binário Seumei não
  depende de Hub, Node ou servidor local. CI publica os dois instaladores como
  artefatos separados. Outputs continuam ignorados.
- **Revisar quando:** existir terceiro app nativo ou um canal assinado de release
  que permita ao Matriz Hub oferecer download e deep link confiáveis.

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
## 2026-08-19 — Separar Matriz Admin e Seumei

- **Decisão:** promover a antiga `apps/seumei` para `apps/matriz-admin` e iniciar a Seumei permanente em `apps/seumeiapp`, mantendo `seumei` como ID público.
- **Motivo:** administração de todos os clientes e operação do produto Seumei possuem responsabilidades, ritmos e superfícies de dados diferentes.
- **Impacto:** Admin usa porta 3002 e possui instalador Tauri; Seumei usa porta 3008, autenticação Hub e é dona do schema Seumei. Matriz Control opera ambas e associa o ciclo nativo ao Admin.
- **Revisar quando:** a primeira API administrativa cross-product estiver estável ou a migração dos oito slices terminar.

## 2026-08-22 — Aceitação instalada e ownership estrito no Matriz Control

- **Decisão:** certificar o NSIS em dois ciclos instalados consecutivos com o mesmo SHA-256 e impedir que ações de app encerrem processos que não nasceram em uma sessão gerenciada pelo Control.
- **Motivo:** testes do binário de build não cobrem instalação, WebView2, encerramento e desinstalação reais; uma porta do catálogo também pode pertencer a outro workspace legítimo.
- **Impacto:** portas externas aparecem como `EXTERNO`, sem ação de parada. Kill explícito continua disponível apenas na superfície de Portas, protegido por snapshot. A automação diária publica instaladores e evidências separadamente.
- **Revisar quando:** houver assinatura de código, canal de atualização confiável ou um modelo explícito de adoção de processos externos.

## 2026-08-24 — Runtime operacional e preview único no Matriz Control

- **Decisão:** separar definição durável de projeto do runtime efêmero; resolver ações contextuais no frontend e autorizá-las por comandos exatos no Rust; hospedar no máximo um child WebView2, limitado ao `localhost` e à porta do app selecionado.
- **Motivo:** Apps, Terminal, Preview, Logs e agente precisam compartilhar ownership, endpoint, rota e lifecycle sem espalhar `spawn`, URL ou autoridade nativa pela UI.
- **Impacto:** os nove manifests públicos alimentam rotas; listeners externos continuam protegidos; atividade operacional fica em memória, limitada a 200 resumos; fechar Preview destrói a web surface. MatrizLib permanece app e catálogo, enquanto seus packages públicos continuam sendo a biblioteca compartilhada real.
- **Revisar quando:** medições reais justificarem cache de mais de um preview, ou um segundo cliente precisar do protocolo local de runtime/activity.

## 2026-08-24 — Recursos e comércio permanecem autoridades nativas no Matriz Control

- **Decisão:** resolver `.env` e Explorer por caminhos relativos a apps do catálogo, com leitura sensível explícita; manter Store, ownership, instalação e Wallet em um ledger nativo app-local, inicialmente limitado a pacotes Matriz embarcados.
- **Motivo:** Workspace, runtime e distribuição precisam interoperar sem entregar filesystem, segredos, saldo ou execução arbitrária ao renderer e sem criar packages compartilhados prematuros.
- **Impacto:** segredos ficam mascarados e fora da atividade; Explorer bloqueia escape e protege arquivos operacionais; exclusões usam a Lixeira; aquisição difere de instalação; pacotes não possuem hooks ou código remoto. Estado comercial é persistido atomicamente no diretório de configuração do Control.
- **Revisar quando:** catálogo remoto, assinatura de pacotes, publisher externo ou um segundo consumidor justificar protocolo/formato público estável.

## 2026-08-24 — Inteligência operacional continua nativa e catalogada

- **Decisão:** promover ENV dentro do Rust; limitar busca de referências ao app; recuperar somente runtimes gerenciados; registrar instalações com recibos SHA-256; e aceitar apenas runbooks do catálogo embarcado.
- **Motivo:** ENV, Explorer, Runtime, Store e Actions precisam compor fluxos úteis sem entregar segredos, filesystem, processos, permissões ou automação arbitrária ao renderer.
- **Impacto:** a UI envia IDs e seleções tipadas. Valores de ENV são privados por padrão e segredos não atravessam Compare/Promote/Impact; o radar limita entradas, diretórios, bytes, duração e resultados; recovery confirma a árvore do processo gerenciado; consentimento coincide com o manifesto; Runbooks são serializados por app e não aceitam passos, comandos ou URLs do renderer.
- **Revisar quando:** existir distribuição remota assinada, permissões revogáveis, múltiplos ambientes ativos ou protocolo local autenticado para apps externos.
