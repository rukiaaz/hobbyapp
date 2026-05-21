import { useMemo } from 'react';
import AppIcon from '../common/AppIcon.jsx';

function postMatchesQuery(post, query) {
  if (!query) {
    return true;
  }

  return [post.title, post.caption, post.creator, post.handle, post.hobby]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

function userMatchesQuery(user, query) {
  if (!query) {
    return true;
  }

  return [user.displayName, user.handle, user.mainHobby, user.bio, ...(user.interests ?? [])]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

export default function SearchView({
  categories = [],
  livePosts = [],
  onOpenHobby,
  onRemoveSearchHistory,
  onSearchChange,
  onSearchCommit,
  onViewProfile,
  posts = [],
  searchHistory = [],
  searchQuery = '',
  userProfiles = [],
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const allPosts = useMemo(() => [...livePosts, ...posts], [livePosts, posts]);

  const matchingProfiles = useMemo(
    () => userProfiles.filter((user) => userMatchesQuery(user, normalizedQuery)).slice(0, 7),
    [normalizedQuery, userProfiles],
  );

  const matchingPosts = useMemo(
    () => allPosts.filter((post) => postMatchesQuery(post, normalizedQuery)).slice(0, 9),
    [allPosts, normalizedQuery],
  );

  const quickTags = useMemo(() => {
    const source = normalizedQuery
      ? categories.filter((category) => category.label.toLowerCase().includes(normalizedQuery))
      : categories.filter((category) => category.id !== 'all');

    return source.slice(0, 6);
  }, [categories, normalizedQuery]);

  return (
    <section className="search-view" aria-labelledby="search-view-title">
      <div className="search-hero-card">
        <div>
          <p className="eyebrow">Search</p>
          <h1 id="search-view-title">Find people, tags, and visuals fast.</h1>
          <p>Use the same quick search pattern as the wireframes: people first, then visual results.</p>
        </div>

        <form
          className="explore-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchCommit?.(searchQuery);
          }}
        >
          <label className="explore-search search-view-search" htmlFor="search-view-input">
            <AppIcon className="search-box-icon" name="search" size={18} />
            <span className="sr-only">Search creators, hobbies, and posts</span>
            <input
              id="search-view-input"
              onBlur={() => onSearchCommit?.(searchQuery)}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search"
              type="search"
              value={searchQuery}
            />
          </label>
        </form>
      </div>

      {searchHistory.length > 0 && (
        <section className="search-history-strip" aria-label="Recent searches">
          <span>Recent</span>
          {searchHistory.slice(0, 6).map((term) => (
            <span className="history-chip" key={term}>
              <button
                onClick={() => {
                  onSearchChange?.(term);
                  onSearchCommit?.(term);
                }}
                type="button"
              >
                {term}
              </button>
              <button onClick={() => onRemoveSearchHistory?.(term)} type="button" aria-label={`Remove ${term}`}>
                x
              </button>
            </span>
          ))}
        </section>
      )}

      <div className="search-layout-grid">
        <section className="search-results-panel" aria-labelledby="search-accounts-title">
          <div className="section-heading">
            <div>
              <p id="search-accounts-title">Top accounts</p>
              <span>{matchingProfiles.length} found</span>
            </div>
          </div>

          <div className="search-results-list">
            {matchingProfiles.length > 0 ? (
              matchingProfiles.map((user) => (
                <button className="search-result-row" key={user.uid} onClick={() => onViewProfile?.(user)} type="button">
                  <span className="mini-avatar" aria-hidden="true">
                    {user.avatar || user.displayName?.slice(0, 1) || '?'}
                  </span>
                  <span>
                    <strong>{user.displayName}</strong>
                    <small>{user.handle} · {user.mainHobby}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className="empty-state compact">
                <strong>No creators found</strong>
                <p>Try a display name, handle, or hobby keyword.</p>
              </div>
            )}
          </div>

          <div className="search-tag-cloud">
            {quickTags.map((tag) => (
              <button key={tag.id} onClick={() => onOpenHobby?.(tag.id)} type="button">
                #{tag.label}
              </button>
            ))}
          </div>
        </section>

        <section className="search-visual-panel" aria-labelledby="search-visual-title">
          <div className="section-heading">
            <div>
              <p id="search-visual-title">Visual results</p>
              <span>Tap a tile to explore further</span>
            </div>
          </div>

          <div className="search-visual-grid">
            {matchingPosts.length > 0 ? (
              matchingPosts.map((post, index) => {
                const mediaUrl = post.mediaUrl || post.imageUrl;

                return (
                  <button
                    className={`search-visual-tile ${index % 5 === 0 ? 'is-tall' : ''}`}
                    key={post.id}
                    onClick={() =>
                      onViewProfile?.({
                        avatar: post.avatar,
                        bio: post.caption,
                        displayName: post.creator,
                        handle: post.handle,
                        mainHobby: post.hobby,
                        uid: post.authorId,
                      })
                    }
                    type="button"
                  >
                    {mediaUrl ? (
                      <img alt={post.imageAlt || post.title} src={mediaUrl} />
                    ) : (
                      <div className={`post-art ${post.imageClass}`} role="img" aria-label={post.imageAlt || post.title} />
                    )}
                    <span>{post.hobby}</span>
                  </button>
                );
              })
            ) : (
              <div className="empty-state compact">
                <strong>No visual matches</strong>
                <p>Search a broader term to fill the grid.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
