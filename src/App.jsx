import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { hobbyCategories, posts, suggestedCreators, userProfile } from './data/mockData.js';
import AuthPage from './components/auth/AuthPage.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import HomeFeed from './components/feed/HomeFeed.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Header from './components/layout/Header.jsx';
import VibelyOnboarding from './components/onboarding/VibelyOnboarding.jsx';
import PostGrid from './components/posts/PostGrid.jsx';
import ProfileHeader from './components/profile/ProfileHeader.jsx';
import SuggestedCreators from './components/sidebar/SuggestedCreators.jsx';
import { auth } from './services/firebase.js';
import { getVibelyProfile, saveVibelyProfile, toAppProfile } from './services/vibelyProfile.js';

function needsEmailVerification(user) {
  return user?.providerData.some((provider) => provider.providerId === 'password') && !user.emailVerified;
}

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [profileError, setProfileError] = useState('');
  const [vibelyProfile, setVibelyProfile] = useState(null);

  const isSignedIn = Boolean(currentUser);
  const needsVibelyProfile = isSignedIn && !vibelyProfile;
  const activeView = isSignedIn ? (needsVibelyProfile ? 'onboarding' : 'home') : authMode;
  const profilePreview = toAppProfile(vibelyProfile, userProfile);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthReady(false);
      setCurrentUser(user);
      setProfileError('');

      if (!user) {
        setVibelyProfile(null);
        setIsAuthReady(true);
        return;
      }

      if (needsEmailVerification(user)) {
        await signOut(auth);
        setCurrentUser(null);
        setVibelyProfile(null);
        setAuthNotice('Please verify your email before entering Hobby App. Check your inbox and spam folder.');
        setIsAuthReady(true);
        return;
      }

      try {
        const savedProfile = await getVibelyProfile(user.uid);

        if (isMounted) {
          setVibelyProfile(savedProfile);
        }
      } catch (error) {
        if (isMounted) {
          setVibelyProfile(null);
          setProfileError(
            `Could not load your Vibely profile from Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`,
          );
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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

  async function handleAuthComplete(user) {
    if (!user) {
      setAuthMode('login');
      return;
    }

    if (needsEmailVerification(user)) {
      await signOut(auth);
      setCurrentUser(null);
      setVibelyProfile(null);
      setAuthNotice('Please verify your email before entering Hobby App. Check your inbox and spam folder.');
      setAuthMode('login');
      return;
    }

    setAuthNotice('');
    setCurrentUser(user);
    setIsAuthReady(false);
    setProfileError('');

    try {
      const savedProfile = await getVibelyProfile(user.uid);
      setVibelyProfile(savedProfile);
    } catch (error) {
      setVibelyProfile(null);
      setProfileError(
        `Could not load your Vibely profile from Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`,
      );
    } finally {
      setIsAuthReady(true);
    }
  }

  async function handleCreateVibelyProfile(profileData) {
    setProfileError('');

    try {
      const savedProfile = await saveVibelyProfile(currentUser, profileData);

      if (currentUser.displayName !== savedProfile.displayName) {
        await updateProfile(currentUser, { displayName: savedProfile.displayName });
      }

      setVibelyProfile(savedProfile);
    } catch (error) {
      setProfileError(
        `Could not create your Vibely profile in Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`,
      );
    }
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
        vibelyProfile={vibelyProfile}
      />

      {needsVibelyProfile ? (
        <VibelyOnboarding
          errorMessage={profileError}
          onComplete={handleCreateVibelyProfile}
          onSignOut={handleSignOut}
          user={currentUser}
        />
      ) : isSignedIn ? (
        <main className="layout">
          <section className="main-column" aria-label="Home screen">
            <HomeFeed
              categories={hobbyCategories}
              currentUser={currentUser}
              posts={posts}
              profile={vibelyProfile}
            />

            <section className="profile-preview" aria-labelledby="profile-preview-title">
              <div className="section-heading">
                <p id="profile-preview-title">Profile preview</p>
                <button type="button">View profile</button>
              </div>

              <ProfileHeader profile={profilePreview} />
              <PostGrid posts={posts.slice(0, 6)} />
            </section>
          </section>

          <aside className="side-column" aria-label="Community sidebar">
            <ChatPanel currentUser={currentUser} profile={vibelyProfile} />
            <SuggestedCreators creators={suggestedCreators} />
          </aside>
        </main>
      ) : (
        <AuthPage
          initialMessage={authNotice}
          mode={authMode}
          onComplete={handleAuthComplete}
          onModeChange={setAuthMode}
        />
      )}

      {isSignedIn && !needsVibelyProfile && <BottomNav activeItem="Home" onNavigate={handleNavigate} />}
    </div>
  );
}
