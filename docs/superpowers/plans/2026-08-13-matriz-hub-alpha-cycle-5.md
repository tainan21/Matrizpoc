# Matriz-Hub Alpha — Ciclo 5: evolução e trabalho automatizado

## Fontes reais

- `.matriz/roadmap.json` para fases e objetivos declarados.
- `.matriz/backlog/*.json` para trabalho planejado ou em revisão.
- `.matriz/activity/*.jsonl` para atores, entregas e validações registradas.

## Rotas

- `/roadmap`: leitura consolidada do roadmap e backlog, sem transformar ideia em compromisso.
- `/agents`: presença histórica dos atores de trabalho; nenhuma execução “ao vivo” será simulada.
- `/releases`: registros de implementação e validação derivados da atividade local.

## Restrições

- Somente leitura de arquivos locais do Matriz-Hub.
- Fallback explícito para arquivo ausente ou inválido.
- Praticies permanece uma área imersiva existente e não será reescrita neste ciclo.
- Nenhum dado será adicionado ao roadmap apenas para preencher a interface.
