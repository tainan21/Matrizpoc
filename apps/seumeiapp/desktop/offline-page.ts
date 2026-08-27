export function createOfflinePage(reason: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Seumei indisponível</title><style>body{font-family:system-ui,sans-serif;background:#111827;color:#f9fafb;display:grid;min-height:100vh;place-items:center;margin:0}.card{max-width:34rem;padding:2rem;border:1px solid #4b5563;border-radius:1rem;background:#1f2937}p{color:#d1d5db;line-height:1.5}</style></head><body><main class="card"><h1>Seumei indisponível</h1><p>${escapeHtml(reason)}</p><p>Verifique sua conexão ou a configuração do desktop e tente novamente. Nenhuma alteração foi enviada.</p></main></body></html>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] ?? character)
}
