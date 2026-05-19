const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <strong>{compactNumber.format(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function ProfileHeader({ editButtonLabel = 'Edit Profile', onEditProfile, profile, showEditButton = true }) {
  return (
    <section className="profile-card">
      <div className="profile-cover" />
      <div className="profile-body">
        <div className="avatar" aria-hidden="true">
          {profile.avatar}
        </div>

        <div className="profile-copy">
          <div className="profile-title-row">
            <div>
              <p className="eyebrow">Featured hobbyist</p>
              <h1>{profile.name}</h1>
              <p className="muted">{profile.username} · {profile.location}</p>
            </div>
            {showEditButton && (
              <button className="edit-profile-button" onClick={onEditProfile} type="button">
                {editButtonLabel}
              </button>
            )}
          </div>
          <p>{profile.bio}</p>

          <div className="hobby-pills" aria-label="Featured hobbies">
            {profile.featuredHobbies.map((hobby) => (
              <span key={hobby}>{hobby}</span>
            ))}
          </div>
        </div>

        <div className="profile-stats" aria-label="Profile stats">
          <Stat label="Posts" value={profile.posts} />
          <Stat label="Followers" value={profile.followers} />
          <Stat label="Following" value={profile.following} />
        </div>
      </div>
    </section>
  );
}
