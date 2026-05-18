function getUserLabel(user) {
  if (!user) {
    return '';
  }

  return user.displayName || user.email || 'Signed in';
}

export default function Header({
  activeView = 'home',
  currentUser,
  isAuthenticated = false,
  onNavigate,
  onSignOut,
}) {
  const userLabel = getUserLabel(currentUser);

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
          <input type="search" placeholder="Search hobbies" />
        </label>
      ) : (
        <p className="header-helper">Sign in to unlock your hobby feed.</p>
      )}

      <nav className="nav-actions" aria-label="Primary navigation">
        {isAuthenticated ? (
          <>
            <button
              className={activeView === 'home' ? 'active' : ''}
              onClick={() => navigateTo('home')}
              type="button"
            >
              Home
            </button>
            <span className="user-chip" title={userLabel}>
              {userLabel}
            </span>
            <button onClick={onSignOut} type="button">
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              className={activeView === 'login' ? 'active' : ''}
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
