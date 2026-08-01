# Auditoria de adoção — `@matriz/tokens`

Data da evidência: 2026-07-31.

Escopo read-only: `C:\Apps\MatrizLibUiOficial`. Nenhum arquivo, dependência ou
artefato da biblioteca foi alterado durante esta auditoria.

## Decisão

`@matriz/tokens` permanece `candidate`. O contrato técnico, o build e o consumo
por tarball foram comprovados. A promoção depende agora de uma distribuição
autenticada sob o namespace proprietário `@matriz` e de uma versão publicada.

O escopo permitido continua deliberadamente pequeno:

- `@matriz/tokens` para tipos, registros e geradores;
- `@matriz/tokens/css` para o CSS completo;
- subpaths `themes/*` permanecem fora da allowlist inicial.

## Evidências favoráveis

- package ESM, sem dependências ou peer dependencies de runtime;
- exports públicos explícitos para `.`, `./css` e `./themes/*`;
- dry-run do pacote `0.1.0` contém 43 arquivos, 35.103 bytes compactados e
  somente `dist/**` mais `package.json`;
- dez sistemas de design possuem exatamente as mesmas 67 custom properties,
  sem variáveis ausentes ou extras entre sistemas;
- os nomes separam superfícies, identidade, estados semânticos, tipografia,
  raio, borda, sombra e foco;
- modos claro e escuro usam o contrato documentado por `data-system` e `.dark`;
- o runtime compilado existente expõe os dez sistemas e resolve o sistema
  padrão corretamente;
- o typecheck passou com Node 22 e o compilador TypeScript saudável já
  instalado no Infra Hub;
- a pipeline de qualidade da biblioteca declara lint, typecheck, build dos
  packages, smoke de consumidor externo, build do showcase e auditorias de
  boundaries.

## Riscos encontrados

### Distribuição e identidade

- o remoto atual é `tainan21/MatrizUILib`, mas o GitHub Packages exige que o
  namespace npm corresponda ao usuário ou à organização proprietária;
- preservar `@matriz/*` exige transferir ou criar o repositório sob a
  organização GitHub `matriz`;
- `publishConfig` e `repository` devem ser adicionados somente depois que a URL
  proprietária final existir;
- nenhuma versão foi publicada no registry até esta data.

Sem essa mudança de ownership, não há prova de autenticação, instalação pelo
registry ou rollback para uma versão publicada anterior.

### Itens corrigidos na biblioteca

- pnpm foi fixado em `10.12.1` no `packageManager`;
- Changesets passou a coordenar a versão dos nove packages;
- a workflow de release foi criada, protegida pela variável explícita
  `MATRIZ_PACKAGES_RELEASE_ENABLED`;
- o banner variável foi removido e o CSS passou a ser determinístico;
- `tsup` limpa `dist` antes de cada build;
- `verify-tokens-contract.mjs` rejeita drift de exports, variáveis e arquivos;
- licença MIT e documentação de release/rollback foram adicionadas;
- um Changeset patch registra a alteração pública.

### Compatibilidade

- a raiz pública ainda mantém aliases e helpers marcados apenas como
  `Legacy compatibility`, sem política de depreciação;
- fontes como Geist, Space Grotesk, Inter e outras são referenciadas por nome,
  mas não são fornecidas pelo package;
- `customCss` de alguns sistemas altera `body`, botões e elementos com
  `data-slot`; por isso, importar o CSS completo tem impacto global e precisa
  de uma prova visual no consumidor.

## Checks executados

| Check | Resultado | Observação |
|---|---|---|
| Typecheck de `packages/tokens` | passou | executado pela instalação proprietária com pnpm 10.12.1 |
| Import do `dist/index.js` | passou | 10 sistemas, fallback padrão e validação de ID |
| Paridade de custom properties | passou | 67/67 em todos os dez sistemas |
| Dois builds consecutivos | passou | mesmo SHA-256 `e695ce5d…e975d7` para `tokens.css` |
| Consumidor externo por tarball | passou | instalação, typecheck e resolução somente por `dist/**` |
| Lint e typecheck dos nove packages | passou | execução proprietária completa |
| Auditorias arquiteturais | passou | imports locais, deep imports, Next leaks, barrels e boundaries |
| Build do showcase | passou | 21 rotas geradas com Next.js 16.2.0 |
| Changeset | passou | patch coordenado reconhecido para os nove packages |

O primeiro checkout não possuía dependências e usava um `tsc` global quebrado.
Após `pnpm install`, a toolchain fixada executou os checks normalmente; esse
problema ambiental deixou de ser bloqueador.

## Critérios para promoção

1. Transferir ou criar `MatrizUILib` sob a organização GitHub `matriz`.
2. Adicionar `repository` e `publishConfig` com a URL proprietária final.
3. Habilitar a workflow e publicar uma versão de teste no GitHub Packages.
4. Instalar a versão publicada em um consumidor fora do workspace.
5. Validar claro/escuro, fallback de fontes e impacto do CSS global em uma tela
   não crítica do Workbench.
6. Revisar humanamente a política antes de mudar `candidate` para `approved`.

## Próxima ação

Concluir a tarefa `tsk_c65fc39b-d1b5-4540-92b0-a1c8e7fc18bb`: estabelecer o
ownership GitHub do namespace `matriz`, publicar uma versão de teste e
consumi-la pelo registry. Somente então propor a adoção física no Workbench.
