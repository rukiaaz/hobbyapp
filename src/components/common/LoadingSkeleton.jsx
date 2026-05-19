export default function LoadingSkeleton({ count = 3, type = 'card' }) {
  return (
    <div className={`skeleton-stack skeleton-${type}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article className="skeleton-card" key={`${type}-${index}`}>
          <div className="skeleton-line short" />
          <div className="skeleton-block" />
          <div className="skeleton-line" />
          <div className="skeleton-line medium" />
        </article>
      ))}
    </div>
  );
}
