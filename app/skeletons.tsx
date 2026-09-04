/** Blocos de carregamento reutilizáveis, no lugar de textos "Carregando...". */

export function GridSkeleton({ items = 8 }: { items?: number }) {
  return <div className="grid" aria-busy="true" aria-label="Carregando peças">
    {Array.from({ length: items }, (_, index) => <div className="skeletonCard" key={index}>
      <span className="skeleton skeletonImage" />
      <span className="skeleton skeletonLine" style={{ width: '70%' }} />
      <span className="skeleton skeletonLine" style={{ width: '40%' }} />
    </div>)}
  </div>;
}

export function ListSkeleton({ items = 3, label = 'Carregando' }: { items?: number; label?: string }) {
  return <div className="skeletonList" aria-busy="true" aria-label={label}>
    {Array.from({ length: items }, (_, index) => <div className="skeletonRow" key={index}>
      <span className="skeleton skeletonThumb" />
      <div>
        <span className="skeleton skeletonLine" style={{ width: '55%' }} />
        <span className="skeleton skeletonLine" style={{ width: '30%' }} />
      </div>
      <span className="skeleton skeletonLine" style={{ width: '4.5rem' }} />
    </div>)}
  </div>;
}
