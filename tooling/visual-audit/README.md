# Auditoria visual automatizada

O runner descobre os 101 arquivos `page.tsx`, autentica pelos fluxos locais e
produz 216 screenshots com no máximo duas tentativas cumulativas por
combinação `{app, pattern, viewport}`.

Ele procura `playwright` primeiro em `PLAYWRIGHT_NODE_MODULES`, depois nas
dependências resolvíveis do monorepo e por fim no cache `_npx` mais recente. O
comando abaixo aquece esse cache sem adicionar dependência ao monorepo:

```powershell
npx --yes --package @playwright/cli playwright-cli --help
$env:PLAYWRIGHT_NODE_MODULES = "<node_modules-com-playwright>" # override opcional
node tooling/visual-audit/capture.mjs --viewports=desktop,mobile,tv --channel=chrome
node tooling/visual-audit/verify.mjs --all
```

`chrome` é o canal padrão e exige Google Chrome instalado. Use
`--channel=chromium` (ou `PLAYWRIGHT_CHANNEL=chromium`) quando o Chromium
gerenciado pelo Playwright e seus binários já estiverem instalados. As flags
aceitam `--viewports=desktop,mobile` e `--viewports desktop,mobile`.

Os apps devem estar ativos nas portas 3000–3006. O runner usa `localhost` para
o broker compartilhado e `127.0.0.1` para Workbench/Sites, preservando os
cookies conforme o contrato local. `--retry-failed` repete somente combinações
falhas do índice existente que ainda tenham uma tentativa disponível; uma
falha com `attempts: 2` nunca é repetida. Lotes normais separados substituem
apenas os viewports solicitados e são mesclados no mesmo índice. Para rotas
dinâmicas, o resultado registra `segmentResolution` com `resolved` ou
`fallback`. Imagens, índice e sessões ficam sob `output/` e não são
versionados.

Modos de verificação:

```powershell
node tooling/visual-audit/verify.mjs --manifest-only
node tooling/visual-audit/verify.mjs --artifacts
node tooling/visual-audit/verify.mjs --report docs/visual-route-audit-2026-08-17.md
node tooling/visual-audit/verify.mjs --components docs/visual-route-audit-2026-08-17.md
```

`--artifacts` exige 216 resultados `ok`, cobertura única de 101 desktop, 101
mobile e 14 TV, correspondência com o manifesto, `status`, `finalUrl`, arquivo
determinístico e dimensões PNG reais. `--all` executa todos os modos.
