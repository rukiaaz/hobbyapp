import AppIcon from '../common/AppIcon.jsx';

const signedInItems = [
  { label: 'Home', view: 'home', icon: 'home' },
  { label: 'Search', view: 'search', icon: 'search' },
  { label: 'Explore', view: 'explore', icon: 'compass' },
  { label: 'Reels', view: 'reels', icon: 'reels' },
  { label: 'Create', view: 'create', icon: 'create' },
  { label: 'Messages', view: 'messages', icon: 'messages' },
  { label: 'Notifications', view: 'notifications', icon: 'heart' },
  { label: 'Profile', view: 'profile', icon: 'user' },
  { label: 'More', view: 'settings', icon: 'settings' },
];

function getUserLabel(user, vibelyProfile) {
  if (vibelyProfile?.handle) {
    return vibelyProfile.handle;
  }

  if (!user) {
    return '';
  }

  return user.displayName || user.email || 'Profile';
}

function QuickAction({ active = false, badge = 0, icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      className={`quick-action ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <AppIcon name={icon} size={20} />
      {badge > 0 && <span className="notification-badge">{badge}</span>}
    </button>
  );
}

export default function Header({
  activeView = 'home',
  currentUser,
  isAuthenticated = false,
  notificationCount = 0,
  onNavigate,
  onSearchChange,
  onSearchCommit,
  onSearchFocus,
  onSignOut,
  searchQuery = '',
  vibelyProfile,
}) {
  const userLabel = getUserLabel(currentUser, vibelyProfile);
  const isSignedInShell = isAuthenticated && activeView !== 'onboarding';

  function navigateTo(view) {
    onNavigate?.(view);
  }

  if (isSignedInShell) {
    return (
      <>
        <aside className="desktop-sidebar">
          <button
            className="brand brand-button vibely-brand"
            onClick={() => navigateTo('home')}
            type="button"
            aria-label="Vibely home"
          >
            <span className="brand-mark">V</span>
            <span className="brand-wordmark">Vibely</span>
          </button>

          <nav className="desktop-sidebar-nav" aria-label="Primary navigation">
            {signedInItems.map((item) => {
              const isActive = item.view === activeView;
              return (
                <button
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  key={item.view}
                  onClick={() => navigateTo(item.view)}
                  type="button"
                >
                  <AppIcon name={item.icon} size={21} />
                  <span>{item.label}</span>
                  {item.view === 'notifications' && notificationCount > 0 && (
                    <span className="notification-badge">{notificationCount}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="desktop-sidebar-footer">
            <button className="sidebar-profile-preview" onClick={() => navigateTo('profile')} type="button">
              <span className="mini-avatar" aria-hidden="true">
                {vibelyProfile?.avatar || currentUser?.email?.slice(0, 1).toUpperCase() || 'V'}
              </span>
              <span>
                <strong>{vibelyProfile?.displayName || currentUser?.displayName || 'Vibely user'}</strong>
                <small>{userLabel}</small>
              </span>
            </button>

            <button className="sidebar-signout" onClick={onSignOut} type="button">
              <AppIcon name="logout" size={19} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <header className="desktop-topbar">
          <label className="search-box desktop-search-box">
            <AppIcon className="search-box-icon" name="search" size={18} />
            <span className="sr-only">Search hobbies, makers, or posts</span>
            <input
              onChange={(event) => onSearchChange?.(event.target.value)}
              onFocus={onSearchFocus}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSearchCommit?.(event.currentTarget.value);
                }
              }}
              placeholder="Search creators, hobbies, and posts"
              type="search"
              value={searchQuery}
            />
          </label>

          <div className="desktop-topbar-actions">
            <QuickAction
              active={activeView === 'search'}
              icon="search"
              label="Search"
              onClick={() => navigateTo('search')}
            />
            <QuickAction
              active={activeView === 'messages'}
              icon="messages"
              label="Messages"
              onClick={() => navigateTo('messages')}
            />
            <QuickAction
              active={activeView === 'notifications'}
              badge={notificationCount}
              icon="heart"
              label="Notifications"
              onClick={() => navigateTo('notifications')}
            />
            <button className="topbar-avatar" onClick={() => navigateTo('profile')} type="button">
              <span className="mini-avatar" aria-hidden="true">
                {vibelyProfile?.avatar || currentUser?.email?.slice(0, 1).toUpperCase() || 'V'}
              </span>
            </button>
          </div>
        </header>

        <header className="mobile-topbar">
          <button className="brand brand-button vibely-brand" onClick={() => navigateTo('home')} type="button">
            <span className="brand-wordmark">Vibely</span>
          </button>

          <div className="mobile-topbar-actions">
            <QuickAction
              active={activeView === 'messages'}
              icon="messages"
              label="Messages"
              onClick={() => navigateTo('messages')}
            />
            <QuickAction
              badge={notificationCount}
              icon="heart"
              label="Notifications"
              onClick={() => navigateTo('notifications')}
            />
          </div>
        </header>
      </>
    );
  }

  return (
    <header className={`top-nav ${isAuthenticated ? 'signed-in-nav' : 'signed-out-nav'}`}>
      <button
        className="brand brand-button vibely-brand"
        onClick={() => navigateTo('home')}
        type="button"
        aria-label="Vibely home"
      >
        <span className="brand-mark">V</span>
        <span className="brand-wordmark">Vibely</span>
      </button>

      {isAuthenticated ? (
        <label className="search-box">
          <span className="sr-only">Search hobbies, makers, or posts</span>
          <input
            disabled={activeView === 'onboarding'}
            onChange={(event) => onSearchChange?.(event.target.value)}
            onFocus={onSearchFocus}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSearchCommit?.(event.currentTarget.value);
              }
            }}
            placeholder="Search hobbies, makers, and posts"
            type="search"
            value={searchQuery}
          />
        </label>
      ) : (
        <p className="header-helper">Sign in to unlock your Vibely feed.</p>
      )}

      <nav className="nav-actions" aria-label="Primary navigation">
        {isAuthenticated ? (
          <>
            <button
              className={`desktop-nav-button ${activeView === 'profile' ? 'active' : ''}`}
              disabled={activeView === 'onboarding'}
              onClick={() => navigateTo('profile')}
              type="button"
            >
              Profile
            </button>
            <button className="signout-button" onClick={onSignOut} type="button">
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              className={`nav-login ${activeView === 'login' || activeView === 'recover' || activeView === 'recover-sent' || activeView === 'reset' ? 'active' : ''}`}
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
