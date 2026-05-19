import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { hobbyCategories, posts, suggestedCreators, userProfile } from './data/mockData.js';
import AuthPage from './components/auth/AuthPage.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import ExploreView from './components/explore/ExploreView.jsx';
import HomeFeed from './components/feed/HomeFeed.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Header from './components/layout/Header.jsx';
import VibelyOnboarding from './components/onboarding/VibelyOnboarding.jsx';
import CreatePostView from './components/posts/CreatePostView.jsx';
import PostGrid from './components/posts/PostGrid.jsx';
import ProfileHeader from './components/profile/ProfileHeader.jsx';
import ProfileView from './components/profile/ProfileView.jsx';
import SuggestedCreators from './components/sidebar/SuggestedCreators.jsx';
import { auth, isFirebaseConfigured } from './services/firebase.js';
import { createPost, listenToPosts } from './services/posts.js';
import {
  getVibelyProfile,
  saveVibelyProfile,
  toAppProfile,
  updateVibelyProfile,
} from './services/vibelyProfile.js';

const signedInViews = new Set(['home', 'explore', 'create', 'messages', 'profile']);

function getSignedInViewFromHash() {
  if (typeof window === 'undefined') {
    return null;
  }

  const hashRoute = window.location.hash.replace(/^#\/?/, '').split(/[/?]/).at(0);
  return signedInViews.has(hashRoute) ? hashRoute : null;
}

function getInitialSignedInView() {
  return getSignedInViewFromHash() ?? 'home';
}

function writeSignedInViewToHash(view, { replace = false } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextHash = `#/${view}`;

  if (window.location.hash === nextHash) {
    return;
  }

  if (replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    return;
  }

  window.location.hash = `/${view}`;
}

function clearRouteHash() {
  if (typeof window !== 'undefined' && window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

function needsEmailVerification(user) {
  return user?.providerData.some((provider) => provider.providerId === 'password') && !user.emailVerified;
}

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authNotice, setAuthNotice] = useState(() =>
    isFirebaseConfigured
      ? ''
      : 'Firebase is not configured. Create .env.local in the project root with your Firebase web app keys, then restart npm run dev.',
  );
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [livePosts, setLivePosts] = useState([]);
  const [postError, setPostError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [signedInView, setSignedInView] = useState(getInitialSignedInView);
  const [vibelyProfile, setVibelyProfile] = useState(null);

  const isSignedIn = Boolean(currentUser);
  const needsVibelyProfile = isSignedIn && !vibelyProfile;
  const activeView = isSignedIn ? (needsVibelyProfile ? 'onboarding' : signedInView) : authMode;
  const profilePreview = toAppProfile(vibelyProfile, userProfile);

  useEffect(() => {
    function syncRouteFromHash() {
      setSignedInView(getSignedInViewFromHash() ?? 'home');
    }

    syncRouteFromHash();
    window.addEventListener('hashchange', syncRouteFromHash);

    return () => window.removeEventListener('hashchange', syncRouteFromHash);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      setCurrentUser(null);
      setVibelyProfile(null);
      setIsAuthReady(true);
      return undefined;
    }

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
        if (auth) {
          await signOut(auth);
        }
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

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setLivePosts([]);
      return undefined;
    }

    return listenToPosts(
      currentUser.uid,
      setLivePosts,
      (error) => setPostError(`Could not load live posts. Check Firestore rules. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, needsVibelyProfile]);

  function navigateSignedInView(view, options) {
    const nextView = signedInViews.has(view) ? view : 'home';
    setSignedInView(nextView);
    writeSignedInViewToHash(nextView, options);
  }

  function handleNavigate(view) {
    if (!isSignedIn) {
      setAuthMode(view === 'signup' ? 'signup' : 'login');
      return;
    }

    if (needsVibelyProfile) {
      return;
    }

    navigateSignedInView(view || 'home');
  }

  function handleSearchFocus() {
    if (isSignedIn && !needsVibelyProfile) {
      navigateSignedInView('explore');
    }
  }

  async function handleAuthComplete(user) {
    if (!user) {
      setAuthMode('login');
      return;
    }

    if (needsEmailVerification(user)) {
      if (auth) {
        await signOut(auth);
      }
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
      navigateSignedInView(getSignedInViewFromHash() ?? 'home', { replace: true });
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
      navigateSignedInView('home', { replace: true });
    } catch (error) {
      setProfileError(
        `Could not create your Vibely profile in Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`,
      );
    }
  }

  async function handleCreatePost(postData) {
    if (!currentUser || !vibelyProfile) {
      setPostError('Finish signing in before creating a post.');
      return false;
    }

    setPostError('');
    setIsCreatingPost(true);

    try {
      await createPost(currentUser, vibelyProfile, postData);
      return true;
    } catch (error) {
      setPostError(
        `Could not create post. Check Firestore rules and Cloudinary env settings. (${error.code ?? 'unknown-error'})`,
      );
      return false;
    } finally {
      setIsCreatingPost(false);
    }
  }

  async function handleUpdateVibelyProfile(profileData) {
    setProfileError('');

    try {
      const updatedProfile = await updateVibelyProfile(currentUser, vibelyProfile, profileData);

      if (currentUser.displayName !== updatedProfile.displayName) {
        await updateProfile(currentUser, { displayName: updatedProfile.displayName });
      }

      setVibelyProfile(updatedProfile);
      return true;
    } catch (error) {
      setProfileError(
        `Could not update your Vibely profile in Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`,
      );
      return false;
    }
  }

  async function handleSignOut() {
    if (auth) {
      await signOut(auth);
    }
    setAuthMode('login');
    setLivePosts([]);
    setPostError('');
    setSignedInView('home');
    setSearchQuery('');
    clearRouteHash();
  }

  if (!isAuthReady) {
    return (
      <div className="app-shell">
        <Header activeView="loading" isAuthenticated={false} onNavigate={handleNavigate} />
        <main className="auth-loading" aria-live="polite">
          <section className="auth-card" aria-label="Loading screen">
            <div className="auth-card-header">
              <p className="eyebrow">Hobby App</p>
              <h2>Loading…</h2>
            </div>
            <p className="auth-note">Fetching your profile and live updates.</p>
          </section>
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
        onSearchChange={setSearchQuery}
        onSearchFocus={handleSearchFocus}
        onSignOut={handleSignOut}
        searchQuery={searchQuery}
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
          <section className="main-column" aria-label={`${activeView} screen`}>
            {activeView === 'home' && (
              <>
                <HomeFeed
                  categories={hobbyCategories}
                  currentUser={currentUser}
                  feedError={postError}
                  isCreatingPost={isCreatingPost}
                  livePosts={livePosts}
                  onCreatePost={handleCreatePost}
                  posts={posts}
                  profile={vibelyProfile}
                />

                <section className="profile-preview" aria-labelledby="profile-preview-title">
                  <div className="section-heading">
                    <p id="profile-preview-title">Profile preview</p>
                    <button onClick={() => handleNavigate('profile')} type="button">View profile</button>
                  </div>

                  <ProfileHeader profile={profilePreview} showEditButton={false} />
                  <PostGrid posts={posts.slice(0, 6)} />
                </section>
              </>
            )}

            {activeView === 'explore' && (
              <ExploreView
                categories={hobbyCategories}
                feedError={postError}
                livePosts={livePosts}
                onSearchChange={setSearchQuery}
                posts={posts}
                searchQuery={searchQuery}
              />
            )}

            {activeView === 'create' && (
              <CreatePostView
                categories={hobbyCategories}
                errorMessage={postError}
                isSubmitting={isCreatingPost}
                onCreatePost={handleCreatePost}
                profile={vibelyProfile}
              />
            )}

            {activeView === 'messages' && (
              <ChatPanel currentUser={currentUser} profile={vibelyProfile} />
            )}

            {activeView === 'profile' && (
              <ProfileView
                appProfile={profilePreview}
                errorMessage={profileError}
                onUpdateProfile={handleUpdateVibelyProfile}
                posts={posts}
                profile={vibelyProfile}
              />
            )}
          </section>

          <aside className="side-column" aria-label="Community sidebar">
            {activeView !== 'messages' && <ChatPanel currentUser={currentUser} profile={vibelyProfile} />}
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

      {isSignedIn && !needsVibelyProfile && <BottomNav activeView={activeView} onNavigate={handleNavigate} />}
    </div>
  );
}
