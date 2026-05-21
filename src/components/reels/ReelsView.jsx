import { useMemo, useState } from 'react';
import AppIcon from '../common/AppIcon.jsx';

function getMedia(post) {
  return post.mediaUrl || post.imageUrl || '';
}

function toActions(post) {
  return [
    { label: 'Like', value: post.likesCount ?? post.likes ?? 0, icon: 'heart' },
    { label: 'Comment', value: post.commentsCount ?? post.comments ?? 0, icon: 'comment' },
    { label: 'Share', value: post.shareCount ?? 0, icon: 'send' },
  ];
}

export default function ReelsView({ onViewProfile, posts = [] }) {
  const reels = useMemo(() => posts.filter((post) => getMedia(post)).slice(0, 8), [posts]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activePost = reels[activeIndex] ?? null;

  if (!activePost) {
    return (
      <section className="reels-view">
        <div className="empty-state">
          <strong>No reels yet</strong>
          <p>Add more media posts to populate this reel-style screen.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="reels-view" aria-labelledby="reels-title">
      <div className="reels-shell">
        <div className="reels-phone-frame">
          <div className="reels-screen">
            <img alt={activePost.imageAlt || activePost.title} src={getMedia(activePost)} />
            <div className="reels-overlay" />

            <div className="reels-topbar">
              <p id="reels-title">Reels</p>
              <button type="button" aria-label="Camera">
                <AppIcon name="create" size={18} />
              </button>
            </div>

            <div className="reels-bottom">
              <div className="reels-meta">
                <button
                  className="reels-creator"
                  onClick={() =>
                    onViewProfile?.({
                      avatar: activePost.avatar,
                      bio: activePost.caption,
                      displayName: activePost.creator,
                      handle: activePost.handle,
                      mainHobby: activePost.hobby,
                      uid: activePost.authorId,
                    })
                  }
                  type="button"
                >
                  <span className="mini-avatar" aria-hidden="true">
                    {activePost.avatar || activePost.creator.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{activePost.handle || activePost.creator}</strong>
                    <small>{activePost.hobby}</small>
                  </span>
                </button>
                <p>{activePost.caption}</p>
              </div>

              <div className="reels-actions">
                {toActions(activePost).map((action) => (
                  <button key={action.label} type="button" aria-label={action.label}>
                    <AppIcon name={action.icon} size={22} />
                    <small>{action.value}</small>
                  </button>
                ))}
                <button type="button" aria-label="Save">
                  <AppIcon name="bookmark" size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="reels-sidebar" aria-label="More reels">
          <div className="section-heading">
            <div>
              <p>Now playing</p>
              <span>Swipe-style reel cards</span>
            </div>
          </div>

          <div className="reels-list">
            {reels.map((post, index) => (
              <button
                className={`reel-list-item ${index === activeIndex ? 'active' : ''}`}
                key={post.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <img alt="" src={getMedia(post)} />
                <span>
                  <strong>{post.creator}</strong>
                  <small>{post.title}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
