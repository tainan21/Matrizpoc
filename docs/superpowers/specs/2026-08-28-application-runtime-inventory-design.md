# Application Runtime Inventory Design

## Objetivo

Criar uma fonte viva e verificável para classificar o runtime de cada aplicação
do monorepo sem misturar política arquitetural, estado atual e snapshots de
release. O inventário deve permitir que humanos e agentes saibam quais apps são
web/serviço, quais possuem desktop Tauri ou Electron e quais decisões ainda
dependem de investigação.

## Contexto

`docs/desktop-application-architecture.md` é a fonte canônica da política
Tauri-first. `docs/releases/v1/installer-inventory.md` é um snapshot histórico
de empacotamento e não deve assumir o papel de inventário vivo. O workspace
possui 16 apps com quatro situações observáveis:

- apps sem edição desktop;
- apps Tauri;
- apps Electron;
- um app com edições Tauri e Electron.

Documentos antigos ainda descrevem sete apps ou usam nomes anteriores. Essas
divergências serão registradas como drift, mas não serão corrigidas em massa
neste incremento.

## Decisão

Criar `docs/application-runtime-inventory.md` como inventário canônico do estado
e da classificação de runtime. O documento de política continuará contendo
regras estáveis. O inventário histórico de instaladores continuará identificado
por sua data e baseline.

Adicionar referências ao inventário vivo em:

- `docs/desktop-application-architecture.md`;
- `docs/monorepo-structure.md`.

Não alterar manifest, package, tooling, CI, runtime ou código de aplicação
neste incremento.

## Modelo do inventário

O inventário terá uma linha para cada diretório de app que possua
`apps/<app>/package.json`. Cada linha conterá:

| Campo | Significado |
| --- | --- |
| App | Diretório e identidade do workspace. |
| Papel | Responsabilidade resumida do app. |
| Superfície atual | Web, serviço, desktop ou combinação comprovada. |
| Stack comprovada | Runtime encontrado no package e nos arquivos de configuração. |
| Classificação | Estado conforme a política desktop canônica. |
| Alvo atual | Hipótese de arquitetura, sem prometer migração não aprovada. |
| Risco | Baixo, médio ou alto, acompanhado da causa concreta. |
| Prioridade | Ordem relativa para investigação ou migração. |
| Evidência | Paths versionados que sustentam a linha. |
| Próximo checkpoint | Menor decisão ou prova necessária para avançar. |

Fato observado, inferência e decisão aprovada serão diferenciados
explicitamente. Ausência de uma edição desktop será registrada como estado
válido, não como lacuna a preencher.

## Classificações iniciais

As classificações abaixo são hipóteses conservadoras para orientar a redação do
inventário. A implementação deve revalidá-las contra os arquivos atuais antes
de registrar cada linha.

### Tauri confirmado

- `matriz-desktop`;
- `matriz-admin`;
- `matriz-ops`.

Esses apps possuem configuração Tauri versionada e não apresentam uma edição
Electron concorrente no próprio app.

### Tauri principal com compatibilidade Electron

- `matriz-uninstall`.

O app possui as duas edições. A decisão vigente define Tauri como principal e
Electron como compatibilidade e benchmark; isso não autoriza duplicação
indefinida.

### Electron provisório

- `matriz-control`;
- `matriz-workbench`;
- `seumeiapp`.

Esses apps possuem Electron real, mas ainda não têm exceção definitiva
registrada segundo a política atual. O inventário deve preservar a implementação
e pedir evidência antes de recomendar migração ou exceção.

`matriz-control` e `matriz-desktop` também possuem sobreposição de nome e
responsabilidade operacional. O inventário registrará essa condição sem
decretar consolidação, substituição ou remoção.

### Web ou serviço sem desktop necessário

- `contracts`;
- `health`;
- `matriz-hub`;
- `matriz-identity`;
- `matriz-pay`;
- `matrizlib`;
- `sites`;
- `spot`;
- `willdash`.

Essa classificação poderá mudar somente diante de um requisito de produto; a
política Tauri-first não cria, por si só, uma obrigação de desktop.

## Fontes de evidência

A implementação consultará somente fontes versionadas e atuais:

1. `apps/*/package.json` para dependências e scripts;
2. `src-tauri/**` e `tauri.conf.json` para Tauri;
3. arquivos de entrada Electron e configurações `electron-builder` para
   Electron;
4. `README.md`, manifest e bootstrap do app quando necessários para confirmar
   seu papel;
5. documentos canônicos e decisões vigentes;
6. histórico Git apenas como contexto, nunca como autoridade automática.

Outputs de build, `.next`, `node_modules` e artefatos ignorados não serão usados
como prova arquitetural.

## Drift documental relacionado

O inventário incluirá uma seção curta de drift com links para documentos que
precisam de revisão posterior, incluindo:

- contagens antigas de apps;
- referências ao antigo diretório ou nome `seumei` quando o app atual é
  `seumeiapp` com identidade pública `seumei`;
- descrições históricas de stacks desktop que divergem dos arquivos atuais;
- a coexistência pouco clara entre os dois produtos chamados Matriz Control.

O drift será tratado em mudanças independentes. Este incremento não editará
`docs/architectural-laws.md` nem reescreverá documentos históricos.

## Fluxo Git

A especificação e a implementação vivem em
`codex/application-runtime-inventory`. A branch integra `origin/main` por merge
não destrutivo, preservando o commit local da política Tauri-first. A integração
na `main` local ocorrerá somente após revisão e verificações verdes. Nenhuma
publicação remota faz parte deste incremento.

## Verificação

Como a implementação tocará apenas documentação de governança:

1. confirmar que todos os 16 diretórios com `apps/<app>/package.json` aparecem
   exatamente uma vez;
2. confirmar que cada runtime declarado possui ao menos um path de evidência;
3. validar os links entre documentos;
4. procurar contradições diretas com a política Tauri-first;
5. executar `git diff --check`;
6. executar `pnpm test:smoke` e `pnpm verify:boundaries` na árvore integrada,
   porque a branch também incorporou mudanças recentes de `origin/main`.

## Fora de escopo

- migrar qualquer aplicação;
- remover Electron ou Tauri existente;
- declarar nova exceção Electron;
- consolidar `matriz-control` e `matriz-desktop`;
- alterar manifests, packages, scripts, CI ou instaladores;
- corrigir toda a documentação histórica no mesmo commit;
- criar package compartilhado para desktop.

## Critérios de aceitação

- existe uma única matriz viva para os 16 apps;
- política, inventário vivo e snapshot histórico possuem papéis distintos;
- nenhuma classificação provisória é apresentada como decisão definitiva;
- possíveis exceções Electron permanecem poucas, explícitas e sujeitas a
  evidência;
- todo risco ou recomendação possui próximo checkpoint verificável;
- o incremento é apenas documental e reversível.
