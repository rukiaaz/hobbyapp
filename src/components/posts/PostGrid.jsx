export default function PostGrid({ posts }) {
  return (
    <section className="post-grid" aria-label="Profile post grid">
      {posts.map((post) => (
        <article className="grid-post" key={post.id}>
          {post.imageUrl ? (
            <img alt={post.imageAlt || post.title} src={post.imageUrl} />
          ) : (
            <div className={`post-art ${post.imageClass}`} role="img" aria-label={post.imageAlt || post.title} />
          )}
          <div className="grid-post-overlay">
            <strong>{post.hobby}</strong>
            <span>♡ {post.likes} · 💬 {post.comments}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
