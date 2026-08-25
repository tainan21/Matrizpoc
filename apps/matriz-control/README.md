# Matriz Control

Local operational cockpit for known Matriz projects and processes.

## Ownership

- **Responsibility:** start declared project actions and expose bounded local terminal sessions.
- **Exposes:** `public-contract.ts` with its manifest only.
- **Does not expose:** shell primitives, arbitrary filesystem access, or another app's internals.
- **May import:** stable `@matriz/*` infrastructure contracts.
- **Must not import:** another app's `src/**` or `app/**`.

## Run

```powershell
$env:MATRIZ_CONTROL_LOCAL_TOKEN = "choose-a-long-local-secret"
corepack pnpm --filter @matriz/app-matriz-control dev
```

Open `http://localhost:3009/apps`. The terminal process supervisor is memory-only and intended for loopback development.

Terminal screens abbreviate the existing workspace root as lowercase `mih` (for example, `mih/apps/matriz-control`). The controlled `cd mih` shortcut returns the displayed route to that root without renaming the physical `matriz-infra-hub` directory or enabling arbitrary path navigation.

## Navegador desktop local

O cockpit web permanece disponível em `http://localhost:3009/browser`. Para anexar o Chromium nativo com cápsulas isoladas, WebGL2, áudio, downloads e o editor seguro:

```powershell
$env:MATRIZ_CONTROL_LOCAL_TOKEN = "choose-a-long-local-secret"
$env:MATRIZ_WORKSPACE_ROOT = (Get-Location).Path
corepack pnpm --filter @matriz/app-matriz-control desktop:dev
```

O cofre VHDX/BitLocker é configurado pelo painel **Agente** da rota `/browser`. A criação e montagem do volume podem exigir que o Matriz Control seja iniciado como administrador; a chave de recuperação é protegida pelo Windows `safeStorage` e não deve ser colocada em `.env` ou argumentos.

Para gerar o instalador Windows local:

```powershell
corepack pnpm --filter @matriz/app-matriz-control desktop:build
```

O servidor MCP STDIO é iniciado pelo executável compilado com `corepack pnpm --filter @matriz/app-matriz-control mcp:start`. Ele somente conecta ao desktop já aberto por named pipe autenticado; as ferramentas não expõem shell, cookies, tokens, variáveis de ambiente ou caminhos absolutos.
