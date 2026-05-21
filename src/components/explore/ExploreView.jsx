import { useMemo, useState } from 'react';
import LoadingSkeleton from '../common/LoadingSkeleton.jsx';

function getPostEngagement(post) {
  return (post.likesCount ?? post.likes ?? 0) + (post.commentsCount ?? post.comments ?? 0);
}

function matchesSearch(post, query) {
  if (!query) {
    return true;
  }

  return [post.title, post.caption, post.creator, post.handle, post.hobby]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

export default function ExploreView({
  categories = [],
  feedError = '',
  isLoading = false,
  livePosts = [],
  onOpenHobby,
  onSearchChange,
  onSearchCommit,
  onViewProfile,
  posts = [],
  searchQuery = '',
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const allPosts = useMemo(() => [...livePosts, ...posts], [livePosts, posts]);

  const filterChips = useMemo(
    () => [
      { id: 'all', label: 'For you' },
      ...categories.filter((category) => category.id !== 'all').slice(0, 6).map((category) => ({
        id: category.id,
        label: category.label,
      })),
    ],
    [categories],
  );

  const filteredPosts = useMemo(() => {
    return allPosts
      .filter((post) => activeFilter === 'all' || post.categoryId === activeFilter)
      .filter((post) => matchesSearch(post, normalizedQuery))
      .sort((first, second) => getPostEngagement(second) - getPostEngagement(first));
  }, [activeFilter, allPosts, normalizedQuery]);

  return (
    <section className="explore-view" aria-labelledby="explore-title">
      <div className="explore-wireframe-header">
        <div>
          <p className="eyebrow">Explore</p>
          <h1 id="explore-title">Browse visual corners of Vibely.</h1>
        </div>

        <form
          className="explore-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchCommit?.(searchQuery);
          }}
        >
          <label className="explore-search" htmlFor="explore-search-input">
            <span className="sr-only">Search explore posts</span>
            <input
              id="explore-search-input"
              onBlur={() => onSearchCommit?.(searchQuery)}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search"
              type="search"
              value={searchQuery}
            />
          </label>
        </form>
      </div>

      <div className="explore-chip-row" aria-label="Explore filters">
        {filterChips.map((chip) => (
          <button
            className={chip.id === activeFilter ? 'active' : ''}
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {feedError && <p className="auth-message">{feedError}</p>}

      {isLoading ? (
        <LoadingSkeleton count={3} type="explore" />
      ) : (
        <div className="explore-masonry-grid">
          {filteredPosts.length > 0 ? (
            filteredPosts.slice(0, 15).map((post, index) => {
              const mediaUrl = post.mediaUrl || post.imageUrl;
              const isLarge = index % 7 === 0 || index % 7 === 4;

              return (
                <button
                  className={`explore-masonry-tile ${isLarge ? 'large' : ''}`}
                  key={post.id}
                  onClick={() => onOpenHobby?.(post.categoryId)}
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
            <div className="empty-state">
              <strong>No matching posts</strong>
              <p>Clear your search or switch to another category.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
