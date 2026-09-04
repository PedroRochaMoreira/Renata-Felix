/**
 * Mostrado entre navegações. Reproduz o formato da vitrine em vez de uma frase
 * solta, para a página não pular quando o conteúdo real chega.
 */
export default function Loading() {
  return (
    <div className="pageLoading" role="status" aria-live="polite">
      <span className="srOnly">Carregando a página</span>
      <div className="skeletonHeading" aria-hidden="true">
        <span className="skeleton skeletonLine short" />
        <span className="skeleton skeletonLine title" />
      </div>
      <div className="grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeletonCard" key={index}>
            <span className="skeleton skeletonImage" />
            <span className="skeleton skeletonLine" />
            <span className="skeleton skeletonLine short" />
          </div>
        ))}
      </div>
    </div>
  );
}
