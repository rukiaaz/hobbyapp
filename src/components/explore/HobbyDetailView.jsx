import PostGrid from '../posts/PostGrid.jsx';

function getPostEngagement(post) {
  return (post.likesCount ?? post.likes ?? 0) + (post.commentsCount ?? post.comments ?? 0) + (post.shareCount ?? 0);
}

export default function HobbyDetailView({ category, onBack, onSearchChange, posts = [], searchQuery = '' }) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = posts
    .filter((post) => post.categoryId === category?.id)
    .filter((post) => {
      if (!normalizedQuery) {
        return true;
      }

      return [post.title, post.caption, post.creator, post.handle, post.hobby]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((first, second) => getPostEngagement(second) - getPostEngagement(first));

  return (
    <section className="explore-view hobby-detail-view" aria-labelledby="hobby-detail-title">
      <div className="explore-hero hobby-detail-hero">
        <div>
          <p className="eyebrow">Hobby detail</p>
          <h1 id="hobby-detail-title">{category?.icon} {category?.label || 'Hobby'} posts</h1>
          <p>Explore posts, creators, and ideas focused on this hobby category.</p>
        </div>
        <button className="text-button hero-back-button" onClick={onBack} type="button">← Back to Explore</button>
      </div>

      <label className="search-box hobby-detail-search" htmlFor="hobby-detail-search">
        <span className="sr-only">Search this hobby</span>
        <input
          id="hobby-detail-search"
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={`Search ${category?.label || 'this hobby'}`}
          type="search"
          value={searchQuery}
        />
      </label>

      <section className="profile-preview" aria-labelledby="hobby-posts-title">
        <div className="section-heading">
          <div>
            <p id="hobby-posts-title">Top {category?.label || 'hobby'} posts</p>
            <span>{filteredPosts.length} result{filteredPosts.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {filteredPosts.length > 0 ? (
          <PostGrid posts={filteredPosts} />
        ) : (
          <div className="empty-state">
            <strong>No posts found</strong>
            <p>Try a different search or check another hobby category.</p>
          </div>
        )}
      </section>
    </section>
  );
}
