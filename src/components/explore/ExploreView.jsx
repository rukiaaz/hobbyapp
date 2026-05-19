import { useMemo, useState } from 'react';
import HobbyTabs from '../hobbies/HobbyTabs.jsx';
import PostGrid from '../posts/PostGrid.jsx';

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

export default function ExploreView({ categories, feedError = '', livePosts = [], onSearchChange, posts, searchQuery = '' }) {
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const allPosts = useMemo(() => [...livePosts, ...posts], [livePosts, posts]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const categoryMatches = activeCategoryId === 'all' || post.categoryId === activeCategoryId;
      return categoryMatches && matchesSearch(post, normalizedQuery);
    });
  }, [activeCategoryId, allPosts, normalizedQuery]);

  const trendingCategories = useMemo(() => {
    return categories
      .filter((category) => category.id !== 'all')
      .map((category) => ({
        ...category,
        count: allPosts.filter((post) => post.categoryId === category.id).length,
        engagement: allPosts
          .filter((post) => post.categoryId === category.id)
          .reduce((total, post) => total + getPostEngagement(post), 0),
      }))
      .sort((first, second) => second.engagement - first.engagement);
  }, [allPosts, categories]);

  const topPosts = [...filteredPosts].sort(
    (first, second) => getPostEngagement(second) - getPostEngagement(first),
  );

  return (
    <section className="explore-view" aria-labelledby="explore-title">
      <div className="explore-hero">
        <p className="eyebrow">Explore</p>
        <h1 id="explore-title">Find your next hobby rabbit hole.</h1>
        <p>
          Search creators, browse categories, and jump into the posts getting the most love from
          the hobby community.
        </p>

        <label className="explore-search" htmlFor="explore-search-input">
          <span className="sr-only">Search posts and hobbies</span>
          <input
            id="explore-search-input"
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Try ceramics, bouldering, baking..."
            type="search"
            value={searchQuery}
          />
        </label>
      </div>

      <HobbyTabs
        activeCategoryId={activeCategoryId}
        categories={categories}
        onCategoryChange={setActiveCategoryId}
      />

      {feedError && <p className="auth-message">{feedError}</p>}

      <section className="trend-panel" aria-labelledby="trending-title">
        <div className="section-heading">
          <div>
            <p id="trending-title">Trending hobbies</p>
            <span>Tap a hobby to filter the discovery grid</span>
          </div>
        </div>

        <div className="trend-grid">
          {trendingCategories.map((category) => (
            <button
              className={`trend-card ${activeCategoryId === category.id ? 'active' : ''}`}
              key={category.id}
              onClick={() => setActiveCategoryId(category.id)}
              type="button"
            >
              <span aria-hidden="true">{category.icon}</span>
              <strong>{category.label}</strong>
              <small>{category.count} posts · {category.engagement} reactions</small>
            </button>
          ))}
        </div>
      </section>

      <section className="profile-preview" aria-labelledby="explore-results-title">
        <div className="section-heading">
          <div>
            <p id="explore-results-title">Top posts</p>
            <span>{topPosts.length} result{topPosts.length === 1 ? '' : 's'} found</span>
          </div>
        </div>

        {topPosts.length > 0 ? (
          <PostGrid posts={topPosts} />
        ) : (
          <div className="empty-state">
            <strong>No matching posts</strong>
            <p>Clear your search or choose another hobby category.</p>
          </div>
        )}
      </section>
    </section>
  );
}
