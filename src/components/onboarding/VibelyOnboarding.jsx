import { useState } from 'react';

const hobbyOptions = [
  'Ceramics',
  'Trail Running',
  'Music Production',
  'Houseplants',
  'Baking',
  'Urban Sketching',
  'Woodworking',
  'Bouldering',
];

function getSuggestedName(user) {
  return user?.displayName || user?.email?.split('@').at(0) || '';
}

function getSuggestedUsername(user) {
  return getSuggestedName(user)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export default function VibelyOnboarding({ errorMessage = '', onComplete, onSignOut, user }) {
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const displayName = formData.get('displayName').trim();
    const username = formData.get('username').trim().replace(/^@+/, '').toLowerCase();
    const mainHobby = formData.get('mainHobby').trim();
    const bio = formData.get('bio').trim();

    if (!displayName || !mainHobby || !bio) {
      setError('Display name, main hobby, and bio cannot be blank.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters and can only use lowercase letters, numbers, and underscores.');
      return;
    }

    setError('');
    onComplete?.({
      displayName,
      username,
      mainHobby,
      bio,
    });
  }

  return (
    <main className="onboarding-layout" aria-labelledby="onboarding-title">
      <section className="onboarding-hero">
        <p className="eyebrow">Vibely account</p>
        <h1 id="onboarding-title">How should people know you?</h1>
        <p>
          Your Firebase login is ready. Now create your Vibely profile so other hobbyists know
          what to call you, what you make, and what you are excited to share.
        </p>
      </section>

      <section className="onboarding-card" aria-label="Create Vibely account form">
        <div className="auth-card-header">
          <p className="eyebrow">Profile setup</p>
          <h2>Create your Vibely account</h2>
          <p>This profile is shown inside Hobby App after sign-in.</p>
        </div>

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <label className="auth-field" htmlFor="display-name">
            <span>What should people call you?</span>
            <input
              autoComplete="name"
              defaultValue={getSuggestedName(user)}
              id="display-name"
              name="displayName"
              placeholder="Avery Stone"
              required
            />
          </label>

          <label className="auth-field" htmlFor="username">
            <span>Choose a username</span>
            <input
              autoComplete="username"
              defaultValue={getSuggestedUsername(user)}
              id="username"
              maxLength="20"
              minLength="3"
              name="username"
              pattern="[a-z0-9_]{3,20}"
              placeholder="averymakes"
              required
            />
            <small>Use 3-20 lowercase letters, numbers, or underscores.</small>
          </label>

          <label className="auth-field" htmlFor="main-hobby">
            <span>Main hobby</span>
            <select id="main-hobby" name="mainHobby" defaultValue="" required>
              <option value="" disabled>
                Pick your main hobby
              </option>
              {hobbyOptions.map((hobby) => (
                <option key={hobby}>{hobby}</option>
              ))}
            </select>
          </label>

          <label className="auth-field" htmlFor="bio">
            <span>Short bio</span>
            <textarea
              id="bio"
              maxLength="140"
              name="bio"
              placeholder="Weekend ceramicist sharing progress, experiments, and tiny wins."
              rows="4"
              required
            />
          </label>

          {(error || errorMessage) && <p className="auth-message">{error || errorMessage}</p>}

          <button className="auth-submit" type="submit">
            Create Vibely account
          </button>
        </form>

        <button className="text-button onboarding-signout" onClick={onSignOut} type="button">
          Not now — sign out
        </button>
      </section>
    </main>
  );
}
