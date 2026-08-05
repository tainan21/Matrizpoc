# Matriz Sites

Coleção Next.js para sites configuráveis. Cada site possui identidade, idiomas,
assets e metadata; renderer, presets e validações são compartilhados.

## Ownership

- **Responsabilidade:** catálogo e runtime de sites orientados por configuração.
- **Expõe:** `public-contract.ts` com manifest somente.
- **Não expõe:** internals, conteúdo de clientes ou filesystem genérico.
- **Pode importar:** packages técnicos e contratos estáveis do ecossistema.
- **Não pode importar:** `src/**` ou `app/**` de outro app.

## Desenvolvimento

```powershell
pnpm --filter @matriz/app-sites dev
```

Abra `http://127.0.0.1:3006`.
