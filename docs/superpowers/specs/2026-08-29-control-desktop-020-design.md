# Matriz Control Desktop 0.2.0 Design

## Goal

Entregar um instalador Windows do Matriz Control 0.2.0 que abra o cockpit completo e possa ser publicado por um pipeline verificável, sem habilitar atualização ou distribuição de produção sem assinatura.

## Scope

- O Electron carregará `/home` tanto no desenvolvimento desktop quanto no pacote instalado. O usuário recebe a mesma navegação, Pulso, Agentes, Ambientes, Portas e Ajustes disponíveis no build web 0.2.0.
- O bridge Electron continua app-local, tipado e protegido pela origem loopback. Ele acrescenta capacidades somente ao desktop; telas web continuam honestas sobre capacidades indisponíveis.
- O `electron-builder` continuará gerando NSIS por usuário. A release incluirá o instalador, blockmap e metadados do updater apenas quando o certificado Authenticode e o canal GitHub forem configurados no CI.
- Um workflow manual, separado do build normal, validará testes, lint, typecheck, build e `desktop:build`; em seguida assinará e publicará os artefatos em uma tag `control-v<version>`.

## Non-goals

- Não criar um updater configurado localmente com URL, certificado ou segredo no repositório.
- Não mudar a arquitetura Electron existente nem criar package compartilhado.
- Não instalar, atualizar ou abrir aplicativos de Store por MCP.
- Não anunciar que 0.2.0 está disponível para download antes de a release assinada existir.

## Components and data flow

1. `desktop/launch.mjs` inicia o servidor web e abre o Electron em `http://127.0.0.1:3009/home`.
2. `desktop/main.ts` usa a mesma rota `/home` no pacote, depois de iniciar o standalone em loopback. O `ControlShell` e suas rotas são o conteúdo inicial; o navegador nativo segue disponível em `/browser`.
3. `electron-builder` inclui o standalone compilado, estáticos e código desktop. O número da versão vem de `apps/matriz-control/package.json` e é `0.2.0`.
4. O workflow de release recebe uma tag exata, verifica que ela coincide com a versão do package, executa gates, exige os segredos de assinatura e só então gera/publica os assets. Sem esses requisitos, o job falha antes da publicação.
5. O `electron-updater` lê metadados somente do pacote já assinado/publicado. Ausência de `app-update.yml` continua sendo `unavailable` na UI.

## Security and failure behavior

- Nenhum renderer escolhe rota privilegiada, URL de atualização, arquivo ou comando. A rota inicial é uma constante do processo principal.
- A assinatura Authenticode, a chave de publisher e o provider de release pertencem ao CI. Valores ausentes bloqueiam o workflow; não há fallback local.
- O workflow publica apenas instalador NSIS, blockmap e metadados gerados pelo builder; não inclui `.env`, logs, dados locais, caches nem builds transitórios além dos assets de release necessários.
- A interface não apresenta sucesso para update/store sem bridge desktop ou canal empacotado.

## Validation

- Testes unitários cobrem a rota inicial do launcher e a configuração de publicação restrita.
- `pnpm --filter @matriz/app-matriz-control test`, `lint`, `typecheck`, `build` e `desktop:compile`.
- O workflow roda os mesmos gates e verifica que o instalador/metadata esperados foram produzidos antes do upload.
- Como manifest e workflow são alterados, executar `pnpm test:smoke`, `pnpm verify:boundaries`, `pnpm verify:tracked-artifacts` e `git diff --check`.

## Rollback

Uma tag/release de Control é independente. Se a release falhar antes da publicação, nenhum instalador é oferecido. Se um pacote publicado precisar de rollback, publica-se uma versão posterior assinada; não se apaga dados do usuário nem se permite downgrade automático.
