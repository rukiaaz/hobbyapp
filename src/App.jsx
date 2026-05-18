import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { hobbyCategories, posts, suggestedCreators, userProfile } from './data/mockData.js';
import AuthPage from './components/auth/AuthPage.jsx';
import HomeFeed from './components/feed/HomeFeed.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Header from './components/layout/Header.jsx';
import PostGrid from './components/posts/PostGrid.jsx';
import ProfileHeader from './components/profile/ProfileHeader.jsx';
import SuggestedCreators from './components/sidebar/SuggestedCreators.jsx';
import { auth } from './services/firebase.js';

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const isSignedIn = Boolean(currentUser);
  const activeView = isSignedIn ? 'home' : authMode;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  function handleNavigate(view) {
    if (view === 'home') {
      if (!isSignedIn) {
        setAuthMode('login');
      }

      return;
    }

    setAuthMode(view);
  }

  async function handleSignOut() {
    await signOut(auth);
    setAuthMode('login');
  }

  if (!isAuthReady) {
    return (
      <div className="app-shell">
        <Header activeView="loading" isAuthenticated={false} onNavigate={handleNavigate} />
        <main className="auth-loading" aria-live="polite">
          <p>Loading Hobby App...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        activeView={activeView}
        currentUser={currentUser}
        isAuthenticated={isSignedIn}
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
      />

      {isSignedIn ? (
        <main className="layout">
          <section className="main-column" aria-label="Home screen">
            <HomeFeed categories={hobbyCategories} posts={posts} />

            <section className="profile-preview" aria-labelledby="profile-preview-title">
              <div className="section-heading">
                <p id="profile-preview-title">Profile preview</p>
                <button type="button">View profile</button>
              </div>

              <ProfileHeader profile={userProfile} />
              <PostGrid posts={posts.slice(0, 6)} />
            </section>
          </section>

          <aside className="side-column" aria-label="Suggested creators">
            <SuggestedCreators creators={suggestedCreators} />
          </aside>
        </main>
      ) : (
        <AuthPage
          mode={authMode}
          onComplete={() => setAuthMode('login')}
          onModeChange={setAuthMode}
        />
      )}

      {isSignedIn && <BottomNav activeItem="Home" onNavigate={handleNavigate} />}
    </div>
  );
}
