# Inventário de runtimes das aplicações

> Fonte viva do estado e da classificação de runtime dos apps Matriz. A política
> de escolha está em `docs/desktop-application-architecture.md`; o inventário de
> instaladores V1 é um snapshot histórico e não substitui esta matriz.

## Como interpretar

- **Comprovado** descreve arquivos e dependências versionados.
- **Classificação** aplica a política vigente sem transformar hipótese em decisão.
- **Alvo atual** é a menor direção segura conhecida; não autoriza migração.
- Prioridade **P1** pede investigação antes de ampliar o runtime, **P2** pede
  manutenção controlada e **P3** não exige trabalho desktop agora.

## Matriz

| App | Papel | Superfície atual | Stack comprovada | Classificação | Alvo atual | Risco | Prioridade | Evidência | Próximo checkpoint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `contracts` | Contratos e histórico | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhum shell desktop | P3 | `apps/contracts/package.json` | Reavaliar somente com requisito desktop aprovado |
| `health` | Saúde e telemetria local | Web/serviço | Next.js | web/serviço | Permanecer web/serviço | Baixo: nenhuma configuração desktop | P3 | `apps/health/package.json` | Reavaliar somente com requisito desktop aprovado |
| `matriz-admin` | Administração operacional | Web + desktop | Tauri 2 | Tauri confirmado | Manter Tauri | Baixo: runtime alinhado | P2 | `apps/matriz-admin/package.json`; `apps/matriz-admin/desktop/src-tauri/tauri.conf.json` | Validar pacote e rollback quando o app for alterado |
| `matriz-client-admin` | Monitoramento client-facing | Web + desktop experimental | Next.js + Tauri 2 | Web principal; Tauri congelado após 0.1.0 | Manter web; desktop somente manutenção crítica | Baixo: shell não contém domínio | P2 | `apps/matriz-client-admin/package.json`; `apps/matriz-client-admin/desktop/src-tauri/tauri.conf.json` | Revisar quando houver dados reais dos sistemas Laudate |
| `matriz-control` | Supervisão local, terminal e Project Host | Web + desktop | Electron | Electron compatibilidade | Preservar capacidades específicas enquanto migram ou recebem exceção | Médio: edição separada por identidade e canal próprios | P1 | `apps/matriz-control/package.json`; `apps/matriz-control/desktop/main.ts` | Revisar capacidades restantes antes de encerrar compatibilidade |
| `matriz-desktop` | Cockpit nativo Windows | Desktop | Tauri 2 | Tauri confirmado; Control principal 1.0.0 | Evoluir como edição principal | Médio: migração incremental do Electron permanece | P1 | `apps/matriz-desktop/package.json`; `apps/matriz-desktop/src-tauri/tauri.conf.json` | Validar release instalada e migração assistida |
| `matriz-hub` | Control plane e MatrizDocs | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/matriz-hub/package.json` | Reavaliar somente com requisito desktop aprovado |
| `matriz-identity` | OIDC e identidade central | Serviço | Node/TypeScript | web/serviço | Permanecer serviço | Baixo: desktop não pertence ao papel do app | P3 | `apps/matriz-identity/package.json` | Manter runtime de serviço separado de shells locais |
| `matriz-ops` | Operações | Web + desktop | Tauri 2 | Tauri confirmado | Manter Tauri | Baixo: runtime alinhado | P2 | `apps/matriz-ops/package.json`; `apps/matriz-ops/desktop/src-tauri/tauri.conf.json` | Validar pacote e rollback quando o app for alterado |
| `matriz-pay` | Pagamentos e ledger | Web/serviço | Next.js | web/serviço | Permanecer web/serviço | Baixo: nenhuma configuração desktop | P3 | `apps/matriz-pay/package.json` | Reavaliar somente com requisito desktop aprovado |
| `matriz-uninstall` | Manutenção e desinstalação confiável | Web + dois desktops | Tauri 2 + Electron | Tauri principal; Electron compatibilidade | Preservar comparação até critério de saída explícito | Médio: duas stacks mantêm responsabilidade semelhante | P1 | `apps/matriz-uninstall/package.json`; `apps/matriz-uninstall/desktop/tauri/src-tauri/tauri.conf.json`; `apps/matriz-uninstall/desktop/electron/main.ts` | Definir paridade, benchmark, rollback e data de revisão do Electron |
| `matriz-workbench` | Tooling local-first e agentes | Web + desktop | Electron | Electron provisório | Investigar possível exceção | Alto: Node local, updater e operações de agentes podem justificar exceção | P1 | `apps/matriz-workbench/package.json`; `apps/matriz-workbench/electron-builder.config.cjs`; `apps/matriz-workbench/src/native-desktop/main.ts` | Inventariar dependências obrigatórias de Chromium/Node e alternativas Tauri |
| `matrizlib` | Catálogo visual e design system | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/matrizlib/package.json` | Reavaliar somente com requisito desktop aprovado |
| `seumeiapp` | Produto Seumei | Web + desktop | Electron | Electron provisório | Avaliar migração incremental para Tauri | Alto: produto desktop ativo e política atual divergente | P1 | `apps/seumeiapp/package.json`; `apps/seumeiapp/desktop/main.ts`; `apps/seumeiapp/desktop/electron-builder.yml` | Mapear persistência, offline, updater, assinatura e rollback antes de migrar |
| `sites` | Sites e configuração file-backed | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/sites/package.json` | Reavaliar somente com requisito desktop aprovado |
| `spot` | Bandas, artistas, gigs e bookings | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/spot/package.json` | Reavaliar somente com requisito desktop aprovado |
| `willdash` | Metas, recompensas e atividade | Web | Next.js | web/serviço | Permanecer web | Baixo: nenhuma configuração desktop | P3 | `apps/willdash/package.json` | Reavaliar somente com requisito desktop aprovado |

## Drift conhecido

- `docs/architecture-overview.md` deve ser validado contra os 17 Infrastructure Contracts antes de mudanças de runtime.
- `docs/architectural-laws.md` contém trechos históricos que ainda dizem que
  `matriz-identity` não existe.
- documentos anteriores alternam `seumei`, `apps/seumei` e `seumeiapp`; o
  diretório atual é `apps/seumeiapp` e a identidade pública permanece `seumei`.
- `matriz-control` e `matriz-desktop` usam o nome de produto Matriz Control e
  precisam de uma decisão de ownership separada.
- `docs/releases/v1/installer-inventory.md` registra uma baseline de release em
  2026-08-27; ele não representa automaticamente o estado atual.

Esses pontos devem ser corrigidos em incrementos independentes, preservando
trechos históricos quando forem deliberadamente datados.

## Regra de atualização

Atualize esta matriz no mesmo commit que adicionar, remover ou trocar um runtime
desktop. Uma mudança para Electron exige também o registro de exceção definido
em `docs/desktop-application-architecture.md`. Mudanças apenas de versão que não
alterem a classificação atualizam a evidência somente quando ela deixar de ser
válida.
