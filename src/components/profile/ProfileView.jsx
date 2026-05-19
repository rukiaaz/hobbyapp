import { useMemo, useState } from 'react';
import PostGrid from '../posts/PostGrid.jsx';
import ProfileHeader from './ProfileHeader.jsx';

function getUsernameValue(profile) {
  return (profile?.username || profile?.handle || '').replace(/^@+/, '');
}

export default function ProfileView({ appProfile, errorMessage = '', onUpdateProfile, posts, profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const hobbyOptions = useMemo(() => {
    const hobbies = new Set([profile?.mainHobby, ...posts.map((post) => post.hobby)].filter(Boolean));
    return [...hobbies];
  }, [posts, profile?.mainHobby]);

  const relatedPosts = useMemo(() => {
    const mainHobby = profile?.mainHobby?.toLowerCase();

    if (!mainHobby) {
      return posts.slice(0, 6);
    }

    const matches = posts.filter((post) => post.hobby.toLowerCase().includes(mainHobby));
    return matches.length > 0 ? matches : posts.slice(0, 6);
  }, [posts, profile?.mainHobby]);

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const displayName = formData.get('displayName').trim();
    const username = formData.get('username').trim().replace(/^@+/, '').toLowerCase();
    const mainHobby = formData.get('mainHobby').trim();
    const bio = formData.get('bio').trim();

    if (!displayName || !mainHobby || !bio) {
      setLocalError('Display name, main hobby, and bio cannot be blank.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setLocalError('Username must be 3-20 characters and can only use lowercase letters, numbers, and underscores.');
      return;
    }

    setLocalError('');
    setIsSaving(true);

    const didSave = await onUpdateProfile?.({
      displayName,
      username,
      mainHobby,
      bio,
    });

    setIsSaving(false);

    if (didSave) {
      setIsEditing(false);
    }
  }

  return (
    <section className="profile-view" aria-labelledby="profile-view-title">
      <div className="section-heading profile-view-heading">
        <div>
          <p id="profile-view-title">Your profile</p>
          <span>Polish the identity other hobbyists see.</span>
        </div>
      </div>

      <ProfileHeader
        editButtonLabel={isEditing ? 'Close editor' : 'Edit profile'}
        onEditProfile={() => setIsEditing((editing) => !editing)}
        profile={appProfile}
      />

      {isEditing && (
        <section className="profile-edit-card" aria-label="Edit profile form">
          <div className="auth-card-header">
            <p className="eyebrow">Profile details</p>
            <h2>Update your Vibely profile</h2>
            <p>Changes save to Firestore and refresh your creator card across Hobby App.</p>
          </div>

          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <label className="auth-field" htmlFor="profile-display-name">
              <span>Display name</span>
              <input
                defaultValue={profile?.displayName ?? ''}
                id="profile-display-name"
                maxLength="50"
                name="displayName"
                required
              />
            </label>

            <label className="auth-field" htmlFor="profile-username">
              <span>Username</span>
              <input
                defaultValue={getUsernameValue(profile)}
                id="profile-username"
                maxLength="20"
                minLength="3"
                name="username"
                pattern="[a-z0-9_]{3,20}"
                required
              />
              <small>Use 3-20 lowercase letters, numbers, or underscores.</small>
            </label>

            <label className="auth-field" htmlFor="profile-main-hobby">
              <span>Main hobby</span>
              <select id="profile-main-hobby" name="mainHobby" defaultValue={profile?.mainHobby ?? ''} required>
                {hobbyOptions.map((hobby) => (
                  <option key={hobby}>{hobby}</option>
                ))}
              </select>
            </label>

            <label className="auth-field" htmlFor="profile-bio">
              <span>Short bio</span>
              <textarea
                defaultValue={profile?.bio ?? ''}
                id="profile-bio"
                maxLength="140"
                name="bio"
                required
                rows="4"
              />
            </label>

            {(localError || errorMessage) && <p className="auth-message">{localError || errorMessage}</p>}

            <div className="profile-edit-actions">
              <button className="text-button" onClick={() => setIsEditing(false)} type="button">
                Cancel
              </button>
              <button className="auth-submit" disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="insight-grid" aria-label="Profile quick stats">
        <article className="insight-card">
          <span>Primary hobby</span>
          <strong>{profile?.mainHobby}</strong>
          <p>Used to prefill new post drafts and introduce you in chat.</p>
        </article>
        <article className="insight-card">
          <span>Creator handle</span>
          <strong>{profile?.handle}</strong>
          <p>Shown on posts, comments, and messages.</p>
        </article>
        <article className="insight-card">
          <span>Profile status</span>
          <strong>Live</strong>
          <p>Your Vibely profile is connected to Firebase Auth.</p>
        </article>
      </section>

      <section className="profile-preview" aria-labelledby="profile-inspiration-title">
        <div className="section-heading">
          <div>
            <p id="profile-inspiration-title">Inspiration for your next post</p>
            <span>Based on your current hobby profile</span>
          </div>
        </div>
        <PostGrid posts={relatedPosts} />
      </section>
    </section>
  );
}
