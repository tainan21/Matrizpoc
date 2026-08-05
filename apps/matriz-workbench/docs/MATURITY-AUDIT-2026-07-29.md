# Auditoria de maturidade — 2026-07-29

Esta auditoria substitui o score histórico de `3/100` por uma leitura binária
reproduzível do estado atual do Matriz Workbench.

**Resultado verificado desta rodada: `78/100`.**

## Método

- Cada ponto continua valendo somente `0` ou `1`.
- Um ponto recebe `1` quando todos os arquivos de evidência definidos para ele
  existem no repositório.
- A evidência fica gravada na própria meta em `.matriz/roadmap.json`.
- Pontos sem prova direta continuam em `0`, mesmo quando há implementação
  parcial ou intenção documentada.
- O reconciliador pode devolver um ponto a `0` se a evidência for removida.

## Duas leituras da mesma fonte

1. A interface lê o inventário e o roadmap pelo domínio local do Workbench.
2. O MCP expõe a mesma fotografia por
   `workbench_get_project_inventory` e
   `matriz://projects/{id}/inventory`.

Nenhuma das duas vias executa TypeScript dos outros apps. Git é lido somente
pelos arquivos locais `HEAD` e `config`, com remoção de credenciais. Vercel é
detectado somente por `.vercel/project.json`, sem rede e sem expor `orgId`.

## Limites honestos

O score prova presença de entregáveis, não qualidade absoluta. Nesta rodada,
navegação por teclado, baseline AA focada, teste de uso em navegador e medições
de discovery e bundle ganharam evidência própria. Teste E2E automatizado,
certificação integral de acessibilidade, performance com orçamento regressivo,
uso real por uma semana, adapter cloud e conclusão `100/100` permanecem
pendentes.

Os próximos pontos recomendados são: `50` (teste de uso completo), `41`
(navegação por teclado), `49` (acessibilidade AA), `71` (tempo de discovery) e
`74` (bundle do cliente).
