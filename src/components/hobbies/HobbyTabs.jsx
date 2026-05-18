export default function HobbyTabs({ categories }) {
  return (
    <section className="hobby-tabs" aria-label="Hobby categories">
      {categories.map((category, index) => (
        <button className={index === 0 ? 'active' : ''} key={category.id} type="button">
          <span aria-hidden="true">{category.icon}</span>
          {category.label}
        </button>
      ))}
    </section>
  );
}
