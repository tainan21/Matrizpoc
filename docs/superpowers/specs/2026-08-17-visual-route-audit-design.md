# Auditoria visual das 101 rotas — Design

## Objetivo

Capturar e avaliar as 101 páginas reais dos sete apps do monorepo, incluindo
todos os logins, em desktop e mobile, com uma amostra de duas telas por app em
viewport de televisão. O resultado será um relatório Markdown navegável com
evidência visual e recomendações de produto e UI/UX.

## Entregáveis

- 202 screenshots obrigatórios: 101 rotas em desktop (1440×1000) e mobile
  (390×844).
- 14 screenshots de TV (1920×1080): duas rotas-chave por app.
- Um relatório simples, organizado por app e rota, contendo intenção, conceito,
  contexto, conteúdo esperado, pontos fortes, pontos fracos e recomendação.
- Um inventário final de 100 componentes candidatos para a biblioteca UI/UX.
- Uma estratégia incremental para migrar superfícies reutilizáveis à
  `@matriz/design-ui`, preservando domínio local e as leis arquiteturais.

## Captura e autenticação

- Os sete apps serão executados localmente nas portas 3000–3006.
- Rotas estáticas serão visitadas diretamente; rotas dinâmicas usarão IDs reais
  descobertos nos dados locais ou serão registradas como estado vazio quando não
  houver entidade navegável.
- Os seis acessos serão capturados: cinco páginas `/login` e o `/unlock` do
  Workbench.
- Para rotas protegidas, a automação tentará o fluxo mock/local documentado. Se
  não houver credencial segura disponível, a captura mostrará o redirecionamento
  ou bloqueio real e o relatório explicará a limitação.

## Organização dos artefatos

- Screenshots: `output/visual-route-audit/<app>/<viewport>/<route-slug>.png`.
- Relatório: `docs/visual-route-audit-2026-08-17.md`.
- O relatório referenciará imagens com caminhos relativos e manterá uma entrada
  numerada para cada uma das 101 páginas.
- Artefatos temporários, cookies, logs e segredos não serão versionados.

## Critérios e limites

- Cada rota/viewpoint terá no máximo duas tentativas.
- Falhas persistentes serão documentadas com URL, status e causa observada; não
  haverá repetição infinita.
- A amostra TV será limitada a 14 capturas.
- A análise avaliará hierarquia, clareza, densidade, navegação, responsividade,
  estados vazios/erro, consistência visual e adequação ao propósito da rota.
- O trabalho termina quando as 101 entradas existirem, os artefatos capturados
  estiverem contabilizados e o relatório passar por uma checagem de links e
  contagem.

## Limites arquiteturais

- A auditoria não altera comportamento dos apps para fabricar screenshots.
- Recomendações de componentização não movem domínio forte para packages.
- Apenas primitivas sem domínio, com pelo menos dois consumidores reais e API
  estável, serão candidatas à MatrizLib UI compartilhada.
