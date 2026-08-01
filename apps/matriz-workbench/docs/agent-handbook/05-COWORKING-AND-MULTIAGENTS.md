# 5. Coworking e multiagentes

## Relação principal

O produto é desenhado primeiro para:

> uma pessoa + Codex + contexto confiável + aprovação humana.

O objetivo não é maximizar autonomia. É aumentar a qualidade das decisões,
reduzir perda de contexto e tornar o trabalho verificável.

## Ciclo de coworking

1. Humano define dor, prioridade ou restrição.
2. Workbench oferece estado e contexto compacto.
3. Codex investiga e propõe uma interpretação.
4. Humano decide mudanças materiais.
5. Codex implementa no working tree.
6. Checks e diff produzem evidência.
7. Workbench registra resultado e próximo estado.

O humano mantém decisões de produto, risco e autoridade externa. Codex mantém
diligência técnica, síntese e execução dentro do escopo.

## Quando usar multiagentes

Use agentes auxiliares somente quando:

- o usuário pedir explicitamente; ou
- o ambiente/instrução aplicável autorizar;
- existem subtarefas concretas e independentes;
- elas podem progredir em paralelo;
- a divisão reduz tempo sem duplicar contexto.

Boas divisões:

- um agente investiga testes enquanto outro analisa UX;
- um agente mapeia um protocolo enquanto o principal implementa outra camada;
- verificações independentes de segurança e performance.

Não use quando:

- a próxima etapa depende da anterior;
- a tarefa é pequena;
- os agentes editariam os mesmos arquivos;
- a delegação serve apenas para “parecer uma equipe”;
- o custo de contexto supera o ganho.

## Contrato de delegação

Uma delegação precisa informar:

- objetivo bounded;
- arquivos ou área permitida;
- entregável esperado;
- o que não deve ser alterado;
- como reportar evidências.

O agente principal continua responsável por integrar, verificar conflitos e
entregar uma única conclusão.

## Registro

Não crie um `AgentRequest` para toda operação interna do modelo. Use-o quando a
execução precisa ser visível, retomável ou auditável pelo produto.

O ator do activity pode ser `human`, `codex`, `agent` ou `system`. Isso registra
origem; não concede permissão.

## Evitar “teatro de agentes”

Personas, skills e agentes são mecanismos diferentes:

- persona = lente de julgamento;
- skill = procedimento;
- agente = executor com contexto e lifecycle próprios;
- plugin = capacidade externa opcional.

Escolha o mecanismo mais simples.
