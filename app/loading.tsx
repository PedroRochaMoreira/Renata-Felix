/** Esqueleto genérico enquanto uma rota do servidor é preparada. */
export default function Loading() {
  return <main id="conteudo" className="catalog" aria-busy="true" aria-label="Carregando">
    <div className="catalogTitle">
      <span className="skeleton skeletonLine" style={{ width: '9rem' }} />
      <span className="skeleton skeletonTitle" />
      <span className="skeleton skeletonLine" style={{ width: '22rem', maxWidth: '80%' }} />
    </div>
    <div className="grid">{Array.from({ length: 8 }, (_, index) => (
      <div className="skeletonCard" key={index}>
        <span className="skeleton skeletonImage" />
        <span className="skeleton skeletonLine" style={{ width: '70%' }} />
        <span className="skeleton skeletonLine" style={{ width: '40%' }} />
      </div>
    ))}</div>
  </main>;
}
