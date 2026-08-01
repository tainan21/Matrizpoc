# 2. Score, roadmap e backlog

Esses artefatos se relacionam, mas não são a mesma coisa.

## Score 0–100

O formato canônico contém exatamente 100 metas. Cada meta vale:

- `0`: outcome ausente, parcial ou sem prova;
- `1`: outcome presente e sustentado por evidência revisável.

O total é a soma dos pontos. Não é uma porcentagem subjetiva, readiness de
deploy, quantidade de commits ou volume de código.

Um projeto pode possuir várias trilhas, cada uma com cem metas independentes.
No Workbench, `app`, `docs` e `features-domains` não são somadas. No Infra Hub,
a trilha `docs` mede apenas a documentação do ecossistema. O score histórico
geral continua preservado, mas não recebe novos pontos de escopos especializados.

Os pontos podem ser concluídos fora de ordem. Um projeto pode estar em `73/100`
com a meta 7 pendente e a meta 99 concluída.

## O que significa “1/99”

“1/99” é uma expressão humana para “um ponto comprovado e noventa e nove ainda
abertos”. O modelo persistido continua sendo:

- uma escala de `0` a `100`;
- cem metas;
- cada meta com score `0` ou `1`.

“1/199” não é outro modelo de pontuação. Se essa escrita aparecer sem uma
decisão explícita alterando o contrato, trate-a como ambiguidade ou erro de
digitação e preserve o score de cem metas.

## Quando um ponto muda

Marque `1` somente se:

1. o outcome da meta foi atingido;
2. existe evidência concreta;
3. a evidência está registrada;
4. as verificações proporcionais ao risco passaram;
5. a conclusão não contradiz outro contrato.

Retorne para `0` se a evidência foi removida ou deixou de representar a
realidade. “Não comprometer o score” nunca significa esconder uma regressão.

## Mudança sem ponto

Grande parte do trabalho não altera o score. Uma correção, experimento ou
facilidade de teste pode:

- gerar atividade;
- virar uma tarefa no backlog;
- atualizar documentação;
- alterar uma iniciativa;
- manter todos os pontos como estavam.

Isso é esperado. O score não é um contador de mudanças.

## Roadmap

O roadmap responde:

- qual transformação vem agora?
- qual outcome encerra a fase?
- quais iniciativas contribuem para ele?

Estados: `planned`, `active`, `paused`, `completed`.

Não marque uma fase como concluída apenas porque arquivos foram criados. O
outcome da fase precisa ser observável.

## Backlog

O backlog responde:

- qual trabalho pode ser executado?
- por que ele importa?
- quais critérios encerram a tarefa?
- do que ele depende?
- quais referências dão contexto?

Estados: `idea`, `ready`, `in_progress`, `blocked`, `review`, `done`,
`archived`.

`done` exige critérios concluídos e evidência de verificação. No quadro V2, uma
execução Codex concluída disponibiliza evidências, mas não altera o estado de
produto nem concede validação.

O quadro operacional usa `discovery`, `refined`, `ready`, `in_progress`,
`validation` e `completed`. Registros V1 continuam legíveis e só migram quando
editados. Bloqueio é uma condição do item, não uma coluna permanente.

Estado de produto, execução, validação, revisão humana e documentação são
independentes. Somente uma pessoa pode aprovar os estados de governança.

## Escolha do artefato

| Situação | Registrar em |
| --- | --- |
| Ideia ainda sem compromisso | backlog como `idea` |
| Trabalho acordado | backlog |
| Mudança de direção ou sequência | roadmap |
| Decisão estrutural | documento de decisão |
| Fato executado | activity |
| Outcome comprovado | evidência da meta e score `1` |
| Experimento sem outcome de maturidade | backlog/activity, sem ponto |
