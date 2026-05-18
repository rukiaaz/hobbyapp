export default function PostGrid({ posts }) {
  return (
    <section className="post-grid" aria-label="Profile post grid">
      {posts.map((post) => (
        <article className="grid-post" key={post.id}>
          <div className={`post-art ${post.imageClass}`} role="img" aria-label={post.title} />
          <div className="grid-post-overlay">
            <strong>{post.hobby}</strong>
            <span>♡ {post.likes} · 💬 {post.comments}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
