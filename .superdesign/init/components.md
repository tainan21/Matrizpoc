# Matriz Control reusable components

The current app intentionally uses app-local components rather than a third-party component kit. `PlaceholderPage` is the only shared content primitive used by several routes.

## `apps/matriz-control/src/ui/placeholder-page.tsx` — PlaceholderPage

Shared scaffold for unfinished Control modules.

```tsx
export function PlaceholderPage({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <main className="page"><div className="page-title"><span className="section-label">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><section className="placeholder-panel"><span>Próximo módulo</span><h2>Estrutura preparada</h2><p>Esta área já participa do shell global e pode acompanhar as sessões sem interromper processos.</p></section></main>
}
```
