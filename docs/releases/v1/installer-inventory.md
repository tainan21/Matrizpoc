# Inventário de instaladores locais da Matriz V1

Data da inspeção: 2026-08-27  
Baseline: `main` em `474997d`

Os cinco candidatos abaixo já possuem configuração de empacotamento no repositório. A geração será local, sequencial e sem publicação remota. Os binários finais ficarão em `output/releases/v1/installers/`, diretório ignorado pelo Git.

| Aplicação | Tecnologia | Comando oficial | Saída esperada | Assinatura | Estado inicial |
| --- | --- | --- | --- | --- | --- |
| Matriz Control | Electron Builder / NSIS | `corepack pnpm --filter @matriz/app-matriz-control desktop:build` | `apps/matriz-control/dist/*.exe` | Não configurada no script local | Pronto para tentativa local |
| Matriz Desktop (produto “Matriz Control”) | Tauri 2 / NSIS | `corepack pnpm --filter @matriz/app-matriz-desktop package` | `apps/matriz-desktop/src-tauri/target/release/bundle/nsis/Matriz Control_0.1.0_x64-setup.exe` | Não exigida pelo script local | Pronto para tentativa local |
| Seumei Desktop | Electron Builder / NSIS | `corepack pnpm --filter @matriz/app-seumei desktop:package` | `apps/seumeiapp/desktop-release/*.exe` | Opcional para pacote local; obrigatória no fluxo oficial `desktop:release` | Pacote local será marcado como não assinado |
| Matriz Admin Desktop | Tauri 2 / NSIS | `pwsh -NoProfile -File apps/matriz-desktop/scripts/package-matriz-admin.ps1` | `apps/matriz-admin/desktop/src-tauri/target/release/bundle/nsis/Matriz Admin_0.1.0_x64-setup.exe` | Não exigida pelo script local | Pronto para tentativa local |
| Matriz Ops Desktop | Tauri 2 / NSIS | `corepack pnpm --filter @matriz/app-matriz-ops package:desktop` | `apps/matriz-ops/desktop/src-tauri/target/release/bundle/nsis/*.exe` | Não configurada no script local | Pronto para tentativa local |

## Observações

- Existem duas superfícies chamadas “Control”: o aplicativo web/Electron `apps/matriz-control` e o host Tauri `apps/matriz-desktop`, cujo produto também se chama “Matriz Control”. Os artefatos serão nomeados de forma inequívoca no diretório de entrega.
- O workflow oficial do Seumei usa certificado e chave de manifesto para releases públicas. Nesta entrega, `desktop:package` gera somente um instalador local não assinado; `desktop:release` não será executado sem as credenciais oficiais.
- Os scripts Tauri de Matriz Desktop e Matriz Admin já verificam a existência do instalador e escrevem um arquivo SHA-256 canônico.
- Um build pode ser marcado como `INDEFINIDO` quando uma dependência externa, assinatura ou ferramenta de plataforma não estiver disponível. Nenhum controle de segurança será contornado.

