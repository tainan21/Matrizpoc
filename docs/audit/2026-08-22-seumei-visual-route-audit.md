# Auditoria visual e de rotas - Seumei

Data: 2026-08-22  
Escopo: primeira assimilação, memberships/permissões, catálogo e laboratório temporário de route flows.

## Veredito

A primeira fundação vertical está implementada e persistente, mas a Seumei completa não está. Existem 10 padrões de rota de página implementados; Estoque, Loja, Pedidos, Clientes, Financeiro, identidade visual completa e integrações permanecem ciclos futuros. Não foi gerado instalador: a decisão arquitetural vigente mantém a nova Seumei web-first e proíbe criar uma casca instalável nesta primeira assimilação.

## Rotas implementadas e evidência

| Rota | Estado | Evidência visual |
| --- | --- | --- |
| `/login` | Implementada | Login desktop |
| `/` | Implementada | Estado vazio, retomada e seleção de empresa; desktop/mobile |
| `/onboarding` | Implementada | Identidade, operação, preferências e revisão |
| `/workspace` | Implementada | Workspace desktop/mobile |
| `/workspace/members` | Implementada | Diretório, papéis e convite; desktop/mobile |
| `/workspace/products` | Implementada | Estado vazio e catálogo preenchido; desktop/mobile |
| `/workspace/products/new` | Implementada | Produto e variantes; desktop/mobile |
| `/workspace/products/[productId]` | Implementada | Edição persistida |
| `/docs` | Implementada, temporária | Route flows desktop/mobile |
| `/invite/[token]` | Implementada | Token indisponível desktop/mobile |

As APIs de empresa, seleção ativa, onboarding, memberships/convites e catálogo também existem, mas são contratos de servidor e não telas fotografáveis.

## Álbum capturado

Foram aceitas 23 capturas de viewport real: 16 desktop e 7 mobile. Elas cobrem login; empresa vazia/retomada/mobile; quatro etapas do onboarding; workspace; membros; catálogo vazio/preenchido; criação, variantes e edição de produto; route flows; e convite inválido. As imagens originais estão incorporadas sem recriação nos documentos DOCX e PDF desta auditoria.

## Pontos fortes

- Linguagem visual coerente com Matriz, com hierarquia e paleta consistentes.
- Onboarding comunica progresso e retomada; estados vazios são honestos.
- Workspace e catálogo apresentam dados persistidos em vez de mocks do produto.
- Componentes observados usam labels e estruturas semânticas em boa parte do fluxo.
- As telas mobile capturadas não criaram overflow horizontal do documento.
- O laboratório `/docs` organiza route flows sem assumir autoridade nem persistência empresarial.

## Achados prioritários

### Alta

1. Após uma indisponibilidade do Hub durante o salvamento, o onboarding permaneceu em “Salvando...” sem mensagem visível nem ação de recuperação. O fluxo precisa liberar a ação, anunciar o erro e permitir nova tentativa segura.
2. O estado vazio de Produtos no desktop apresentou sobreposição entre título, explicação e CTA. Isso prejudica leitura e alvo de interação.

### Média

3. A navegação mobile do workspace depende de rolagem horizontal e deixa itens fora da área visível, com baixa descoberta.
4. A recomendação de aparência reapareceu após ser dispensada e voltou a obstruir conteúdo mobile.
5. Botões flutuantes do ecossistema podem sobrepor campos e seções no mobile.
6. O status `ACTIVE` aparece em inglês numa interface em português.
7. O campo “Endereço” no editor de produto representa um slug e é ambíguo.
8. O cabeçalho/shell mobile ocupa altura relevante antes do conteúdo principal.

## Acessibilidade e limites da auditoria

Foco visível, labels, responsividade e overflow foram inspecionados nas superfícies capturadas. A navegação horizontal, a sobreposição do CTA e a ausência de recuperação anunciada são riscos de acessibilidade. Textos verdes sobre fundo escuro ainda precisam de medição objetiva de contraste e uma sequência integral com teclado/leitor de tela; esta auditoria não declara conformidade WCAG.

As capturas são de viewport, porque o navegador integrado não ofereceu captura full-page. Durante a auditoria em worktree, o servidor Seumei exigiu modo webpack para descobrir corretamente as rotas, enquanto o Hub funcionou em Turbopack; isso é um ponto de ergonomia do ambiente, não evidência de falha de produção.

## Capacidades ainda ausentes

- Estoque e movimentos: desenho aprovado, implementação planejada.
- Loja e publicação: não implementada.
- Pedidos: não implementados.
- Clientes: não implementados.
- Financeiro essencial: não implementado.
- Identidade visual/publicação completa: não implementada.
- Integrações futuras: deliberadamente não iniciadas sem fluxo consumidor e justificativa.
- Convites: o contrato seguro por link existe; entrega real por e-mail ainda depende de integração transacional.

## Próximo passo

Executar `docs/superpowers/plans/2026-08-22-seumei-stock-movements.md`. O roadmap das sete fatias está em `docs/seumei-next-cycles-roadmap.md`. Os dois defeitos de alta prioridade desta auditoria devem ser corrigidos antes ou no início desse ciclo, com testes de regressão focados.

