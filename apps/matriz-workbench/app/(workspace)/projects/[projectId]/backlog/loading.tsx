export default function BacklogLoading() {
  return (
    <main className="board-route-state" aria-busy="true" aria-label="Carregando quadro">
      <div className="board-route-toolbar-skeleton" />
      <div className="board-route-columns-skeleton">
        {Array.from({ length: 6 }, (_, index) => <div key={index}><i /><i /><i /></div>)}
      </div>
      <span className="sr-only">Carregando work items…</span>
    </main>
  )
}
