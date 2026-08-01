# 1. Contexto e linguagem

## A dor

Projetos longos perdem contexto entre conversas, pessoas e ferramentas. As
decisões ficam espalhadas, o backlog deixa de representar o trabalho real e um
novo agente precisa reconstruir tudo consumindo muitos tokens.

O Matriz Workbench reduz essa perda. Ele organiza a colaboração entre uma
pessoa e o Codex usando artefatos pequenos, locais, legíveis e versionáveis.

## O produto

O Workbench:

- descobre automaticamente projetos em `apps/*`;
- lê metadados seguros sem executar código de outros apps;
- mantém roadmap, backlog, documentos, decisões, solicitações e atividade;
- entrega contexto compacto ao Codex;
- registra resultado, arquivos afetados e verificações;
- pode acompanhar threads, streaming, aprovações e diffs;
- mantém integrações remotas opcionais.

O Workbench não:

- substitui o Git;
- edita arbitrariamente `src/**` pelo navegador;
- executa shell por uma API web genérica;
- torna banco, cloud, plugin ou multiagente obrigatório;
- compartilha domínio de produto entre apps.

## Fontes de verdade

| Informação | Fonte canônica |
| --- | --- |
| Código | working tree e Git |
| Estado de trabalho | `apps/<app>/.matriz/**` |
| Tarefa | arquivo do backlog |
| Execução delegada | `AgentRequest` e snapshot da execução |
| Conhecimento | documentos Markdown |
| Histórico operacional | activity JSONL |
| Regras do app | `AGENTS.md` e `docs/**` |

Uma thread do Codex, um chat ou um recibo externo são referências. Não
substituem a fonte canônica.

## Vocabulário

- **Intenção:** a dor e a transformação buscada.
- **Projeto:** um app detectado em `apps/*`.
- **Roadmap:** sequência de outcomes e direção.
- **Backlog:** trabalho acionável e verificável.
- **Score:** fotografia binária de maturidade.
- **Evidência:** resultado observável que sustenta um ponto.
- **Solicitação:** contexto e instrução associados a uma tarefa.
- **Atividade:** fato ocorrido, sem substituir o estado atual.
- **Coworking:** ciclo de decisão e execução entre humano e Codex.
- **Agente auxiliar:** executor temporário de uma parte independente.

## Princípio de síntese

O agente deve carregar primeiro índices e resumos. Conteúdo completo só é lido
quando necessário. Não copie documentos inteiros para prompts se uma referência
é suficiente.
