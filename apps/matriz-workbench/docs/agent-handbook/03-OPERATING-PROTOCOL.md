# 3. Protocolo operacional

## Antes de alterar

1. Leia `AGENTS.md` e este handbook.
2. Identifique o projeto e o menor escopo.
3. Inspecione o estado do working tree e preserve mudanças existentes.
4. Leia o backlog, roadmap e documentos vinculados.
5. Classifique o pedido:
   - consulta;
   - diagnóstico;
   - mudança;
   - experimento;
   - operação externa;
   - alteração de contrato.
6. Declare a interpretação quando houver ambiguidade relevante.

## Engineering Operations obrigatório

Antes de qualquer mutação, vincule a task Codex a uma solicitação e registre um
claim com modo (`plan_only` ou `change`), owner, arquivos/superfícies pretendidos,
checks planejados e baseline Git. O lease é renovado apenas em marcos materiais;
um lease expirado não comprova abandono por si só, mas libera novo claim após a
reconciliação confirmar que não há execução ativa.

Conflitos de arquivo ou superfície devem ser resolvidos antes da edição. Mudanças
que já estavam no working tree entram no baseline como preexistentes e nunca são
atribuídas automaticamente à execução atual.

## Durante

1. Prefira uma fatia vertical pequena e utilizável.
2. Mantenha domínio específico no app.
3. Use packages apenas com dois consumidores reais e contrato estável.
4. Não importe internals de outro app.
5. Use o mecanismo mais simples que preserve segurança e reversibilidade.
6. Registre decisões que não sejam óbvias.
7. Não altere score antes de existir evidência.

## Depois

1. Execute validações proporcionais ao risco.
2. Registre arquivos afetados e comandos/checks.
3. Atualize a solicitação e mova a tarefa para `review`.
4. Acrescente atividade.
5. Atualize roadmap somente se direção, outcome ou iniciativa mudou.
6. Revalide score; não conceda ponto por esforço.
7. Informe o próximo estado pendente.

Reconcile task, solicitação, run e Git antes de declarar conclusão. Registre
interrupção, timeout ou abandono como estado terminal da tentativa, mantendo a
solicitação retomável. Em `plan_only`, não registre arquivos alterados nem checks
executados; o resultado é o plano factual e continua sujeito a revisão humana.

## Mesma task ou nova task do Codex

Continue na mesma task quando:

- objetivo, app e working tree continuam os mesmos;
- a nova mensagem corrige ou complementa o trabalho atual;
- o contexto acumulado reduz risco e consumo.

Abra nova task quando:

- muda o objetivo principal;
- muda o projeto e o contexto anterior atrapalha;
- é desejável isolar uma investigação;
- o trabalho precisa de ownership e histórico próprios.

Uma nova task não deve ser criada apenas para “organizar” uma subtarefa pequena.

## Critério de conclusão

Uma resposta final saudável contém:

- outcome entregue;
- escopo tocado;
- validações executadas;
- riscos ou limitações restantes;
- reflexo em backlog, roadmap e score;
- próximo passo concreto.

## Falhas e bloqueios

Não improvise uma quebra de contrato para destravar. Primeiro:

1. confirme a falha;
2. procure uma alternativa dentro do contrato;
3. registre o bloqueio;
4. peça nova autoridade somente se a solução exigir mudança material de escopo,
   segurança ou integração externa.
