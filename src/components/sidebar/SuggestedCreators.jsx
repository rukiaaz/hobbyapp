import { useMemo, useState } from 'react';

export default function SuggestedCreators({ creators, onOpenProfile, onViewCreator, profile }) {
  const [followedCreatorIds, setFollowedCreatorIds] = useState(() => new Set());
  const [rotationOffset, setRotationOffset] = useState(0);

  const visibleCreators = useMemo(() => {
    if (creators.length === 0) {
      return [];
    }

    return creators.map((_, index) => creators[(index + rotationOffset) % creators.length]).slice(0, 5);
  }, [creators, rotationOffset]);

  function toggleFollow(creatorId) {
    setFollowedCreatorIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(creatorId)) {
        nextIds.delete(creatorId);
      } else {
        nextIds.add(creatorId);
      }

      return nextIds;
    });
  }

  return (
    <section className="suggested-card vibe-sidebar-card">
      {profile && (
        <div className="sidebar-account">
          <button className="sidebar-account-main" onClick={onOpenProfile} type="button">
            <span className="avatar sidebar-account-avatar" aria-hidden="true">
              {profile.avatar}
            </span>
            <span>
              <strong>{profile.name}</strong>
              <small>{profile.username}</small>
            </span>
          </button>
          <button className="text-button sidebar-account-link" onClick={onOpenProfile} type="button">
            View
          </button>
        </div>
      )}

      <div className="section-heading">
        <div>
          <p>Suggested for you</p>
          <span>{followedCreatorIds.size} followed from this list</span>
        </div>
        <button type="button" onClick={() => setRotationOffset((offset) => offset + 1)}>
          Refresh
        </button>
      </div>

      <div className="creator-list">
        {visibleCreators.map((creator) => {
          const isFollowing = followedCreatorIds.has(creator.id);

          return (
            <article className="creator-row creator-row-compact" key={creator.id}>
              <div className="mini-avatar media-avatar" aria-hidden="true">
                {creator.imageUrl ? <img alt="" src={creator.imageUrl} /> : creator.name.slice(0, 1)}
              </div>
              <button
                className="creator-copy-button"
                onClick={() =>
                  onViewCreator?.({
                    avatar: creator.name.slice(0, 1),
                    bio: `${creator.hobby} creator on Vibely.`,
                    displayName: creator.name,
                    handle: creator.handle,
                    mainHobby: creator.hobby,
                  })
                }
                type="button"
              >
                <strong>{creator.name}</strong>
                <p>{creator.handle} · {creator.hobby}</p>
                <span>{creator.followers} followers</span>
              </button>
              <button
                className={isFollowing ? 'following' : ''}
                onClick={() => toggleFollow(creator.id)}
                type="button"
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
