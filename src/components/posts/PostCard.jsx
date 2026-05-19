import { useEffect, useState } from 'react';
import { listenToComments } from '../../services/posts.js';

function getAvatarLabel(post) {
  return post.avatar || post.creator.slice(0, 1);
}

function getPostMediaUrl(post) {
  return post.mediaUrl || post.imageUrl || '';
}

function isVideoPost(post) {
  return post.mediaType === 'video' || post.mediaResourceType === 'video';
}

export default function PostCard({ currentUser, onAddComment, onShare, onToggleLike, post, profile }) {
  const [commentError, setCommentError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.commentsPreview ?? []);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);

  useEffect(() => {
    if (!isCommentsOpen || !post.isLive) {
      setComments(post.commentsPreview ?? []);
      return undefined;
    }

    const unsubscribe = listenToComments(
      post.id,
      setComments,
      (error) => setCommentError(`Could not load comments. (${error.code ?? 'unknown-error'})`),
    );

    return unsubscribe;
  }, [isCommentsOpen, post.commentsPreview, post.id, post.isLive]);

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    setIsSavingComment(true);
    setCommentError('');

    try {
      await onAddComment?.(post, commentText);
      setCommentText('');
      setIsCommentsOpen(true);
    } catch (error) {
      setCommentError(`Could not add comment. (${error.code ?? 'unknown-error'})`);
    } finally {
      setIsSavingComment(false);
    }
  }

  async function handleLikeClick() {
    try {
      await onToggleLike?.(post);
    } catch (error) {
      setCommentError(`Could not update like. (${error.code ?? 'unknown-error'})`);
    }
  }

  const mediaUrl = getPostMediaUrl(post);
  const isVideo = isVideoPost(post);

  return (
    <article className={`feed-card ${post.isLive ? 'is-live' : 'is-demo'}`} id={`post-${post.id}`}>
      <header className="feed-header">
        <div className="mini-avatar" aria-hidden="true">
          {getAvatarLabel(post)}
        </div>

        <div className="feed-author">
          <strong>{post.creator}</strong>
          <p>
            {post.handle} · {post.hobby} · {post.timeAgo}
          </p>
        </div>

        <span className="live-pill">{post.isLive ? 'Live' : 'Inspo'}</span>
        <button className="more-button" type="button" aria-label={`More options for ${post.title}`}>
          •••
        </button>
      </header>

      <div className={`feed-media ${isVideo ? 'has-video' : ''}`}>
        {mediaUrl ? (
          isVideo ? (
            <video controls playsInline preload="metadata" src={mediaUrl} />
          ) : (
            <img alt={post.imageAlt || post.title} src={mediaUrl} />
          )
        ) : (
          <div className={`feed-art ${post.imageClass}`} role="img" aria-label={post.imageAlt || post.title} />
        )}
        <div className="media-scrim" aria-hidden="true" />
        <div className="media-label-row">
          <span>{post.hobby}</span>
          <small>{post.timeAgo}</small>
        </div>
      </div>

      <div className="feed-content">
        <div className="feed-actions" aria-label="Post actions">
          <div>
            <button
              aria-pressed={post.viewerHasLiked}
              className={post.viewerHasLiked ? 'liked' : ''}
              onClick={handleLikeClick}
              type="button"
            >
              {post.viewerHasLiked ? '♥ Liked' : '♡ Like'}
            </button>
            <button
              aria-expanded={isCommentsOpen}
              onClick={() => setIsCommentsOpen((isOpen) => !isOpen)}
              type="button"
            >
              💬 Comment
            </button>
            <button onClick={() => onShare?.(post)} type="button">
              ↗ Share
            </button>
          </div>
          <button aria-pressed={isSaved} onClick={() => setIsSaved((saved) => !saved)} type="button">
            {isSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>

        <p className="post-stats">
          <strong>{post.likesCount} likes</strong> · {post.commentsCount} comments · {post.shareCount} shares
        </p>

        <p className="feed-caption">
          <strong>{post.title}</strong> {post.caption}
        </p>
      </div>

      {isCommentsOpen && (
        <section className="comments-panel" aria-label={`Comments for ${post.title}`}>
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <div className="mini-avatar" aria-hidden="true">
              {profile?.avatar || currentUser?.email?.slice(0, 1).toUpperCase()}
            </div>
            <input
              aria-label="Write a comment"
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a supportive comment..."
              value={commentText}
            />
            <button disabled={isSavingComment} type="submit">
              Post
            </button>
          </form>

          {commentError && <p className="auth-message">{commentError}</p>}

          <div className="comment-list">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <article className="comment-row" key={comment.id}>
                  <div className="mini-avatar" aria-hidden="true">
                    {comment.avatar || comment.creator.slice(0, 1)}
                  </div>
                  <div>
                    <p>
                      <strong>{comment.creator}</strong> {comment.text}
                    </p>
                    <span>{comment.handle} · {comment.timeAgo}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-comments">No comments yet. Be the first to cheer them on.</p>
            )}
          </div>
        </section>
      )}
    </article>
  );
}
