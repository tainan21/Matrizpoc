# Auditoria para o ponto zero da V1 — worktrees, branches e infraestrutura local

Data da coleta: 2026-08-31. Referência: `main` e `origin/main` em `26f8a4d`.

## Resumo executivo

- A `main` canônica está limpa, publicada e sem divergência do remoto.
- Existem nove worktrees registradas: uma canônica limpa, duas worktrees limpas com commits exclusivos e seis com alterações locais.
- A branch estar contida em `main` autoriza excluir a referência, mas **não** autoriza apagar uma worktree suja.
- Antes do ponto zero, preservar e classificar principalmente o checkout original e `v1-consolidation-2026-08-27`.
- Branches antigas relacionadas a segredo ficam em quarentena: não devem ser mescladas nem publicadas antes de auditoria de histórico.

## Worktrees registradas

`behind/ahead` compara o `HEAD` da worktree com `main`.

| Pasta | Branch/HEAD | Último commit | Data | Estado | Decisão recomendada |
|---|---|---:|---|---:|---|
| `C:\Apps\matriz-infra-hub-main-integration-2026-08-30` | `main` | `26f8a4d` | 2026-08-30 23:42 | limpa, `0/0` | **Manter.** É o checkout canônico da V1. |
| `C:\Apps\matriz-infra-hub` | `codex/matriz-local-infrastructure-v1` | `3ab6d14` | 2026-08-30 21:11 | 123 mudanças; `11/0` | **Revisão prioritária.** Branch já incorporada, mas há 73 modificados e 50 não rastreados pertencentes ao usuário. Não apagar. |
| `C:\Apps\matriz-infra-hub\.worktrees\v1-consolidation-2026-08-27` | `codex/v1-consolidation-2026-08-27` | `61398bc` | 2026-08-25 06:59 | 1.496 entradas; `364/0` | **Quarentena de conteúdo.** Branch incorporada, mas há 1.131 adicionados, 178 modificados, 132 removidos e 55 renomes no índice/worktree. Inventariar e criar checkpoints seletivos antes de qualquer remoção. |
| `C:\Apps\matriz-infra-hub\.worktrees\v1-consolidation-audit-2026-08-29` | `codex/v1-consolidation-audit-2026-08-29` | `6541744` | 2026-08-29 12:38 | limpa; `28/1` | **Revisar um commit.** Comparar/cherry-pick `6541744` se a auditoria ainda for útil; depois pode ser removida. |
| `C:\Users\taina\.codex\worktrees\5d70\matriz-infra-hub` | `codex/matriz-consolidated` | `2babe03` | 2026-08-27 21:59 | limpa; `164/1` | **Revisar um commit documental.** `2babe03`; depois remover ou arquivar. |
| `C:\Users\taina\.codex\worktrees\2fe3\matriz-infra-hub` | detached `b7781dd` | `b7781dd` | 2026-08-04 15:59 | 115 mudanças; `478/0` | **Revisar antes de excluir.** Sem commit exclusivo, porém 107 modificados e 8 não rastreados; parte aparenta build/cache, parte contém código/configuração. |
| `C:\Users\taina\.codex\worktrees\4c75\matriz-infra-hub` | detached `f44374f` | `f44374f` | 2026-08-18 12:41 | 8 mudanças; `403/0` | **Provável descarte**, após confirmar que são somente oito `next-env.d.ts` gerados. |
| `C:\Users\taina\.codex\worktrees\d3a0\matriz-infra-hub` | detached `4822a2a` | `4822a2a` | 2026-08-04 15:50 | 41 mudanças; `478/0` | **Revisar antes de excluir.** Mistura artefatos `.turbo`/`tsbuildinfo` com código e `package.json`. |
| `C:\Users\taina\.codex\worktrees\d6d3\matriz-infra-hub` | detached `2033bde` | `2033bde` | 2026-08-04 15:50 | 56 mudanças; `478/0` | **Revisar antes de excluir.** Mistura artefatos gerados com código e arquivos não rastreados. |

Há ainda a pasta residual não registrada `C:\Apps\matriz-infra-hub\.worktrees\outbox-tenancy-v1`. A branch foi integrada e excluída; a remoção física falhou por caminhos longos do Windows. Ela pode ser limpa depois, usando uma ferramenta compatível com long paths, após confirmar que não voltou a ser registrada em `git worktree list`.

## Branches locais já incorporadas em `main`

Estas referências não têm commits exclusivos. Podem ser removidas **depois** de resolver qualquer worktree vinculada e preservar alterações não commitadas:

- `backup/main-before-control-assimilation-2026-08-28` — `e78336e`, 2026-08-28.
- `backup/pre-consolidation-2026-08-05` — `9389602`, 2026-08-05.
- `codex/hub-control-plane` — `2033bde`, 2026-08-04.
- `codex/matriz-desktop` — `7b82c7a`, 2026-08-25.
- `codex/matriz-hub-alpha` — `08731de`, 2026-08-27.
- `codex/matriz-local-infrastructure-v1` — `3ab6d14`, 2026-08-30; checkout original ainda sujo.
- `codex/project-factory` — `b7781dd`, 2026-08-04.
- `codex/seumei-catalog-products` — `de978d3`, 2026-08-24.
- `codex/seumei-store-commerce` — `997a8bd`, 2026-08-25.
- `codex/seumei-tenant-hub` — `74a6ff0`, 2026-08-24.
- `codex/v1-consolidation-2026-08-27` — `61398bc`, 2026-08-25; worktree com grande volume não commitado.
- `codex/workbench-reconciliation` — `4822a2a`, 2026-08-04.

## Branches com commits exclusivos que exigem revisão

| Branch | SHA/data | Ahead/behind | Conteúdo indicado pelo commit | Recomendação |
|---|---|---:|---|---|
| `codex/v1-consolidation-audit-2026-08-29` | `6541744`, 2026-08-29 | `1/28` | auditoria documental V1 | Revisar primeiro; provável cherry-pick ou descarte consciente. |
| `codex/matriz-consolidated` | `2babe03`, 2026-08-27 | `1/164` | edição de prompt Seumei | Revisar; baixo risco, conteúdo documental. |
| `codex/agent-operating-kernel` | `c29daaf`, 2026-08-27 | `16/364` | kernel/evidências do Workbench | Revisão arquitetural e diff por paths; não mesclar em bloco. |
| `codex/workbench-federated-portfolio` | `ba0c26e`, 2026-08-27 | `3/478` | Workbench/portfólio | Revisar três commits e cherry-pick seletivo. |
| `codex/workbench-visual-reform` | `9d39f4e`, 2026-08-27 | `1/477` | alteração visual/projeto | Revisar contra a UI atual; provável obsolescência. |
| `codex/wave-1-foundation` | `73482d5`, 2026-08-28 | `1/429` | checkpoint OIDC Wave 1 | Comparar com a implementação OIDC já presente antes de decidir. |
| `codex/consolidation-safe` | `eafb51f`, 2026-08-27 | `1/364` | antigo merge V1 | Provavelmente obsoleto; confirmar patch-id antes de excluir. |
| `codex/checkpoint-*` (10 branches) | 2026-08-27 | 1 commit cada | snapshots de patches staged/detached/docs/Ops-Pay | Fazer relatório de patch-id e paths; incorporar somente arquivos ausentes da `main`. |

Branches `checkpoint-*` existentes: `hub-detached`, `main-seumei-audit-doc`, `matriz-consolidated-doc`, `ops-pay`, `project-factory-detached`, `v1-index-corrected`, `v1-index-filtered`, `v1-staged`, `wave1-staged` e `workbench-detached`.

## Branches de segurança em quarentena

Não mesclar nem enviar novamente antes de `git-secrets`/Gitleaks e inspeção manual do histórico:

- `backup/consolidation-with-secret-history-2026-08-05` — 13 commits exclusivos.
- `backup/final-before-clean` — 4 commits exclusivos.
- `backup/push-protection` — 5 commits exclusivos; assunto menciona `.env`.
- `backup/push-protection-2` — 5 commits exclusivos; assunto menciona `.env`.

Se os patches úteis já estiverem em `main`, a decisão recomendada é registrar evidência da auditoria e excluir as referências localmente. Remover branch não apaga imediatamente objetos históricos; a política de retenção/reflog deve ser decidida separadamente.

## Sequência proposta para chegar ao ponto zero

1. Congelar `main@26f8a4d` como baseline verde e criar uma tag anotada somente depois do aceite operacional.
2. Classificar as 123 alterações do checkout original por app/feature e transformar apenas trabalho válido em commits pequenos.
3. Auditar a worktree `v1-consolidation-2026-08-27` por paths, separando fonte real de `.matriz`, outputs, caches e artefatos gerados.
4. Revisar os dois commits exclusivos das worktrees limpas (`6541744` e `2babe03`).
5. Revisar as quatro worktrees Codex sujas; a `4c75` é a primeira candidata a descarte por conter somente arquivos gerados conhecidos.
6. Calcular patch-id/diffstat de todas as branches não mescladas; cherry-pick apenas patches ainda ausentes.
7. Auditar e eliminar referências com possível histórico de segredo.
8. Remover worktrees vazias, executar `git worktree prune`, apagar branches incorporadas e revisar branches remotas antigas.
9. Provisionar e aceitar a infraestrutura local; quando todos os gates estiverem verdes, criar a tag de ponto zero/V1.

## Onde está a infraestrutura local

### Código-fonte e operação

- Control: `apps/matriz-control`
- Cockpit: `apps/matriz-control/src/ui/infrastructure/infrastructure-cockpit.tsx`
- Catálogo fixo de serviços: `apps/matriz-control/src/modules/infrastructure/domain/service-catalog.ts`
- Host Windows seguro: `apps/matriz-control/desktop/windows-infrastructure-host.ts`
- Instalador elevado: `apps/matriz-control/desktop/infrastructure-helper.ps1`
- Migrations: `apps/matriz-control/desktop/database-migration-apply-helper.ps1`
- Seed: `apps/matriz-control/desktop/windows-local-development-seed-host.ts`
- Vault/env local: `apps/matriz-control/desktop/local-environment-helper.ps1`
- Diagnóstico outbox: `apps/matriz-control/desktop/outbox-diagnostics-helper.ps1`
- Runbook oficial: `docs/infrastructure/windows-services-runbook.md`
- Backup/restore: `docs/infrastructure/postgres-recovery-runbook.md`

### Pastas criadas após a instalação

- Binários, configurações, dados e logs: `%ProgramData%\Matriz\Infrastructure` — normalmente `C:\ProgramData\Matriz\Infrastructure`.
- PostgreSQL: `C:\ProgramData\Matriz\Infrastructure\postgres`.
- Data directory PostgreSQL: `C:\ProgramData\Matriz\Infrastructure\postgres\data`.
- Garnet: `C:\ProgramData\Matriz\Infrastructure\garnet`.
- NATS/JetStream: `C:\ProgramData\Matriz\Infrastructure\nats`.
- Recibo: `C:\ProgramData\Matriz\Infrastructure\installation-receipt.json`.
- Vault, preferências e recibos do usuário: `%LOCALAPPDATA%\Matriz\Control`, normalmente `C:\Users\taina\AppData\Local\Matriz\Control`.
- Bootstrap PostgreSQL protegido por DPAPI: `%LOCALAPPDATA%\Matriz\Control\vault\bootstrap-postgres.dpapi`.

Essas pastas ainda não existem necessariamente: o Control as cria durante o setup confirmado.

## Como instalar e iniciar PostgreSQL, Garnet e NATS

### Pré-requisitos

1. Windows x64.
2. PostgreSQL major 17 instalado em `C:\Program Files\PostgreSQL\17`; o Control reutiliza os binários, mas cria outro cluster.
3. .NET Runtime 8 para o host Garnet.
4. Node 22, pnpm 9 e dependências do monorepo para executar o Control em desenvolvimento.
5. Rede disponível para os downloads oficiais fixados do Garnet 2.1.5 e NATS 2.14.5.
6. Permissão para aceitar uma elevação UAC no primeiro setup.

### Executar o Control Desktop em desenvolvimento

No checkout canônico:

```powershell
Set-Location -LiteralPath 'C:\Apps\matriz-infra-hub-main-integration-2026-08-30'
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @matriz/app-matriz-control desktop:dev
```

No aplicativo:

1. Abra **Infrastructure**.
2. Em **Overview**, clique **Instalar stack Matriz**.
3. Confira o preview e confirme em até 30 segundos.
4. Aceite o UAC.
5. Aguarde `MatrizPostgres17`, `MatrizGarnet` e `MatrizNats` chegarem a `healthy`.
6. Em **Migrations**, aplique migrations explicitamente; start não executa migrations.
7. Em **Database**, execute **Popular ambiente local** para o seed local.
8. Exporte/injete os ambientes locais dos apps pelo Control; nunca copie secrets do vault para documentação.

Não execute `infrastructure-helper.ps1` manualmente: ele exige hashes de credenciais gerados pelo processo principal e foi projetado para ser chamado pelo host desktop com preview, confirmação de uso único e UAC.

### Endpoints finais

| Serviço | Windows Service | Endpoint |
|---|---|---|
| PostgreSQL 17 | `MatrizPostgres17` | `127.0.0.1:55432`, database `matriz` |
| Garnet 2.1.5 | `MatrizGarnet` | `127.0.0.1:46379` |
| NATS JetStream 2.14.5 | `MatrizNats` | `127.0.0.1:54222` |
| NATS monitoring | parte de `MatrizNats` | `http://127.0.0.1:58222` |

O PostgreSQL externo em `5432` é intocável. A porta antiga `56379` não é válida para esta V1; a decisão final usa `46379` para evitar a faixa efêmera/reservada do Windows.

### Verificação somente leitura

```powershell
Get-Service -Name MatrizPostgres17,MatrizGarnet,MatrizNats
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 5432,55432,46379,54222,58222
Test-NetConnection 127.0.0.1 -Port 55432
Test-NetConnection 127.0.0.1 -Port 46379
Test-NetConnection 127.0.0.1 -Port 54222
Invoke-RestMethod http://127.0.0.1:58222/varz
```

Compare o serviço e listener `5432` antes e depois. O Control deve operar somente os três serviços cujo `ImagePath` está dentro de `C:\ProgramData\Matriz\Infrastructure`.

## Critério honesto de 100%

O código estar em `main` não equivale a aceite operacional. A V1 chega a 100% deste gate quando:

- as três Windows Services estão instaladas e `healthy`;
- migrations dos oito schemas estão `clean` e sem drift;
- seed local e Identity funcionam;
- Seumei e Hub gravam outbox na mesma transação do domínio;
- NATS indisponível acumula eventos, e o restart confirma replay sem duplicação;
- as roles worker não leem tabelas de negócio;
- backup/restore e proteção do PostgreSQL `5432` são comprovados;
- o cockpit mostra diagnóstico correto sem secrets;
- a limpeza de worktrees/branches foi concluída ou formalmente arquivada.
