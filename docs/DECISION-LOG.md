# Matriz Decision Log

## 2026-08-29 — `v1-consolidation` é evidência histórica, não fonte de merge

- **Decisão:** não mesclar nem aplicar diretamente a árvore staged de
  `codex/v1-consolidation-2026-08-27`; sua análise permanece registrada em
  `docs/audit/2026-08-29-v1-consolidation-selective-assimilation.md`.
- **Motivo:** a árvore é predominantemente regressiva contra a `main` e reduz
  controles de arquitetura, autorização, cobertura de segurança e runtime.
- **Impacto:** recuperação futura exige proposta app-local, testes e revisão
  independente; não autoriza merge, cherry-pick ou cópia ampla da v1.
- **Revisar quando:** surgir um commit isolado, testado e ausente da `main`,
  com benefício atual e compatibilidade comprovada com as leis arquiteturais.

## 2026-08-27 — Workbench e Seumei têm distribuição Windows independente

> **Status em 2026-08-28:** parcialmente substituída pela política
> Tauri-first. A independência de distribuição permanece válida; a escolha de
> Electron para cada produto passa a ser provisória e exige avaliação app-local
> pelo processo de `docs/desktop-application-architecture.md`.

- **Decisão:** distribuir Workbench e Seumei como apps Electron/NSIS x64
  independentes, adquiridos pela Store do Matriz Control por manifests v1
  assinados. Workbench mantém runtime Next local e `.matriz/**`; Seumei mantém
  a aplicação web como autoridade e usa um shell restrito à origem HTTPS
  oficial.
- **Motivo:** cada produto precisa de instalação, atualização e lifecycle
  próprios sem aumentar o instalador do Control, compartilhar internals ou
  levar banco/credenciais da Seumei ao desktop.
- **Impacto:** esta decisão substitui o Workbench embarcado no instalador do
  Control, a proibição temporária de shell para a nova Seumei e o ledger de
  instalação exclusivamente no navegador. Health continua como ativação
  leve; apps nativos usam o registro do Windows como evidência de instalação.
  Sem assinatura Ed25519 do manifesto, Authenticode/publisher confiável ou
  origem HTTPS da Seumei, a distribuição permanece indisponível.
- **Revisar quando:** macOS/Linux/ARM64, catálogo de terceiros, offline Seumei
  ou um segundo host da Store justificarem outro formato ou trust root.

## 2026-08-26 — Installable Health remains app-local with runtime-on-open

- **Decision:** keep the Health install ledger and smart-rail mutation in Matriz Control, while Health owns its read-only Windows observation; installation persists only a local app ID and runtime activation happens on open.
- **Reason:** the two apps have distinct lifecycle and ownership boundaries, and there is no second consumer that justifies a shared package or a remote installer.
- **Impact:** Store installation does not start Health; Control starts the declared local action, waits for readiness, and mounts one iframe; switching away removes the iframe, web mode marks Control tab counts unavailable, and unsupported sensors remain explicit.
- **Review when:** a second consumer needs the install protocol, installation becomes remote/multiuser, or Health requires process-control capabilities.

## 2026-08-26 — Matriz Control owns bounded local diagnostics

- **Decision:** keep Doctor resource inspection, regenerable-cache cleanup, terminal metrics, Workspace read models, and startup profiles app-local in Matriz Control.
- **Reason:** all capabilities operate the same validated project catalog and process supervisor; no second consumer justifies a shared package.
- **Impact:** browser requests use identifiers and preview tokens only; source, dependencies, secrets, databases, uploads, and user-authored files are never cleanup targets.
- **Review when:** a second cockpit consumes the same diagnostics or remote/multiuser operation becomes real.

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
## Baseline da arquitetura aprovada — programa Matriz

> As entradas desta seção descrevem o **alvo aprovado**, não infraestrutura ou
> funcionalidades já entregues. As ondas indicam quando a implementação será
> tratada; esta baseline documental pertence à Onda 1.

### 2026-08-05 — Banco central com isolamento por schema — Onda 2

- **Decisão:** uma instância física de PostgreSQL no Neon terá os schemas
  `core`, `hub`, `spot`, `seumei`, `contracts` e `willdash`, cada um com
  migrations, role de runtime e RLS próprios.
- **Motivo:** manter ownership por app e aplicar isolamento tenant desde a
  primeira entrega de banco.
- **Impacto:** não há FKs cross-schema; Workbench e Sites continuam fora dessa
  topologia.
- **Revisar quando:** houver requisito aprovado para novo schema, mudança de
  isolamento ou evidência operacional que invalide a topologia.

### 2026-08-05 — Identidade global e autorização por tenant/app — Onda 2

- **Decisão:** `User` é global; `TenantMembership` representa o papel
  organizacional do usuário no tenant e `AppGrant` concede roles/capabilities
  por app.
- **Motivo:** separar identidade, participação organizacional e autorização de
  produto sem tornar dados operacionais globais.
- **Impacto:** somente identidade, credenciais/desafios, clientes OIDC e
  catálogo institucional são globais; operações pertencem ao tenant.
- **Revisar quando:** uma nova entidade pedir escopo global ou a política de
  grants exigir revisão de segurança.

### 2026-08-05 — Matriz Identity autogerido — Onda 2

- **Decisão:** criar `matriz-identity` como oitavo app/serviço, ainda ausente,
  usando `oidc-provider` certificado, com Cloud Run como runtime primário.
- **Motivo:** concentrar OIDC e dados de identidade do schema `core` em owner
  explícito, sem delegar autoridade a apps consumidores.
- **Impacto:** apps validam tokens e constroem contexto server-only; Identity
  não é declarado como implantado nesta baseline.
- **Revisar quando:** certificação, requisitos de disponibilidade, residência
  de dados ou a estratégia de runtime mudarem.

### 2026-08-05 — Web apps no Vercel — alvo aprovado

- **Decisão:** os apps web terão Vercel como plataforma de entrega; isso não
  altera o runtime primário planejado do Matriz Identity.
- **Motivo:** manter deploy web por app e separar a necessidade de runtime OIDC.
- **Impacto:** cada app preserva seu ownership, configuração e contrato público.
- **Revisar quando:** custo, limites de plataforma ou requisitos de execução
  exigirem outra estratégia.

### 2026-08-05 — HTTP síncrono e outbox/inbox durável — Onda 3

- **Decisão:** comandos entre processos usam HTTP autenticado/idempotente;
  eventos usam outbox transacional app-local, dispatcher, inbox com dedupe e
  DLQ/replay.
- **Motivo:** evitar transações e transporte em memória compartilhados entre
  apps independentes.
- **Impacto:** POCs atuais em memória não representam entrega distribuída;
  versões v1 e v2 de eventos coexistem durante migração.
- **Revisar quando:** a escala ou os SLOs demandarem evolução do transporte.

### 2026-08-05 — Modular monolith antes de promoção — alvo aprovado

- **Decisão:** capacidades nascem app-localmente e só são promovidas a app ou
  serviço por deployment, owner, política de dados, escala ou contrato externo
  independentes.
- **Motivo:** preservar boundaries sem criar serviços ou packages prematuros.
- **Impacto:** package compartilhado exige dois consumidores reais, superfície
  estável e sem domínio forte.
- **Revisar quando:** houver evidência documentada de uma fronteira independente.

### 2026-08-05 — Seumei Desktop e PWA offline — Onda 4

- **Decisão:** entregar o modo offline V1 para Desktop e PWA do Seumei, com
  sincronização opt-in e estados explícitos de conflito/conectividade.
- **Motivo:** suportar operação essencial sem fingir que efeitos cross-app foram
  concluídos fora da rede.
- **Impacto:** comandos remotos ficam em `pending_connectivity` até sincronizar;
  este modo ainda não está entregue.
- **Revisar quando:** pilotos, conflitos reais ou requisitos de retenção e
  criptografia exigirem ajuste.

### 2026-08-05 — Workbench e Sites permanecem file-backed — alvo aprovado

- **Decisão:** Workbench mantém `.matriz/**`/Git e Sites mantém
  arquivos/configuração, sem schema PostgreSQL apenas para uniformidade.
- **Motivo:** os dois produtos têm ownership e ciclos de vida distintos dos
  domínios transacionais.
- **Impacto:** banco central não passa a ser dependência implícita desses apps.
- **Revisar quando:** requisitos reais de persistência central justificarem uma
  mudança de ownership e migração.

### 2026-08-05 — Sem plugins de código remoto em runtime — alvo aprovado

- **Decisão:** integrações remotas usam contratos, manifests ou snapshots
  assinados; a V1 não baixa, importa ou executa código remoto em runtime.
- **Motivo:** preservar cadeia de confiança, versionamento e auditabilidade.
- **Impacto:** extensibilidade não cria dependência dinâmica de internals de
  outro repositório.
- **Revisar quando:** houver modelo de sandbox, assinatura e revogação aprovado.

### 2026-08-05 — Baseline de banco pode iniciar vazia — Onda 2

- **Decisão:** a entrega inicial de schema/migration pode conter banco vazio;
  não exige seed de dados operacionais para ser considerada baseline válida.
- **Motivo:** separar estrutura, isolamento e autorização da carga de produto.
- **Impacto:** seeds de demonstração não definem contrato nem são requisito de
  produção.
- **Revisar quando:** uma migração precisar de dados de referência obrigatórios.

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

## 2026-08-20 — Sessão mock cobre todas as portas web registradas

- **Decisão:** permitir no CORS mock do Hub as portas loopback 3000–3008 e manter o registro de sessões HTTP mock no estado global do processo.
- **Motivo:** a validação real da Seumei em 3008 provou que a allowlist terminava em 3006 e que handlers compilados separadamente não compartilhavam o `Map` local de sessões.
- **Impacto:** MatrizLib 3007 e Seumei 3008 conseguem autenticar; origens externas e 3009+ continuam negadas. Apenas o broker de desenvolvimento muda.
- **Revisar quando:** o broker mock for removido em favor da sessão persistente/implantada.

## 2026-08-26 — Workbench local instalado e reparo limitado

- **Decisão:** embarcar o Workbench no Matriz Control com identidade local automática, contrato loopback autenticado e reparo Codex limitado a uma ação catalogada e um rerun por lease.
- **Motivo:** a ferramenta interna precisa funcionar sem login e sem Hub, preservar a versão web e recuperar falhas locais sem virar um SaaS ou conceder execução arbitrária.
- **Impacto:** Control possui processo/janela; Workbench possui diagnóstico e estado de reparo. O instalador exclui dados e fontes locais. Após três falhas, a recuperação exige intervenção humana.
- **Revisar quando:** houver assinatura de binário, atualização automática confiável ou um segundo host para o contrato local.

## 2026-08-26 — Atualização desktop explícita e assinada

- **Decisão:** usar o fluxo NSIS oficial do `electron-updater`, com verificação, download diferencial e instalação separados por ações humanas; URLs e artefatos pertencem ao build confiável, nunca ao renderer ou MCP.
- **Motivo:** entregar correções pequenas sem reinstalação completa preservando a fronteira local e a verificação Authenticode.
- **Impacto:** `autoDownload` e `autoInstallOnAppQuit` ficam desligados; pacote sem `app-update.yml` declara o updater indisponível; produção exige instalador assinado, publisher confiável, blockmap e provider configurados no pipeline.
- **Revisar quando:** houver múltiplos canais, rollback assinado ou distribuição de apps independentes fora do NSIS do Control.

## 2026-08-27 — Project Host externo permanece app-local e revisado

- **Decisão:** permitir que o Matriz Control registre projetos Node/web externos por seleção nativa, inspeção limitada, receita versionada e aprovação humana; toda execução continua pertencendo ao `TerminalSupervisor` e toda superfície web fica presa à origem loopback aprovada.
- **Motivo:** operar projetos fora do monorepo sem converter descoberta universal em filesystem ou execução arbitrários, nem criar um package compartilhado sem consumidores reais.
- **Impacto:** renderer envia somente IDs, revisões e tokens; o processo nativo resolve caminhos, ações, ambiente, portas e URLs. Listeners estrangeiros não são adotados nem encerrados. Remover cadastro preserva os arquivos.
- **Revisar quando:** houver segundo host real, suporte a stacks não Node, sandbox de sistema operacional ou contrato público estável com outro app.

## 2026-08-28 — Tauri é o runtime desktop preferencial

- **Decisão:** novos produtos desktop Matriz usam Tauri por padrão, conforme `docs/desktop-application-architecture.md`. Electron fica reservado a superfícies cujo requisito concreto dependa do Chromium, Node, browser automation ou compatibilidade Electron; no Matriz Uninstall, Tauri é a edição principal e Electron é compatibilidade e benchmark.
- **Motivo:** reduzir tamanho instalado, consumo de memória e custo de atualização sem perder uma alternativa para casos específicos.
- **Impacto:** catálogo, documentação e CI identificam claramente a edição recomendada. O núcleo React, os ViewModels e contratos continuam compartilhados, sem apagar as edições Electron existentes antes de avaliação, alternativa verificada e rollback.
- **Revisar quando:** um benchmark reproduzível ou uma limitação funcional do WebView2 demonstrar vantagem material do Electron para um produto específico.

## 2026-08-29 — Control 0.2.0 usa um único cockpit Next no Windows

- **Decisão:** o Electron do Matriz Control abre `/home`, empacota o mesmo standalone Next usado no web e publica NSIS somente por tag `control-v<versão>` validada e assinada.
- **Motivo:** o download 0.1.0 iniciava diretamente na rota de navegador nativo e não apresentava as novas áreas operacionais 0.2.0; a distribuição precisa conservar o updater seguro sem registrar segredos no repositório.
- **Impacto:** a paridade de navegação web/desktop passa a vir do mesmo build. O pipeline falha antes de publicar se o certificado Authenticode não estiver configurado; ausências de canal continuam `unavailable` no aplicativo.
- **Revisar quando:** houver migração aprovada para Tauri, canais beta/rollback assinados ou distribuição fora do GitHub Releases.

## 2026-08-30 — Infraestrutura local Matriz usa cluster dedicado e contratos declarativos

- **Decisão:** PostgreSQL 17 em `127.0.0.1:55432`, Garnet em `46379` e NATS em
  `54222`/`58222` são serviços locais exclusivos da Matriz, administrados pelo
  Control. Um database `matriz` contém oito schemas com roles exclusivas. Todo
  app publica `infrastructure.json`; SQL cross-schema é proibido.
- **Motivo:** permitir desenvolvimento local restaurável, com custo previsível,
  isolamento verificável e caminho para futura separação física sem duplicar
  fontes autoritativas.
- **Impacto:** o serviço externo em `5432` fica fora da autoridade do Control;
  migrations são explícitas; RLS usa contexto server-side transacional; secrets
  ficam no vault; cloud não é provisionada pela V1.
- **Correção de implementação:** `56379` foi substituída por `46379` porque a
  faixa efêmera/reservada do Windows de estações pode incluir `56379`, impedindo
  o bind mesmo sem listener. O Control não altera reservas globais do sistema.
- **Revisar quando:** a primeira separação física de domínio, múltiplos usuários
  Windows administradores ou um pooler forem requisitos concretos.
