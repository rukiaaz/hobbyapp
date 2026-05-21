function getPostMetric(post, liveKey, mockKey) {
  return post[liveKey] ?? post[mockKey] ?? 0;
}

function getPostMediaUrl(post) {
  return post.mediaUrl || post.imageUrl || '';
}

function isVideoPost(post) {
  return post.mediaType === 'video' || post.mediaResourceType === 'video';
}

export default function PostGrid({ posts }) {
  return (
    <section className="post-grid" aria-label="Profile post grid">
      {posts.map((post) => {
        const likes = getPostMetric(post, 'likesCount', 'likes');
        const comments = getPostMetric(post, 'commentsCount', 'comments');
        const mediaUrl = getPostMediaUrl(post);

        return (
          <article className="grid-post" key={post.id}>
            {mediaUrl ? (
              isVideoPost(post) ? (
                <video muted playsInline preload="metadata" src={mediaUrl} />
              ) : (
                <img alt={post.imageAlt || post.title} src={mediaUrl} />
              )
            ) : (
              <div className={`post-art ${post.imageClass}`} role="img" aria-label={post.imageAlt || post.title} />
            )}
            <div className="grid-post-overlay">
              <strong>{post.hobby}</strong>
              <span>{likes} likes · {comments} comments</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
