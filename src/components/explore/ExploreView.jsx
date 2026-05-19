import { useMemo, useState } from 'react';
import LoadingSkeleton from '../common/LoadingSkeleton.jsx';
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

function userMatchesSearch(user, query) {
  if (!query) {
    return true;
  }

  return [user.displayName, user.handle, user.mainHobby, user.bio]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

export default function ExploreView({
  categories,
  feedError = '',
  isLoading = false,
  livePosts = [],
  onOpenHobby,
  onRemoveSearchHistory,
  onSearchChange,
  onSearchCommit,
  onViewProfile,
  posts,
  searchHistory = [],
  searchQuery = '',
  userProfiles = [],
}) {
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [resultType, setResultType] = useState('all');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const allPosts = useMemo(() => [...livePosts, ...posts], [livePosts, posts]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const categoryMatches = activeCategoryId === 'all' || post.categoryId === activeCategoryId;
      return categoryMatches && matchesSearch(post, normalizedQuery);
    });
  }, [activeCategoryId, allPosts, normalizedQuery]);

  const filteredPeople = useMemo(
    () => userProfiles.filter((user) => userMatchesSearch(user, normalizedQuery)),
    [normalizedQuery, userProfiles],
  );

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

  const showPosts = resultType === 'all' || resultType === 'posts';
  const showPeople = resultType === 'all' || resultType === 'people';
  const showHobbies = resultType === 'all' || resultType === 'hobbies';

  return (
    <section className="explore-view" aria-labelledby="explore-title">
      <div className="explore-hero">
        <p className="eyebrow">Explore</p>
        <h1 id="explore-title">Find your next hobby rabbit hole.</h1>
        <p>
          Search creators, browse categories, and jump into the posts getting the most love from
          the hobby community.
        </p>

        <form
          className="explore-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchCommit?.(searchQuery);
          }}
        >
          <label className="explore-search" htmlFor="explore-search-input">
            <span className="sr-only">Search posts and hobbies</span>
            <input
              id="explore-search-input"
              onBlur={() => onSearchCommit?.(searchQuery)}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Try ceramics, bouldering, baking..."
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
              <button onClick={() => { onSearchChange?.(term); onSearchCommit?.(term); }} type="button">
                {term}
              </button>
              <button onClick={() => onRemoveSearchHistory?.(term)} type="button" aria-label={`Remove ${term} from search history`}>×</button>
            </span>
          ))}
        </section>
      )}

      <div className="filter-switcher" aria-label="Explore result filters">
        {[
          ['all', 'All'],
          ['posts', 'Posts'],
          ['people', 'People'],
          ['hobbies', 'Hobbies'],
        ].map(([id, label]) => (
          <button className={resultType === id ? 'active' : ''} key={id} onClick={() => setResultType(id)} type="button">
            {label}
          </button>
        ))}
      </div>

      <HobbyTabs
        activeCategoryId={activeCategoryId}
        categories={categories}
        onCategoryChange={setActiveCategoryId}
      />

      {feedError && <p className="auth-message">{feedError}</p>}

      {isLoading ? (
        <LoadingSkeleton count={3} type="explore" />
      ) : (
        <>
          {showHobbies && (
            <section className="trend-panel" aria-labelledby="trending-title">
              <div className="section-heading">
                <div>
                  <p id="trending-title">Trending hobbies</p>
                  <span>Tap a hobby to open its detail page</span>
                </div>
              </div>

              <div className="trend-grid">
                {trendingCategories.map((category) => (
                  <button
                    className={`trend-card ${activeCategoryId === category.id ? 'active' : ''}`}
                    key={category.id}
                    onClick={() => onOpenHobby?.(category.id)}
                    type="button"
                  >
                    <span aria-hidden="true">{category.icon}</span>
                    <strong>{category.label}</strong>
                    <small>{category.count} posts · {category.engagement} reactions</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {showPeople && (
            <section className="profile-preview" aria-labelledby="people-results-title">
              <div className="section-heading">
                <div>
                  <p id="people-results-title">People</p>
                  <span>{filteredPeople.length} creator{filteredPeople.length === 1 ? '' : 's'} found</span>
                </div>
              </div>

              {filteredPeople.length > 0 ? (
                <div className="people-results-grid">
                  {filteredPeople.slice(0, 6).map((user) => (
                    <button className="people-result-card" key={user.uid} onClick={() => onViewProfile?.(user)} type="button">
                      <span className="mini-avatar" aria-hidden="true">{user.avatar || user.displayName.slice(0, 1)}</span>
                      <strong>{user.displayName}</strong>
                      <small>{user.handle} · {user.mainHobby}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <strong>No people found</strong>
                  <p>Try searching a display name, handle, or hobby.</p>
                </div>
              )}
            </section>
          )}

          {showPosts && (
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
          )}
        </>
      )}
    </section>
  );
}
