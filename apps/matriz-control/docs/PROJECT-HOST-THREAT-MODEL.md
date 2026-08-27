# Project Host — modelo de ameaças

## Ativos e fronteiras

Os ativos protegidos são filesystem do usuário, segredos de ambiente, processos alheios, autoridade de execução e navegação desktop. O renderer é não confiável; caminhos, comandos, argumentos, valores de ambiente, portas e URLs são resolvidos no processo nativo a partir da receita aprovada.

## Controles

- raiz canônica bloqueia volumes, home completo, Windows, Program Files e diretórios de credenciais;
- leitura somente de evidências allowlisted, com `realpath`, contenção e limites 4/2.000/8 MiB/1 MiB/5 s;
- detecção não instala nem executa;
- hash determinístico prende aprovação, preparo e início à revisão atual;
- confirmação de preparo é única, vinculada ao projeto e expira em dois minutos;
- spawn usa ação nativa aprovada, sem concatenação de shell;
- somente processos com handle do supervisor podem ser encerrados; listener estrangeiro bloqueia início e nunca é morto por porta;
- prontidão e navegação aceitam a origem exata `http://127.0.0.1:<porta>`;
- superfície embarcada usa partição isolada, sandbox, sem Node/preload; bloqueia popup, download, permissão e navegação fora da origem;
- logs e resultados são limitados e redigidos.

## Risco residual

Preparar dependências pode executar scripts de lifecycle do gerenciador dentro do projeto, por isso exige aviso e confirmação humana. Um projeto aprovado continua sendo código local confiado pelo usuário; isolamento de sistema operacional não faz parte do Ciclo 1. Headers que impedem embedding provocam fallback para o navegador externo, não relaxamento da política.
