import { useMemo, useState } from 'react';
import LoadingSkeleton from '../common/LoadingSkeleton.jsx';
import HobbyTabs from '../hobbies/HobbyTabs.jsx';
import PostCard from '../posts/PostCard.jsx';
import PostComposer from '../posts/PostComposer.jsx';
import {
  addPostComment,
  createLocalComment,
  recordPostShare,
  togglePostLike,
} from '../../services/posts.js';

function toMockFeedPost(post, interaction) {
  return {
    ...post,
    id: `mock-${post.id}`,
    isLive: false,
    likesCount: post.likes + (interaction?.likesDelta ?? 0),
    commentsCount: post.comments + (interaction?.comments?.length ?? 0),
    shareCount: interaction?.shareCount ?? 0,
    viewerHasLiked: interaction?.viewerHasLiked ?? false,
    viewerHasSaved: interaction?.viewerHasSaved ?? false,
    commentsPreview: interaction?.comments ?? [],
  };
}

async function sharePost(post) {
  const shareUrl = `${window.location.origin}/#post-${post.id}`;
  const shareData = {
    title: post.title,
    text: `${post.title} by ${post.creator} on Hobby App`,
    url: shareUrl,
  };

  if (navigator.share) {
    await navigator.share(shareData);
    return;
  }

  await navigator.clipboard.writeText(shareUrl);
}

export default function HomeFeed({
  categories,
  currentUser,
  feedError = '',
  followingIds = new Set(),
  isCreatingPost = false,
  isLoading = false,
  livePosts = [],
  onCreatePost,
  onDeleteComment,
  onDeletePost,
  onReport,
  onToggleSave,
  onUpdatePost,
  onViewProfile,
  posts,
  profile,
  savedPostIds = new Set(),
}) {
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [localInteractions, setLocalInteractions] = useState({});

  const feedCategories = useMemo(
    () => [categories[0], { id: 'following', label: 'Following', icon: '👥' }, ...categories.slice(1)],
    [categories],
  );

  const mockPosts = useMemo(
    () => posts.map((post) => toMockFeedPost(post, localInteractions[`mock-${post.id}`])),
    [localInteractions, posts],
  );

  const allPosts = useMemo(
    () => [...livePosts.map((post) => ({ ...post, viewerHasSaved: savedPostIds.has(post.id) })), ...mockPosts],
    [livePosts, mockPosts, savedPostIds],
  );
  const heroPosts = useMemo(
    () => allPosts.filter((post) => (post.mediaUrl || post.imageUrl) && post.mediaType !== 'video').slice(0, 3),
    [allPosts],
  );
  const totalEngagement = useMemo(
    () => allPosts.reduce((total, post) => total + (post.likesCount ?? 0) + (post.commentsCount ?? 0), 0),
    [allPosts],
  );

  const activeCategory = feedCategories.find((category) => category.id === activeCategoryId) ?? feedCategories[0];

  const filteredPosts = useMemo(() => {
    if (activeCategoryId === 'all') {
      return allPosts;
    }

    if (activeCategoryId === 'following') {
      return allPosts.filter((post) => post.authorId && followingIds.has(post.authorId));
    }

    return allPosts.filter((post) => post.categoryId === activeCategoryId);
  }, [activeCategoryId, allPosts, followingIds]);

  async function handleCreatePost(postData) {
    return onCreatePost?.(postData);
  }

  async function handleToggleLike(post) {
    if (post.isLive) {
      await togglePostLike(post.id, currentUser.uid);
      return;
    }

    setLocalInteractions((current) => {
      const previous = current[post.id] ?? {};
      const viewerHasLiked = !previous.viewerHasLiked;
      return {
        ...current,
        [post.id]: {
          ...previous,
          viewerHasLiked,
          likesDelta: viewerHasLiked ? 1 : 0,
        },
      };
    });
  }

  async function handleToggleSave(post) {
    if (post.isLive) {
      await onToggleSave?.(post);
      return;
    }

    setLocalInteractions((current) => {
      const previous = current[post.id] ?? {};
      return {
        ...current,
        [post.id]: {
          ...previous,
          viewerHasSaved: !previous.viewerHasSaved,
        },
      };
    });
  }

  async function handleAddComment(post, text) {
    if (post.isLive) {
      await addPostComment(post.id, currentUser, profile, text);
      return;
    }

    setLocalInteractions((current) => {
      const previous = current[post.id] ?? {};
      return {
        ...current,
        [post.id]: {
          ...previous,
          comments: [...(previous.comments ?? []), createLocalComment(currentUser, profile, text)],
        },
      };
    });
  }

  async function handleShare(post) {
    try {
      await sharePost(post);

      if (post.isLive) {
        await recordPostShare(post.id);
        return;
      }

      setLocalInteractions((current) => {
        const previous = current[post.id] ?? {};
        return {
          ...current,
          [post.id]: {
            ...previous,
            shareCount: (previous.shareCount ?? 0) + 1,
          },
        };
      });
    } catch {
      // User cancelled native share dialog or clipboard failed; no UI interruption needed.
    }
  }

  return (
    <section className="home-feed" aria-labelledby="home-feed-title">
      <div className="feed-hero">
        <div className="feed-hero-copy">
          <p className="eyebrow">Home feed</p>
          <h1 id="home-feed-title">Discover today&apos;s hobby progress</h1>
          <p>
            Follow makers, athletes, artists, cooks, and collectors as they share small wins,
            experiments, and inspiration from their hobbies.
          </p>
          <div className="hero-metrics" aria-label="Feed activity summary">
            <span><strong>{allPosts.length}</strong> fresh posts</span>
            <span><strong>{totalEngagement}</strong> reactions</span>
            <span><strong>{categories.length - 1}</strong> hobbies</span>
          </div>
        </div>

        <div className="hero-media-stack" aria-hidden="true">
          {heroPosts.map((post, index) => (
            <article className="hero-photo-card" key={post.id} style={{ '--card-index': index }}>
              <img alt="" src={post.mediaUrl || post.imageUrl} />
              <span>{post.hobby}</span>
            </article>
          ))}
        </div>
      </div>

      <PostComposer
        categories={categories}
        isSubmitting={isCreatingPost}
        onCreatePost={handleCreatePost}
        profile={profile}
      />

      {feedError && <p className="auth-message">{feedError}</p>}

      <HobbyTabs
        activeCategoryId={activeCategoryId}
        categories={feedCategories}
        onCategoryChange={setActiveCategoryId}
      />

      <div className="section-heading feed-summary">
        <p>{activeCategory.label} posts</p>
        <span>{filteredPosts.length} post{filteredPosts.length === 1 ? '' : 's'} showing</span>
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} type="feed" />
      ) : (
        <div className="feed-list" aria-live="polite">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard
                categories={categories}
                currentUser={currentUser}
                key={post.id}
                onAddComment={handleAddComment}
                onDeleteComment={onDeleteComment}
                onDeletePost={onDeletePost}
                onReport={onReport}
                onShare={handleShare}
                onToggleLike={handleToggleLike}
                onToggleSave={handleToggleSave}
                onUpdatePost={onUpdatePost}
                onViewProfile={onViewProfile}
                post={post}
                profile={profile}
              />
            ))
          ) : (
            <div className="empty-state">
              <strong>No posts yet</strong>
              <p>Try another hobby category, follow creators, or create the first post for this hobby.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
