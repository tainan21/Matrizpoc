# Matriz Admin

Aplicação administrativa do ecossistema Matriz para operar clientes e estabelecimentos de Seumei, Spot, WillDash e futuros produtos. Esta pasta preserva temporariamente partes do antigo domínio Seumei enquanto a migração ocorre por fatias.

```powershell
pnpm --filter @matriz/app-matriz-admin dev
pnpm --filter @matriz/app-matriz-admin test
pnpm --filter @matriz/app-matriz-admin package:desktop
```

Web: porta `3002`. O instalador fica em `desktop/src-tauri/target/release/bundle/nsis/Matriz Admin_<version>_x64-setup.exe`.

Matriz Admin não é dona do banco Seumei. Integrações futuras devem usar APIs/gateways tenant-scoped.
