# Matriz-Hub — Manual vivo de interface

Este documento é a regra visual canônica da alpha do Matriz-Hub. Ele cresce por decisões comprovadas na interface, não por tendências ou decoração.

## Tese

- Ambiente operacional noturno, espacial e profissional.
- Informação densa, curta e orientada a ação.
- Profundidade vem de superfície, luz, posição e escala; borda é exceção.
- A interface ensina termos técnicos sem depender de parágrafos.

## Ordem de leitura

1. Ícone ou forma identifica o tipo.
2. Cor e movimento indicam o estado.
3. Título nomeia o objeto ou a ação.
4. Texto menor mostra termo técnico, quantidade, origem ou tempo.
5. O ícone `i` guarda contexto explicativo adicional.

## Texto

- Títulos: uma linha, substantivo ou verbo direto.
- Ações: verbo humano; termo técnico em texto menor.
- Estados: até três palavras.
- Metadados: valores, origem, versão, quantidade ou tempo.
- Descrição visível: somente quando necessária para erro, vazio, confirmação ou procedimento.
- Contexto explicativo: `InfoHint` acessível por hover, foco e toque.

```text
Usar
[ícone] Atualizar informações
Sync · há 2 min · concluído

Evitar
Este painel permite executar o processo de sincronização
das informações do sistema e verificar quando foi concluído.
```

## Superfícies, divisores e bordas

- Separar regiões primeiro por luminância, espaçamento e profundidade.
- Usar divisor fino em listas, tabelas, timelines e zonas persistentes.
- Usar borda forte somente em foco, seleção, input, erro ou objeto interativo.
- Não envolver conteúdo passivo em card.
- Não empilhar card dentro de card.
- Raios são pequenos; sombras são reservadas a elevação temporária.

Antes de criar um card, responder `sim` a pelo menos uma pergunta:

- É selecionável?
- É expansível?
- Executa uma ação?
- Representa uma entidade autônoma?
- Precisa se mover como uma unidade?

Se todas forem `não`, usar layout, lista, faixa ou divisor.

## Ícones

- Todo ícone representa um conceito estável, nunca ornamentação.
- Ícone sozinho exige nome acessível ou tooltip.
- A mesma ação usa o mesmo símbolo em todas as rotas.
- Símbolos de entidade podem receber cor própria; ações globais usam o accent do Hub.
- Tamanho padrão: 16 px em controles, 18–20 px em entidades, 24–32 px em focos espaciais.

## Estados e cor

Cor nunca é o único sinal. Combinar forma/ícone, cor e rótulo curto.

| Estado | Cor | Forma e comportamento |
|---|---|---|
| atividade/foco | azul | ponto ou traço luminoso |
| saudável/concluído | verde | círculo/check |
| atenção/aprovação | âmbar | triângulo/losango |
| falha/bloqueio | vermelho | quadrado/x |
| revisão | violeta | losango |
| inativo/indisponível | cinza | forma vazada |

## Profundidade e movimento

- Superfície principal: trabalho ativo.
- Superfície contextual: inspetor e detalhes selecionados.
- Superfície temporal: alertas, menus, tooltips e expansão.
- Superfície histórica: timeline, atividade e registros.
- Hover aproxima ou ilumina; clique seleciona; expandir cria foco; `Esc` retorna.
- Movimento comunica seleção, atividade, atualização ou transição.
- `prefers-reduced-motion` remove pulsos e transições contínuas.

## 3D e mapas

- Three.js é restrito a superfícies onde posição e relação melhoram compreensão.
- Nós e arestas sempre vêm de dados reais.
- Sem modelos, texturas ou partículas sem função operacional.
- Toda cena possui alternativa SVG/DOM equivalente.
- `Auto` escolhe 3D em desktop compatível e 2D em dispositivos menores.
- O usuário pode escolher `3D` ou `2D` a qualquer momento.
- Controles mínimos: enquadrar, zoom, nível de detalhe e expandir.

## Responsividade

- Desktop amplo: canvas, inspetor, navegação e dock simultâneos.
- Notebook: canvas dominante; painéis inferiores compactáveis.
- Tablet: mapa 2D por padrão; inspetor como sheet.
- Mobile: fluxo vertical, ações próximas à entidade e navegação sobreposta.
- Nunca resolver falta de espaço apenas reduzindo fonte.

## Checklist de revisão

- A função principal é reconhecível sem ler parágrafos?
- Há um único foco visual dominante?
- Cada borda ainda possui função?
- Cada card passa no teste de admissão?
- Ícones, cores e estados são consistentes?
- O texto visível é item, estado, valor ou procedimento?
- Informações adicionais estão acessíveis no `i`?
- A tela funciona com teclado, toque e reduced-motion?
- Dados ausentes continuam explicitamente ausentes?

