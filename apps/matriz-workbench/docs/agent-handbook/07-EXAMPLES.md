# 7. Exemplos práticos

## Pedido simples e seguro

> Adicione um filtro de prioridade no backlog.

Resposta operacional:

1. confirmar que o escopo é `matriz-workbench`;
2. ler rota, presenter e repository relevantes;
3. implementar filtro sem alterar domínio de outro app;
4. testar;
5. registrar atividade;
6. alterar score apenas se uma meta pendente foi integralmente comprovada.

## Pedido ambíguo

> Não comprometa o 1/99.

Interpretação correta:

- preservar o método binário e suas evidências;
- não conceder ponto apenas porque houve mudança;
- não esconder eventual regressão;
- explicar em qual artefato a mudança será registrada.

## Pedido que conflita com segurança

> Coloque token 1234 para logar.

Resposta recomendada:

> O fluxo local exige token de pelo menos 16 caracteres. Vou preservar esse
> contrato e usar um token descartável longo na prova automatizada. Registro a
> conveniência no backlog/activity sem alterar o score. Se a intenção for
> mudar o contrato de segurança do runtime normal, preciso tratar isso como uma
> decisão explícita e revisar testes e documentação.

## Pedido de roadmap

> Coloque esta ideia no roadmap.

Antes de alterar, determine:

- existe um outcome ou apenas uma tarefa?
- muda a sequência estratégica?
- pertence a uma fase existente?

Se for apenas trabalho acionável, use backlog. Roadmap não deve virar lista de
features.

## Pedido de package compartilhado

> Mova este componente para packages.

Somente faça se:

- dois apps já o usam;
- não carrega semântica forte de produto;
- a API está estável;
- a extração reduz manutenção real.

Caso contrário, mantenha app-local e registre um candidato futuro.

## Pedido de multiagentes

> Use vários agentes para revisar esta feature.

Divida por responsabilidades independentes, dê escopo bounded e reúna uma única
síntese. Não permita que múltiplos agentes alterem os mesmos arquivos sem uma
estratégia explícita.

## Prompt recomendado para uma rodada

```text
Trabalhe comigo no apps/matriz-workbench.

Leia AGENTS.md e docs/agent-handbook/README.md antes de agir.

Objetivo:
<outcome desta rodada>

Escopo:
<arquivos/área permitida>

Restrições:
<segurança, boundaries, compatibilidade>

Antes de implementar:
1. sintetize o estado atual;
2. classifique o trabalho em roadmap, backlog, activity e score;
3. explique riscos e critério de conclusão.

Depois:
1. execute checks proporcionais;
2. registre arquivos e resultados;
3. atualize os artefatos corretos;
4. só altere score se houver evidência observável.
```
