# Distribuição e versões desktop

Fonte canônica para downloads, instaladores, versões e releases Windows da Matriz.

## Versão atual

- O manifest do app é a fonte da versão; `package.json` e Tauri/Electron devem coincidir.
- A versão remota atual é a maior release `stable` publicada pelo Matriz Hub.
- Stable não aceita prerelease e nunca pode ser publicada abaixo da stable atual.
- Rollback recompila o código restaurado com semver superior; nunca rebaixa o canal.
- Sem Hub, cache é somente **última versão conhecida**, nunca confirmação de latest.

## Matriz Windows x64

| Produto | Product ID | Identidade Windows | Tag | Artefato |
| --- | --- | --- | --- | --- |
| Control Tauri principal | `matriz-control-tauri` | `com.matriz.control` | `control-v<version>` | `matriz-control-<version>-windows-x64-setup.exe` |
| Control Electron compatibilidade | `matriz-control-electron` | `com.matriz.control.electron` | `control-electron-v<version>` | `matriz-control-electron-<version>-windows-x64-setup.exe` |
| NAEVIA Electron | `naevia-electron` | `com.matriz.naevia` | `naevia-v<version>` | `naevia-<version>-windows-x64-setup.exe` |
| Admin Tauri | `matriz-admin-tauri` | `com.matriz.admin` | `admin-v<version>` | `matriz-admin-<version>-windows-x64-setup.exe` |
| Client Admin Tauri | `matriz-client-admin-tauri` | `com.matriz.clientadmin` | `client-admin-v<version>` | `matriz-client-admin-<version>-windows-x64-setup.exe` |
| Ops Tauri | `matriz-ops-tauri` | `com.matriz.ops` | `ops-v<version>` | `matriz-ops-<version>-windows-x64-setup.exe` |
| Uninstall Tauri principal | `matriz-uninstall-tauri` | `com.matriz.uninstall.tauri` | `uninstall-v<version>` | `matriz-uninstall-<version>-windows-x64-setup.exe` |
| Uninstall Electron compatibilidade | `matriz-uninstall-electron` | `com.matriz.uninstall.electron` | `uninstall-electron-v<version>` | `matriz-uninstall-electron-<version>-windows-x64-setup.exe` |
| Workbench Electron | `matriz-workbench-electron` | `com.matriz.workbench` | `workbench-v<version>` | `matriz-workbench-<version>-windows-x64-setup.exe` |
| Seumei Electron | `seumei-electron` | `com.matriz.seumei` | `seumei-v<version>` | `seumei-<version>-windows-x64-setup.exe` |

Control Tauri começa em `1.0.0`. NAEVIA começa em `1.0.0`. Control Electron `0.2.0` é compatibilidade e não é atualização do Tauri nem do NAEVIA.

## Pipeline confiável

Cada workflow executa gates do app, empacota NSIS x64, exige Authenticode válido, calcula SHA-256, assina o manifesto Ed25519, publica os artefatos e registra draft + publish no Hub. O registro ocorre apenas depois de os artefatos existirem.

Secrets/variables: certificado Authenticode e senha do app, chave privada Ed25519, `MATRIZ_DISTRIBUTION_HUB_URL` e `MATRIZ_DISTRIBUTION_ADMIN_TOKEN`. Ausências falham fechadas. URL, path, comando, certificado ou chave nunca vêm do renderer.

## Local e offline

O Uninstall espera o Hub em `http://127.0.0.1:3000`. Sem ele, continua inspecionando, desinstalando, limpando e usando instaladores locais. Cache é recente por 24 horas, mas não habilita `Atualizar tudo`.

Pastas são escolhidas por diálogo nativo. Paths permanecem no adapter; a UI recebe IDs opacos, versão, tamanho, SHA-256 e confiança. O arquivo é reinspecionado antes de executar. Não assinados exigem confirmação reforçada; desconhecidos, adulterados, acima de 512 MiB ou com publisher incompatível são bloqueados.

## Proibido commitar

Não commitar `.exe`, `.blockmap`, `latest.yml` gerado, manifestos assinados gerados, certificados, chaves, `.env`, logs, caches, `dist`, `release`, `target` ou outputs.
