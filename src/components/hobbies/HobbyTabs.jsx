export default function HobbyTabs({ categories, activeCategoryId = 'all', onCategoryChange }) {
  return (
    <section className="hobby-tabs" aria-label="Filter posts by hobby category">
      {categories.map((category) => {
        const isActive = category.id === activeCategoryId;

        return (
          <button
            aria-pressed={isActive}
            className={isActive ? 'active' : ''}
            key={category.id}
            onClick={() => onCategoryChange?.(category.id)}
            type="button"
          >
            {category.label}
          </button>
        );
      })}
    </section>
  );
}
