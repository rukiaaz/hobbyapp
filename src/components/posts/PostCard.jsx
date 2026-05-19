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

export default function PostCard({
  categories = [],
  currentUser,
  onAddComment,
  onDeleteComment,
  onDeletePost,
  onReport,
  onShare,
  onToggleLike,
  onToggleSave,
  onUpdatePost,
  onViewProfile,
  post,
  profile,
}) {
  const [actionError, setActionError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.commentsPreview ?? []);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editCategoryId, setEditCategoryId] = useState(post.categoryId);
  const [editHobby, setEditHobby] = useState(post.hobby);
  const [editTitle, setEditTitle] = useState(post.title);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);

  const isOwnPost = post.isLive && post.authorId === currentUser?.uid;
  const mediaUrl = getPostMediaUrl(post);
  const isVideo = isVideoPost(post);
  const previewComments = (post.commentsPreview ?? []).slice(0, 2);

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

  useEffect(() => {
    setEditCaption(post.caption);
    setEditCategoryId(post.categoryId);
    setEditHobby(post.hobby);
    setEditTitle(post.title);
  }, [post.caption, post.categoryId, post.hobby, post.title]);

  function handleViewAuthor() {
    onViewProfile?.({
      avatar: post.avatar,
      bio: post.caption,
      displayName: post.creator,
      handle: post.handle,
      mainHobby: post.hobby,
      uid: post.authorId,
    });
  }

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
      setActionError(`Could not update like. (${error.code ?? 'unknown-error'})`);
    }
  }

  async function handleSaveClick() {
    try {
      await onToggleSave?.(post);
    } catch (error) {
      setActionError(`Could not save post. (${error.code ?? 'unknown-error'})`);
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setActionError('');

    try {
      await onUpdatePost?.(post.id, {
        caption: editCaption,
        categoryId: editCategoryId,
        hobby: editHobby,
        title: editTitle,
      });
      setIsEditing(false);
      setIsMenuOpen(false);
    } catch (error) {
      setActionError(`Could not update post. (${error.code ?? 'unknown-error'})`);
    }
  }

  async function handleDeletePost() {
    if (!window.confirm('Delete this post? This cannot be undone.')) {
      return;
    }

    setActionError('');

    try {
      await onDeletePost?.(post.id);
      setIsMenuOpen(false);
    } catch (error) {
      setActionError(`Could not delete post. (${error.code ?? 'unknown-error'})`);
    }
  }

  async function handleDeleteComment(commentId) {
    setCommentError('');

    try {
      await onDeleteComment?.(post.id, commentId);
    } catch (error) {
      setCommentError(`Could not delete comment. (${error.code ?? 'unknown-error'})`);
    }
  }

  return (
    <article className={`feed-card ${post.isLive ? 'is-live' : 'is-demo'}`} id={`post-${post.id}`}>
      <header className="feed-header">
        <button className="mini-avatar avatar-button" onClick={handleViewAuthor} type="button" aria-label={`View ${post.creator} profile`}>
          {getAvatarLabel(post)}
        </button>

        <button className="feed-author author-button" onClick={handleViewAuthor} type="button">
          <strong>{post.creator}</strong>
          <p>
            {post.handle} · {post.hobby} · {post.timeAgo}
          </p>
        </button>

        <span className="live-pill">{post.isLive ? 'Live' : 'Inspo'}</span>
        <button
          className="more-button"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
          aria-expanded={isMenuOpen}
          aria-label={`More options for ${post.title}`}
        >
          •••
        </button>
      </header>

      {isMenuOpen && (
        <div className="post-menu" role="menu">
          {isOwnPost && (
            <>
              <button onClick={() => setIsEditing((editing) => !editing)} type="button">Edit post</button>
              <button onClick={handleDeletePost} type="button">Delete post</button>
            </>
          )}
          <button onClick={() => onReport?.('post', post.id)} type="button">Report post</button>
        </div>
      )}

      {isEditing && (
        <form className="post-edit-form" onSubmit={handleEditSubmit}>
          <label className="auth-field" htmlFor={`edit-title-${post.id}`}>
            <span>Title</span>
            <input id={`edit-title-${post.id}`} maxLength="80" onChange={(event) => setEditTitle(event.target.value)} required value={editTitle} />
          </label>
          <div className="composer-grid">
            <label className="auth-field" htmlFor={`edit-category-${post.id}`}>
              <span>Category</span>
              <select id={`edit-category-${post.id}`} onChange={(event) => setEditCategoryId(event.target.value)} value={editCategoryId}>
                {categories.filter((category) => category.id !== 'all').map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </label>
            <label className="auth-field" htmlFor={`edit-hobby-${post.id}`}>
              <span>Hobby</span>
              <input id={`edit-hobby-${post.id}`} maxLength="40" onChange={(event) => setEditHobby(event.target.value)} required value={editHobby} />
            </label>
          </div>
          <label className="auth-field" htmlFor={`edit-caption-${post.id}`}>
            <span>Caption</span>
            <textarea id={`edit-caption-${post.id}`} maxLength="240" onChange={(event) => setEditCaption(event.target.value)} required rows="3" value={editCaption} />
          </label>
          <div className="post-edit-actions">
            <button className="text-button" onClick={() => setIsEditing(false)} type="button">Cancel</button>
            <button className="auth-submit" type="submit">Save changes</button>
          </div>
        </form>
      )}

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
          <small>{post.createdAtLabel || post.timeAgo}</small>
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
          <button aria-pressed={post.viewerHasSaved} onClick={handleSaveClick} type="button">
            {post.viewerHasSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>

        <p className="post-stats">
          <strong>{post.likesCount} likes</strong> · {post.commentsCount} comments · {post.shareCount} shares
        </p>

        <p className="feed-caption">
          <strong>{post.title}</strong> {post.caption}
        </p>

        {!isCommentsOpen && previewComments.length > 0 && (
          <div className="comment-preview">
            {previewComments.map((comment) => (
              <p key={comment.id}><strong>{comment.creator}</strong> {comment.text}</p>
            ))}
            {post.commentsCount > previewComments.length && (
              <button onClick={() => setIsCommentsOpen(true)} type="button">View all comments</button>
            )}
          </div>
        )}

        {actionError && <p className="auth-message">{actionError}</p>}
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
              comments.map((comment) => {
                const canDeleteComment = post.isLive && (comment.authorId === currentUser?.uid || isOwnPost);

                return (
                  <article className="comment-row" key={comment.id}>
                    <div className="mini-avatar" aria-hidden="true">
                      {comment.avatar || comment.creator.slice(0, 1)}
                    </div>
                    <div>
                      <p>
                        <strong>{comment.creator}</strong> {comment.text}
                      </p>
                      <span>{comment.handle} · {comment.createdAtLabel || comment.timeAgo}</span>
                    </div>
                    {canDeleteComment && (
                      <button className="text-button" onClick={() => handleDeleteComment(comment.id)} type="button">
                        Delete
                      </button>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="empty-comments">No comments yet. Be the first to cheer them on.</p>
            )}
          </div>
        </section>
      )}
    </article>
  );
}
