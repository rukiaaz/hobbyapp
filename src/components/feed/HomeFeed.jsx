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

function getStoryMedia(post) {
  return post.mediaUrl || post.imageUrl || '';
}

async function sharePost(post) {
  const shareUrl = `${window.location.origin}/#post-${post.id}`;
  const shareData = {
    title: post.title,
    text: `${post.title} by ${post.creator} on Vibely`,
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
    () => [{ id: 'all', label: 'For you' }, { id: 'following', label: 'Following' }, ...categories.slice(1)],
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

  const storyProfiles = useMemo(() => {
    const seen = new Set();
    const stories = [];

    if (profile) {
      stories.push({
        avatar: profile.avatar,
        id: `self-${profile.uid || profile.handle || profile.displayName}`,
        isSelf: true,
        label: 'You',
        name: profile.displayName,
      });
    }

    allPosts.forEach((post) => {
      const storyId = post.authorId || post.handle || post.creator;

      if (!storyId || seen.has(storyId)) {
        return;
      }

      seen.add(storyId);
      stories.push({
        avatar: post.avatar || post.creator.slice(0, 1),
        handle: post.handle,
        hobby: post.hobby,
        id: storyId,
        imageUrl: getStoryMedia(post),
        label: (post.handle || post.creator).replace(/^@/, ''),
        name: post.creator,
        profile: {
          avatar: post.avatar,
          bio: post.caption,
          displayName: post.creator,
          handle: post.handle,
          mainHobby: post.hobby,
          uid: post.authorId,
        },
      });
    });

    return stories.slice(0, 8);
  }, [allPosts, profile]);

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
    <section className="home-feed vibe-feed" aria-labelledby="home-feed-title">
      <div className="feed-intro-card">
        <div>
          <p className="eyebrow">Vibely feed</p>
          <h1 id="home-feed-title">Your circle is making things.</h1>
        </div>
        <p>
          Scroll hobby progress, save ideas, and drop quick encouragement while everything stays
          light, visual, and easy to scan.
        </p>
      </div>

      <section className="story-strip" aria-label="Creator stories">
        {storyProfiles.map((story) => (
          <button
            className={`story-pill ${story.isSelf ? 'is-self' : ''}`}
            key={story.id}
            onClick={() => {
              if (story.isSelf) {
                return;
              }

              onViewProfile?.(story.profile);
            }}
            type="button"
          >
            <span className="story-ring">
              <span className="story-avatar" aria-hidden="true">
                {story.imageUrl ? <img alt="" src={story.imageUrl} /> : story.avatar}
              </span>
            </span>
            <span>{story.label}</span>
          </button>
        ))}
      </section>

      <PostComposer
        categories={categories}
        isSubmitting={isCreatingPost}
        onCreatePost={handleCreatePost}
        profile={profile}
      />

      {feedError && <p className="auth-message">{feedError}</p>}

      <div className="feed-filter-row">
        <HobbyTabs
          activeCategoryId={activeCategoryId}
          categories={feedCategories}
          onCategoryChange={setActiveCategoryId}
        />
        <div className="feed-summary">
          <p>{activeCategory.label}</p>
          <span>{filteredPosts.length} posts</span>
        </div>
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
              <p>Try another category, follow more creators, or share the first update.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
