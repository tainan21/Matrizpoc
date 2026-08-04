# Engineering Operations multiagente

Contrato que liga solicitações, execuções Codex, arquivos, checks, evidências,
revisão humana e Git. O registro canônico permanece local e baseado em arquivos;
Git e threads externas são observados de forma read-only.

## 1. Diagnóstico do protocolo atual

O Workbench já separava backlog, `AgentRequest`, run, activity, evidência e revisão,
com locks, revisões otimistas e MCP nomeado. Faltavam claim com arquivos/checks e
baseline Git, interrupção retomável, checks estruturados e reconciliação entre registro,
run e repositório. O corte atual põe regras críticas no domínio, mantém o handbook
como orientação e faz aprovações mutantes falharem fechadas sem claim `change`.

## 2. Exemplos reais de falhas e lacunas

- Runs legados registram comandos, mas não diferenciam check planejado de resultado.
- Requests legados podem estar ativos sem owner, lease ou escopo de arquivo.
- Fonte federada registrada mas indisponível não significa documento inexistente.
- Working tree sujo impede atribuir todo `git diff` ao agente atual.
- Interrupção podia parecer falha definitiva, sem tentativa retomável.

Nenhum diagnóstico persiste tokens, prompts privados ou saída integral de comandos.

## 3. Invariantes do sistema

1. Nenhuma mutação aprovada ocorre sem projeto, request, claim ativo e modo `change`.
2. `plan_only` termina sem arquivos alterados e checks executados.
3. Produto, execução, validação, documentação e revisão humana são independentes.
4. Tentativa terminal é imutável; retomada cria outra tentativa.
5. Evidência não concede aceitação, score, gate ou release.
6. Alterações preexistentes não são atribuídas à execução atual.
7. Reconciliação informa divergências e nunca modifica Git ou governação.
8. Escrita em `.matriz/**` usa apenas workflow autorizado, lock e revisão.

## 4. Modelo de estados e transições

`AgentRequest`: `queued -> claimed -> in_progress -> completed`; de `claimed` ou
`in_progress` pode ir para `blocked` ou `interrupted`; ambos voltam a `claimed`.
Cancelamento é explícito. `ExecutionAttempt`: `running -> completed | failed |
interrupted | cancelled`. `CheckExecution`: `planned -> running -> passed | failed |
cancelled`; um terminal vira `expired` quando o commit validado fica stale. Revisão
humana permanece `pending` até ação humana.

## 5. Identidade e correlação entre entidades

`AgentRequest.id` é a chave canônica V1. Ela aparece em claim, run, snapshot e no
trailer opcional `Matriz-Request: <requestId>`. A run liga `threadId` e `turnId`; cada
tentativa possui id próprio. O work item usa `backlogItemId`, sem substituir a identidade
da execução. Commits e turns são referências externas, não chaves canônicas.

## 6. Ownership, leases, conflitos e recuperação

O claim declara owner, arquivos, superfícies, checks, baseline e lease versionado.
Conflito inclui mesmo arquivo, relação ancestral/descendente e superfície igual.
Claims ativos são comparados sob lock coordenador global. Renovação exige revisão e
geração correntes e só gera activity em checkpoint material. Lease expirado libera
recuperação após conferir run; handoff incrementa geração sem reescrever evidência.

## 7. Estratégia de reconciliação

O reconciliador compara request, run, thread e Git e emite findings tipados: run/thread
ausente, thread terminal com request ativo, arquivos declarados não observados,
observados não declarados, revisão stale, lease/check expirado e commit sem vínculo.
O provider Git usa argumentos fixos sem shell, limita tempo/buffer e guarda somente
commit, paths e trailers. Baseline sujo é excluído. Thread indisponível é `unavailable`,
nunca inferida como `missing`.

## 8. Contrato MCP e permissões

Leituras: `workbench_get_engineering_operations_context`,
`workbench_check_ownership_conflicts`, `workbench_reconcile_agent_request`.
Escritas: `workbench_claim_agent_request`, `workbench_checkpoint_execution_attempt`,
`workbench_interrupt_execution_attempt`, `workbench_complete_agent_request` e
`workbench_record_reconciliation_snapshot`. O Workbench observa o baseline Git e
recalcula o snapshot; o agente não fornece findings por autoridade própria. Não há
shell ou filesystem genérico.

## 9. Política de activity e evidências

Activity registra claim, checkpoint material, escopo, conflito, bloqueio, interrupção,
resultado e reconciliação persistida. Polls e heartbeats sem mudança não geram evento.
Evidência contém comando exato, estado derivado do exit code, timestamp, SHA-256 da
saída, trecho limitado/redigido, origem e commits. Saída completa e diff não entram no log.

## 10. Mudanças em AGENTS.md e handbook

O `AGENTS.md` do app exige claim antes de mutação, separação de estados, checkpoints,
reconciliação e tratamento de `plan_only`. O handbook cobre lease/handoff, evidência
versus aprovação, dirty tree e interrupção. O contrato raiz continua exigindo workflows
nomeados e proibindo escrita direta em `.matriz`.

## 11. Automações, lints e checks propostos

Implementado: Zod, máquina de estados, conflito sob lock, revisão otimista, path safety,
expiração de check, fail-closed no App Server e verificação MCP. Próximos incrementos:
check CI para annotations/testes de tools mutantes; diagnóstico de leases expirados sem
autoencerrar; lint de link para este contrato em runtimes novos; relatório local de
snapshots divergentes, sem cron distribuído.

## 12. Matriz exata de arquivos

| Responsabilidade | Arquivos |
|---|---|
| Claim/lease | `src/domain/engineering-operation.ts`, `src/application/engineering-operation-service.ts` |
| Tentativas/checks | `src/domain/execution-evidence.ts`, `src/domain/codex-run.ts`, `src/application/codex-run-manager.ts` |
| Reconciliação | `src/domain/reconciliation.ts`, `src/application/reconciliation-service.ts`, `src/integration/git/git-observation-provider.ts` |
| Persistência | `src/domain/schemas.ts`, `src/integration/filesystem/workspace-repository.ts`, `src/integration/codex/codex-run-store.ts` |
| MCP | `src/mcp/server.ts`, `src/cli/verify-mcp.ts` |
| UI | `app/(workspace)/projects/[projectId]/agents/[requestId]/page.tsx`, `src/ui/components/engineering-operations-panel.tsx`, `src/ui/presenters/engineering-operation-presenter.ts` |
| Contrato | `AGENTS.md`, `docs/MCP.md`, `docs/CODEX-APP-SERVER.md`, `docs/FILE-PROTOCOL.md`, `docs/agent-handbook/03-OPERATING-PROTOCOL.md`, `05-COWORKING-AND-MULTIAGENTS.md`, `06-CONTRACTS-FREEDOM-SECURITY.md`, `07-EXAMPLES.md` |

Testes espelham domínio, serviços, provider e repository. Não há package compartilhado.

## 13. Plano por cortes verticais pequenos

1. Compatibilidade V1 + claim/lease/conflito + `plan_only`.
2. Tentativas, checks estruturados e interrupção retomável.
3. Reconciliação Git read-only e snapshots revisionados.
4. MCP nomeado e proteção do App Server.
5. Presenter/painel e contrato documental.
6. Migração oportunista e diagnóstico agregado após revisão dos cortes anteriores.

O primeiro corte é útil isoladamente e lê dados existentes sem migração em massa.

## 14. Testes

Domínio cobre paths, conflito, lease, estados, plan-only, evidência e findings.
Persistência cobre legado, lock, revisão stale, escrita atômica e snapshots. Concorrência
cobre sobreposição e geração do lease. MCP cobre catálogo, permissões, schemas e erros.
Integração usa Git temporário real. App Server cobre limite, conclusão sem mover produto
e bloqueio mutante sem claim. Gates: suíte, lint, typecheck, `verify:mcp` e build.

## 15. Migração dos registros existentes

Campos novos são opcionais e arrays de run têm default vazio. Não há rewrite-on-read.
Requests legados permanecem visíveis, mas não recebem aprovação mutante até novo claim.
Runs preservam projeções de strings; novas tentativas/checks entram na próxima execução.
Snapshots surgem sob demanda. Migração em lote futura exige dry-run, backup e revisão.

## 16. Observabilidade e diagnóstico

O contexto reúne request, run, claims ativos e último snapshot. Findings têm código,
severidade e mensagem estáveis. Activity informa ator e workflow. O verificador MCP
relata tools, projetos e disponibilidade de fontes sem parsear erro como documento.
Métricas futuras: claims expirados, conflitos, interrupções, checks expirados e snapshots
divergentes, nunca conteúdo de prompts, outputs integrais ou secrets.

## 17. Riscos

- **Deadlock:** um lock coordenador curto; nenhuma chamada externa dentro dele.
- **Ruído:** só checkpoints materiais e reconciliação solicitada são persistidos.
- **Falsa conclusão:** change exige check; plan-only exige ausência; review fica pendente.
- **Staleness:** revisão, geração, commit e expiração tornam dados stale explícitos.
- **Falso conflito:** claims devem ser bounded; escopo amplo fica visível para revisão.

## 18. Dependências das frentes 1+2 e 3

Das frentes 1+2, consome projeto, inventário/contexto e work item sem duplicar domínio;
mudança futura de ids exige adaptador aditivo. Da frente 3, consome delivery, evidência
e revisão como estados separados. Reconciliação não promove delivery, score ou gate.
Integração federada indisponível é diagnóstico, não falha da integridade local.

## 19. Critérios de aceite observáveis

1. Claims ativos sobrepostos são rejeitados.
2. Baseline Git preserva dirty paths preexistentes.
3. Plan-only completa sem arquivos/checks executados.
4. Interrupção fecha tentativa e permite novo claim/turn.
5. Mutação sem claim `change` é recusada e registrada na run.
6. Check guarda exit code/hash/origem e expira em outro commit.
7. Reconciliação detecta divergência sem alterar Git/produto.
8. V1 legado continua legível.
9. UI separa planejado, executado, revisão e findings.
10. Suíte, lint, typecheck, MCP e build passam.

## 20. Ordem futura de commits e gates humanos

Ordem recomendada: (1) domínio/schemas; (2) persistência/tentativas/checks; (3) Git e
reconciliador; (4) MCP/App Server; (5) UI/docs; (6) migração em PR separado. Após cada
corte, humano revisa invariantes e compatibilidade. Depois do corte 4, testa claim
`change`, `plan_only`, interrupção e conflito reais. Somente humano aceita produto,
score, gate ou release. Este documento solicita revisão humana e não se autoaprova.
