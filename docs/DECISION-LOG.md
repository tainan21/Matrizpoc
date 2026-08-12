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
