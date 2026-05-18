export default function PostCard({ post }) {
  return (
    <article className="feed-card">
      <header className="feed-header">
        <div className="mini-avatar" aria-hidden="true">
          {post.creator.slice(0, 1)}
        </div>

        <div className="feed-author">
          <strong>{post.creator}</strong>
          <p>
            {post.handle} · {post.hobby} · {post.timeAgo}
          </p>
        </div>

        <button className="more-button" type="button" aria-label={`More options for ${post.title}`}>
          •••
        </button>
      </header>

      <div className={`feed-art ${post.imageClass}`} role="img" aria-label={post.title}>
        <span>{post.hobby}</span>
      </div>

      <div className="feed-actions" aria-label="Post actions">
        <div>
          <button type="button">♡ Like</button>
          <button type="button">💬 Comment</button>
          <button type="button">↗ Share</button>
        </div>
        <button type="button">☆ Save</button>
      </div>

      <p className="post-stats">
        <strong>{post.likes} likes</strong> · {post.comments} comments
      </p>

      <p className="feed-caption">
        <strong>{post.title}</strong> {post.caption}
      </p>
    </article>
  );
}
