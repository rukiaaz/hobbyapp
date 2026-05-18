export default function PostCard({ post }) {
  return (
    <article className="feed-card">
      <header className="feed-header">
        <div className="mini-avatar" aria-hidden="true">
          {post.creator.slice(0, 1)}
        </div>
        <div>
          <strong>{post.creator}</strong>
          <p>{post.handle} · {post.hobby}</p>
        </div>
      </header>

      <div className={`feed-art ${post.imageClass}`} role="img" aria-label={post.title} />

      <div className="feed-actions" aria-label="Post actions">
        <button type="button">♡ Like</button>
        <button type="button">💬 Comment</button>
        <button type="button">↗ Share</button>
      </div>

      <p className="feed-caption">
        <strong>{post.title}</strong> {post.caption}
      </p>
    </article>
  );
}
