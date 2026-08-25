export function PlaceholderPage({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <main className="page"><div className="page-title"><span className="section-label">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><section className="placeholder-panel"><span>Próximo módulo</span><h2>Estrutura preparada</h2><p>Esta área já participa do shell global e pode acompanhar as sessões sem interromper processos.</p></section></main>
}
