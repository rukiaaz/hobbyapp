import { useMemo, useState } from 'react';
import HobbyTabs from '../hobbies/HobbyTabs.jsx';
import PostCard from '../posts/PostCard.jsx';

export default function HomeFeed({ categories, posts }) {
  const [activeCategoryId, setActiveCategoryId] = useState('all');

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  const filteredPosts = useMemo(() => {
    if (activeCategoryId === 'all') {
      return posts;
    }

    return posts.filter((post) => post.categoryId === activeCategoryId);
  }, [activeCategoryId, posts]);

  return (
    <section className="home-feed" aria-labelledby="home-feed-title">
      <div className="feed-hero">
        <p className="eyebrow">Home feed</p>
        <h1 id="home-feed-title">Discover today&apos;s hobby progress</h1>
        <p>
          Follow makers, athletes, artists, cooks, and collectors as they share small wins,
          experiments, and inspiration from their hobbies.
        </p>
      </div>

      <HobbyTabs
        activeCategoryId={activeCategoryId}
        categories={categories}
        onCategoryChange={setActiveCategoryId}
      />

      <div className="section-heading feed-summary">
        <p>{activeCategory.label} posts</p>
        <span>{filteredPosts.length} post{filteredPosts.length === 1 ? '' : 's'} showing</span>
      </div>

      <div className="feed-list" aria-live="polite">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="empty-state">
            <strong>No posts yet</strong>
            <p>Try another hobby category or add more mock posts later.</p>
          </div>
        )}
      </div>
    </section>
  );
}
