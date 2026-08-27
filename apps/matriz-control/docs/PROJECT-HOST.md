# Project Host

O Project Host registra projetos Node/web externos sem transformá-los em apps do monorepo. No desktop, **Apps → Project Host → Adicionar** abre o seletor nativo. O cadastro guarda uma referência opaca, inspeciona somente arquivos de detecção permitidos e exige revisão humana antes de preparar ou iniciar.

## Fluxo entregue

1. selecionar uma pasta nativa permitida;
2. inspecionar com limites de profundidade, entradas, bytes e tempo;
3. revisar a receita detectada e aprovar sua revisão exata;
4. opcionalmente confirmar uma preparação com token único de dois minutos;
5. iniciar uma ação aprovada pelo supervisor existente;
6. aguardar prontidão HTTP em `127.0.0.1` e abrir a superfície aprovada;
7. parar, reiniciar, reconciliar ou remover apenas o registro do catálogo.

Suporta `npm`, `pnpm` e `bun`, scripts `dev`, `start` e `serve`, portas declaradas ou detectadas e superfícies web, navegador externo, terminal e serviço sem UI. Lockfiles conflitantes bloqueiam a receita. Mudança de manifesto invalida aprovação e preparo anteriores.

## Autoridade

| Superfície | Pode fazer |
| --- | --- |
| Renderer | enviar IDs, revisão e token de confirmação; renderizar ViewModels sem caminho |
| Electron main | resolver raiz, receita, executável, argumentos, ambiente, porta e URL |
| TerminalSupervisor | possuir handles, PID, logs limitados, parada e reinício |
| MCP/agente | listar ViewModels; mutações do Project Host são exclusivas da interface humana |

O catálogo fica no diretório de dados do usuário, com escrita atômica. Não armazena segredos nem logs ilimitados. Remover do catálogo nunca exclui a pasta do projeto.
