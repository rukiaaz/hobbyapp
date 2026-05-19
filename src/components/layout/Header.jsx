function getUserLabel(user, vibelyProfile) {
  if (vibelyProfile) {
    return vibelyProfile.handle;
  }

  if (!user) {
    return '';
  }

  return user.displayName || user.email || 'Setting up profile';
}

export default function Header({
  activeView = 'home',
  currentUser,
  isAuthenticated = false,
  onNavigate,
  onSearchChange,
  onSearchFocus,
  onSignOut,
  searchQuery = '',
  vibelyProfile,
}) {
  const userLabel = getUserLabel(currentUser, vibelyProfile);

  function navigateTo(view) {
    onNavigate?.(view);
  }

  return (
    <header className="top-nav">
      <button
        className="brand brand-button"
        onClick={() => navigateTo('home')}
        type="button"
        aria-label="Hobby App home"
      >
        <span className="brand-mark">H</span>
        <span>Hobby App</span>
      </button>

      {isAuthenticated ? (
        <label className="search-box">
          <span className="sr-only">Search hobbies, makers, or posts</span>
          <input
            disabled={activeView === 'onboarding'}
            onChange={(event) => onSearchChange?.(event.target.value)}
            onFocus={onSearchFocus}
            placeholder="Search hobbies, makers, posts"
            type="search"
            value={searchQuery}
          />
        </label>
      ) : (
        <p className="header-helper">Sign in to unlock your hobby feed.</p>
      )}

      <nav className="nav-actions" aria-label="Primary navigation">
        {isAuthenticated ? (
          <>
            <button
              className={`nav-home ${activeView === 'home' ? 'active' : ''}`}
              disabled={activeView === 'onboarding'}
              onClick={() => navigateTo('home')}
              type="button"
            >
              Home
            </button>
            <button
              className={`desktop-nav-button ${activeView === 'explore' ? 'active' : ''}`}
              disabled={activeView === 'onboarding'}
              onClick={() => navigateTo('explore')}
              type="button"
            >
              Explore
            </button>
            <button
              className={`desktop-nav-button ${activeView === 'create' ? 'active' : ''}`}
              disabled={activeView === 'onboarding'}
              onClick={() => navigateTo('create')}
              type="button"
            >
              Create
            </button>
            <button
              className={`desktop-nav-button ${activeView === 'messages' ? 'active' : ''}`}
              disabled={activeView === 'onboarding'}
              onClick={() => navigateTo('messages')}
              type="button"
            >
              Messages
            </button>
            <button
              className={`desktop-nav-button ${activeView === 'profile' ? 'active' : ''}`}
              disabled={activeView === 'onboarding'}
              onClick={() => navigateTo('profile')}
              type="button"
            >
              Profile
            </button>
            <span className="user-chip" title={userLabel}>
              {activeView === 'onboarding' ? 'Create Vibely profile' : userLabel}
            </span>
            <button className="signout-button" onClick={onSignOut} type="button">
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              className={`nav-login ${activeView === 'login' ? 'active' : ''}`}
              onClick={() => navigateTo('login')}
              type="button"
            >
              Log in
            </button>
            <button
              className={`primary-action ${activeView === 'signup' ? 'active' : ''}`}
              onClick={() => navigateTo('signup')}
              type="button"
            >
              Sign up
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
