import PostGrid from '../posts/PostGrid.jsx';
import ProfileHeader from './ProfileHeader.jsx';

function toHeaderProfile(profile, fallbackPostsCount = 0) {
  return {
    avatar: profile?.avatar || profile?.displayName?.slice(0, 1) || '?',
    bio: profile?.bio || 'Vibely creator sharing progress and inspiration.',
    featuredHobbies: profile?.interests?.length ? profile.interests : [profile?.mainHobby || 'Hobbies'],
    followers: profile?.followersCount ?? 0,
    following: profile?.followingCount ?? 0,
    location: 'Vibely',
    name: profile?.displayName || profile?.name || 'Creator',
    posts: profile?.postsCount ?? fallbackPostsCount,
    username: profile?.handle || profile?.username || '@creator',
  };
}

export default function PublicProfileView({
  currentUser,
  followingIds = new Set(),
  isBlocked = false,
  onBack,
  onBlock,
  onFollow,
  onReport,
  posts = [],
  profile,
}) {
  const isOwnProfile = profile?.uid && profile.uid === currentUser?.uid;
  const canFollow = profile?.uid && !isOwnProfile;
  const isFollowing = profile?.uid && followingIds.has(profile.uid);
  const isPrivate = profile?.privacy?.profileVisibility === 'private' && !isOwnProfile && !isFollowing;

  return (
    <section className="profile-view public-profile-view" aria-labelledby="public-profile-title">
      <div className="section-heading profile-view-heading">
        <div>
          <p id="public-profile-title">Public profile</p>
          <span>View posts, profile details, and safety actions.</span>
        </div>
        <button className="text-button" onClick={onBack} type="button">← Back</button>
      </div>

      <ProfileHeader profile={toHeaderProfile(profile, posts.length)} showEditButton={false} />

      <div className="public-profile-actions">
        {canFollow && (
          <button className="auth-submit" onClick={() => onFollow?.(profile)} type="button">
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        {profile?.uid && !isOwnProfile && (
          <button className="text-button" onClick={() => onBlock?.(profile)} type="button">
            {isBlocked ? 'Unblock user' : 'Block user'}
          </button>
        )}
        <button className="text-button" onClick={() => onReport?.('user', profile?.uid || profile?.handle || profile?.displayName)} type="button">
          Report
        </button>
      </div>

      {isBlocked ? (
        <div className="empty-state">
          <strong>User blocked</strong>
          <p>You can unblock them from this profile if you want to see their content again.</p>
        </div>
      ) : isPrivate ? (
        <div className="empty-state">
          <strong>Private profile</strong>
          <p>Follow this creator to request a closer look at their hobby posts.</p>
        </div>
      ) : (
        <section className="profile-preview" aria-labelledby="public-profile-posts-title">
          <div className="section-heading">
            <div>
              <p id="public-profile-posts-title">Posts</p>
              <span>{posts.length} live post{posts.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {posts.length > 0 ? (
            <PostGrid posts={posts} />
          ) : (
            <div className="empty-state">
              <strong>No live posts yet</strong>
              <p>This creator has not posted live media yet.</p>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
