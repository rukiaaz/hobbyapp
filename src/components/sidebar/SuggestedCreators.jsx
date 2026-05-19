import { useMemo, useState } from 'react';

export default function SuggestedCreators({ creators, onViewCreator }) {
  const [followedCreatorIds, setFollowedCreatorIds] = useState(() => new Set());
  const [rotationOffset, setRotationOffset] = useState(0);

  const visibleCreators = useMemo(() => {
    if (creators.length === 0) {
      return [];
    }

    return creators.map((_, index) => creators[(index + rotationOffset) % creators.length]);
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
    <section className="suggested-card">
      <div className="section-heading">
        <div>
          <p>Suggested creators</p>
          <span>{followedCreatorIds.size} following from this list</span>
        </div>
        <button type="button" onClick={() => setRotationOffset((offset) => offset + 1)}>Refresh</button>
      </div>

      <div className="creator-list">
        {visibleCreators.map((creator) => {
          const isFollowing = followedCreatorIds.has(creator.id);

          return (
            <article className="creator-row" key={creator.id}>
              <div className="mini-avatar media-avatar" aria-hidden="true">
                {creator.imageUrl ? <img alt="" src={creator.imageUrl} /> : creator.name.slice(0, 1)}
              </div>
              <button
                className="creator-copy-button"
                onClick={() => onViewCreator?.({
                  avatar: creator.name.slice(0, 1),
                  bio: `${creator.hobby} creator on Hobby App.`,
                  displayName: creator.name,
                  handle: creator.handle,
                  mainHobby: creator.hobby,
                })}
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
