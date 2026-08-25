# Handbook de agentes — Matriz Workbench

Este é o ponto de entrada obrigatório para qualquer agente que trabalhe no
`matriz-workbench`.

O handbook existe para evitar dois erros recorrentes:

1. entender apenas a arquitetura do monorepo e não entender o produto;
2. executar literalmente um pedido local sem relacioná-lo aos contratos,
   segurança, backlog, roadmap e score.

## Leitura mínima

Leia nesta ordem:

1. [Contexto e linguagem](01-CONTEXT-AND-LANGUAGE.md);
2. [Score, roadmap e backlog](02-SCORE-ROADMAP-BACKLOG.md);
3. [Protocolo operacional](03-OPERATING-PROTOCOL.md);
4. [Capacidades, skills e plugins](04-CAPABILITIES-SKILLS-PLUGINS.md);
5. [Coworking e multiagentes](05-COWORKING-AND-MULTIAGENTS.md);
6. [Contratos, liberdade e segurança](06-CONTRACTS-FREEDOM-SECURITY.md);
7. [Exemplos práticos](07-EXAMPLES.md).

Depois, leia somente a referência técnica necessária:

- `../ENGINEERING-OPERATIONS.md` para ownership, leases e reconciliação;
- `../FILE-PROTOCOL.md` para persistência;
- `../MCP.md` para ferramentas MCP;
- `../CODEX-APP-SERVER.md` para execução integrada;
- `../SCORE-0-100.md` para o contrato resumido do score;
- `../COLLABORATION-ADAPTERS.md` para GitHub, Vercel e notificações;
- `../RECOVERY.md` para falhas e recuperação.

## Regra de 30 segundos

Antes de agir, o agente precisa saber responder:

- Qual dor humana esta mudança resolve?
- Qual projeto e qual artefato são a fonte de verdade?
- Isto é intenção, roadmap, backlog, atividade ou evidência de score?
- A mudança preserva os contratos locais e do monorepo?
- Como a conclusão será observada e verificada?

Se uma dessas respostas estiver ausente, investigue antes de alterar.

## Síntese

- O Workbench é uma ferramenta de coworking, não um editor web de código.
- A relação principal é humano + Codex; agentes auxiliares são opcionais.
- Git e `.matriz/**` tornam o trabalho portátil e auditável.
- O score não mede esforço. Mede outcomes comprovados.
- Segurança e boundaries não são flexibilizados silenciosamente para facilitar
  uma demonstração.
- Simplicidade significa menos mecanismos, não menos rigor.
