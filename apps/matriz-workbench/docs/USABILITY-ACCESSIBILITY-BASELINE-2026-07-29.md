# Baseline de uso, acessibilidade e performance — 2026-07-29

## Escopo

Esta rodada validou a navegação principal do Matriz Workbench em uma build de
produção local, nos viewports desktop e mobile. O objetivo foi comprovar o uso
real das superfícies já implementadas, sem confundir uma verificação focada com
uma certificação integral de conformidade.

## Fluxo exercitado

1. iniciar o Workbench em `127.0.0.1:3005`;
2. desbloquear a interface com um token local temporário;
3. usar `Tab` para alcançar o link “Pular para o conteúdo”;
4. abrir a navegação rápida com `Ctrl+K`;
5. confirmar foco automático no campo de busca;
6. filtrar por “manual” e abrir o primeiro resultado com `Enter`;
7. fechar a navegação com `Escape`;
8. repetir a inspeção visual em `390 × 844`.

O fluxo abriu corretamente o manual operacional do Workbench. O menu mantém o
foco dentro do diálogo, possui nomes acessíveis, informa os atalhos disponíveis
e usa elementos semânticos sem criar landmarks duplicados.

## Evidências de acessibilidade

- idioma da aplicação definido como pt-BR;
- link de salto visível ao receber foco;
- foco de teclado visível;
- diálogo com `role="dialog"`, `aria-modal`, título e descrição;
- campo identificado como busca;
- contenção de foco com `Tab` e `Shift+Tab`;
- fechamento por `Escape`;
- alternativa para redução de movimento com `prefers-reduced-motion`;
- cor de texto secundário ajustada para contraste de `4,62:1` sobre branco;
- cor de ação com contraste aproximado de `5,37:1`;
- cor de sucesso com contraste aproximado de `4,53:1`.

Essas evidências estabelecem uma baseline AA para as superfícies verificadas.
Ainda não constituem certificação WCAG completa: faltam uma sessão dedicada com
leitor de tela, auditoria automatizada abrangente e inspeção de todas as rotas.

## Baseline de performance

Medição dos artefatos estáticos emitidos pela build:

| Indicador | Resultado |
| --- | ---: |
| Descoberta de projetos | 94,38 ms |
| Projetos detectados | 6 |
| JavaScript emitido | 734.858 bytes |
| CSS emitido | 51.556 bytes |
| Total de assets JS/CSS | 786.414 bytes |
| Quantidade de assets | 21 |
| Maior asset | 227.517 bytes |

Os valores representam tamanho bruto em disco, não transferência comprimida.
Eles servem como baseline reproduzível; o maior chunk deve ser acompanhado nas
próximas evoluções.

## Evidências visuais

- `output/playwright/workbench-next-stage/.playwright-cli/page-2026-07-29T15-57-47-076Z.png`
  — navegação rápida no desktop;
- `output/playwright/workbench-next-stage/.playwright-cli/page-2026-07-29T15-58-13-700Z.png`
  — métricas operacionais no desktop;
- `output/playwright/workbench-next-stage/.playwright-cli/page-2026-07-29T15-58-46-932Z.png`
  — navegação rápida no mobile.

## Próxima validação

Automatizar o caminho tarefa → solicitação Codex → progresso → conclusão,
adicionar auditoria com leitor de tela e definir orçamento regressivo para os
assets do cliente.
