# Matriz Uninstall

- **Responsibility:** safely install, update, reinstall, uninstall and clean
  allowlisted residues of Windows Matriz products.
- **Exposes:** `public-contract.ts` with the manifest only.
- **Does not expose:** registry, filesystem, process or installer primitives.
- **May import:** stable `@matriz/*` design and integration contracts.
- **Must not import:** another app's `src/**` or `app/**`.

Tauri is the recommended desktop edition. Electron is maintained for
compatibility, benchmark and cases that concretely require Chromium/Node. Both
share one renderer and behavior:

```powershell
pnpm --filter @matriz/app-matriz-uninstall package:tauri
pnpm --filter @matriz/app-matriz-uninstall package:electron
```
