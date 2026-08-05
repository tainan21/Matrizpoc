export default function RoadmapLoading() {
  return (
    <main className="route-state" aria-busy="true" aria-live="polite">
      <span className="loading-mark" aria-hidden="true" />
      <h1>Carregando roadmap…</h1>
      <p>Lendo fases, iniciativas e work items vinculados.</p>
    </main>
  )
}
