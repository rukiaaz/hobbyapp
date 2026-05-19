import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { hobbyCategories, posts, suggestedCreators, userProfile } from './data/mockData.js';
import AuthPage from './components/auth/AuthPage.jsx';
import LoadingSkeleton from './components/common/LoadingSkeleton.jsx';
import HomeFeed from './components/feed/HomeFeed.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Header from './components/layout/Header.jsx';
import VibelyOnboarding from './components/onboarding/VibelyOnboarding.jsx';
import PostGrid from './components/posts/PostGrid.jsx';
import ProfileHeader from './components/profile/ProfileHeader.jsx';
import SuggestedCreators from './components/sidebar/SuggestedCreators.jsx';
import { auth, isFirebaseConfigured } from './services/firebase.js';
import { listenToUserChats } from './services/chats.js';
import { listenToBlockedUsers, createReport, toggleBlockUser } from './services/moderation.js';
import {
  createPost,
  deletePost,
  deletePostComment,
  listenToPosts,
  listenToSavedPosts,
  togglePostSave,
  updatePost,
} from './services/posts.js';
import {
  getVibelyProfile,
  listenToFollowing,
  listenToUserProfiles,
  saveVibelyProfile,
  toAppProfile,
  toggleFollowUser,
  updateVibelyProfile,
} from './services/vibelyProfile.js';

const ChatPanel = lazy(() => import('./components/chat/ChatPanel.jsx'));
const CreatePostView = lazy(() => import('./components/posts/CreatePostView.jsx'));
const ExploreView = lazy(() => import('./components/explore/ExploreView.jsx'));
const HobbyDetailView = lazy(() => import('./components/explore/HobbyDetailView.jsx'));
const NotificationsView = lazy(() => import('./components/notifications/NotificationsView.jsx'));
const ProfileView = lazy(() => import('./components/profile/ProfileView.jsx'));
const PublicProfileView = lazy(() => import('./components/profile/PublicProfileView.jsx'));
const SettingsView = lazy(() => import('./components/settings/SettingsView.jsx'));

const signedInViews = new Set([
  'home',
  'explore',
  'create',
  'messages',
  'notifications',
  'profile',
  'public-profile',
  'hobby',
  'settings',
]);

function getHashSegments() {
  if (typeof window === 'undefined') {
    return [];
  }

  return window.location.hash
    .replace(/^#\/?/, '')
    .split(/[/?]/)
    .filter(Boolean);
}

function getSignedInViewFromHash() {
  const hashRoute = getHashSegments().at(0);
  return signedInViews.has(hashRoute) ? hashRoute : null;
}

function getHashParam() {
  return getHashSegments().at(1) || '';
}

function getInitialSignedInView() {
  return getSignedInViewFromHash() ?? 'home';
}

function writeSignedInViewToHash(view, { param = '', replace = false } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextHash = `#/${view}${param ? `/${param}` : ''}`;

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


const defaultNotificationPreferences = {
  comments: true,
  likes: true,
  messages: true,
};

function getStorageKey(userId, key) {
  return userId ? `hobby-app:${userId}:${key}` : '';
}

function readStoredValue(userId, key, fallback) {
  const storageKey = getStorageKey(userId, key);

  if (!storageKey || typeof window === 'undefined') {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(userId, key, value) {
  const storageKey = getStorageKey(userId, key);

  if (storageKey && typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }
}

function getProfileHistoryId(profile) {
  return profile?.uid || profile?.handle || profile?.username || profile?.displayName || profile?.name || '';
}

function toProfileHistoryItem(profile) {
  const id = getProfileHistoryId(profile);

  return {
    id,
    avatar: profile?.avatar || profile?.displayName?.slice(0, 1) || profile?.name?.slice(0, 1) || '?',
    bio: profile?.bio || '',
    displayName: profile?.displayName || profile?.name || 'Creator',
    handle: profile?.handle || profile?.username || '',
    mainHobby: profile?.mainHobby || profile?.hobby || '',
    uid: profile?.uid || '',
  };
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
  const [activeHobbyId, setActiveHobbyId] = useState(() => getHashParam());
  const [chatSummaries, setChatSummaries] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [livePosts, setLivePosts] = useState([]);
  const [notificationPreferences, setNotificationPreferences] = useState(defaultNotificationPreferences);
  const [postError, setPostError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const [savedPostIds, setSavedPostIds] = useState(new Set());
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublicProfile, setSelectedPublicProfile] = useState(null);
  const [signedInView, setSignedInView] = useState(getInitialSignedInView);
  const [userProfiles, setUserProfiles] = useState([]);
  const [viewedProfiles, setViewedProfiles] = useState([]);
  const [vibelyProfile, setVibelyProfile] = useState(null);

  const isSignedIn = Boolean(currentUser);
  const needsVibelyProfile = isSignedIn && !vibelyProfile;
  const activeView = isSignedIn ? (needsVibelyProfile ? 'onboarding' : signedInView) : authMode;
  const profilePreview = toAppProfile(vibelyProfile, userProfile);
  const allPostsForDiscovery = useMemo(() => [...livePosts, ...posts], [livePosts]);
  const activeHobby = hobbyCategories.find((category) => category.id === activeHobbyId) ?? hobbyCategories[0];
  const selectedPublicPosts = useMemo(() => {
    if (!selectedPublicProfile) {
      return [];
    }

    if (selectedPublicProfile.uid) {
      return livePosts.filter((post) => post.authorId === selectedPublicProfile.uid);
    }

    return allPostsForDiscovery.filter((post) => post.handle === selectedPublicProfile.handle);
  }, [allPostsForDiscovery, livePosts, selectedPublicProfile]);
  const blockedProfiles = useMemo(
    () => userProfiles.filter((profile) => blockedUserIds.has(profile.uid)),
    [blockedUserIds, userProfiles],
  );
  const notifications = useMemo(() => {
    const ownPostNotifications = livePosts
      .filter((post) => post.authorId === currentUser?.uid)
      .flatMap((post) => {
        const items = [];

        if (notificationPreferences.likes && post.likesCount > 0) {
          items.push({
            id: `likes-${post.id}`,
            body: `${post.likesCount} ${post.likesCount === 1 ? 'person likes' : 'people like'} this hobby update.`,
            icon: '♥',
            meta: post.title,
            title: 'New likes on your post',
            view: 'profile',
          });
        }

        if (notificationPreferences.comments && post.commentsCount > 0) {
          items.push({
            id: `comments-${post.id}`,
            body: `${post.commentsCount} ${post.commentsCount === 1 ? 'comment' : 'comments'} on your post.`,
            icon: '💬',
            meta: post.title,
            title: 'New comments',
            view: 'profile',
          });
        }

        return items;
      });

    const messageNotifications = notificationPreferences.messages
      ? chatSummaries
          .filter((chat) => chat.isUnread)
          .map((chat) => {
            const partnerId = chat.participants.find((participantId) => participantId !== currentUser?.uid);
            const partner = userProfiles.find((profile) => profile.uid === partnerId);

            return {
              id: `message-${chat.id}`,
              body: chat.lastMessage || 'Sent you a message.',
              icon: '✉',
              isUnread: true,
              meta: chat.lastMessageTimeAgo || 'Unread',
              profile: partner,
              title: partner ? `Message from ${partner.displayName}` : 'Unread message',
              view: 'messages',
            };
          })
      : [];

    return [...messageNotifications, ...ownPostNotifications];
  }, [chatSummaries, currentUser?.uid, livePosts, notificationPreferences, userProfiles]);
  const notificationCount = notifications.length;

  useEffect(() => {
    function syncRouteFromHash() {
      const nextView = getSignedInViewFromHash() ?? 'home';
      setSignedInView(nextView);

      if (nextView === 'hobby') {
        setActiveHobbyId(getHashParam() || 'all');
      }
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
      setIsPostsLoading(false);
      setLivePosts([]);
      return undefined;
    }

    setIsPostsLoading(true);

    return listenToPosts(
      currentUser.uid,
      (nextPosts) => {
        setLivePosts(nextPosts);
        setIsPostsLoading(false);
      },
      (error) => {
        setIsPostsLoading(false);
        setPostError(`Could not load live posts. Check Firestore rules. (${error.code ?? 'unknown-error'})`);
      },
    );
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setSavedPostIds(new Set());
      return undefined;
    }

    return listenToSavedPosts(
      currentUser.uid,
      setSavedPostIds,
      (error) => setPostError(`Could not load saved posts. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!vibelyProfile?.uid || needsVibelyProfile) {
      setFollowingIds(new Set());
      return undefined;
    }

    return listenToFollowing(
      vibelyProfile.uid,
      setFollowingIds,
      (error) => setProfileError(`Could not load following. (${error.code ?? 'unknown-error'})`),
    );
  }, [needsVibelyProfile, vibelyProfile?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setUserProfiles([]);
      return undefined;
    }

    return listenToUserProfiles(
      currentUser.uid,
      setUserProfiles,
      (error) => setProfileError(`Could not load people. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setBlockedUserIds(new Set());
      return undefined;
    }

    return listenToBlockedUsers(
      currentUser.uid,
      setBlockedUserIds,
      (error) => setProfileError(`Could not load blocked users. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setChatSummaries([]);
      return undefined;
    }

    return listenToUserChats(
      currentUser.uid,
      setChatSummaries,
      (error) => setProfileError(`Could not load notification messages. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotificationPreferences(defaultNotificationPreferences);
      setSearchHistory([]);
      setViewedProfiles([]);
      return;
    }

    setNotificationPreferences(readStoredValue(currentUser.uid, 'notificationPreferences', defaultNotificationPreferences));
    setSearchHistory(readStoredValue(currentUser.uid, 'searchHistory', []));
    setViewedProfiles(readStoredValue(currentUser.uid, 'viewedProfiles', []));
  }, [currentUser?.uid]);

  function navigateSignedInView(view, options) {
    const nextView = signedInViews.has(view) ? view : 'home';
    setSignedInView(nextView);
    writeSignedInViewToHash(nextView, options);
  }

  function handleNavigate(view, options = {}) {
    if (!isSignedIn) {
      setAuthMode(view === 'signup' ? 'signup' : 'login');
      return;
    }

    if (needsVibelyProfile) {
      return;
    }

    if (options.search) {
      setSearchQuery(options.search);
      handleSearchCommit(options.search);
    }

    navigateSignedInView(view || 'home');
  }

  function handleSearchFocus() {
    if (isSignedIn && !needsVibelyProfile) {
      navigateSignedInView('explore');
    }
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
  }

  function handleSearchCommit(value = searchQuery) {
    const trimmedValue = value.trim();

    if (trimmedValue.length < 2 || !currentUser?.uid) {
      return;
    }

    setSearchHistory((currentHistory) => {
      const nextHistory = [trimmedValue, ...currentHistory.filter((entry) => entry !== trimmedValue)].slice(0, 10);
      writeStoredValue(currentUser.uid, 'searchHistory', nextHistory);
      return nextHistory;
    });
  }

  function handleRemoveSearchHistory(value) {
    setSearchHistory((currentHistory) => {
      const nextHistory = currentHistory.filter((entry) => entry !== value);
      writeStoredValue(currentUser?.uid, 'searchHistory', nextHistory);
      return nextHistory;
    });
  }

  function handleClearSearchHistory() {
    setSearchHistory([]);
    writeStoredValue(currentUser?.uid, 'searchHistory', []);
  }

  function handleRemoveViewedProfile(profileId) {
    setViewedProfiles((currentProfiles) => {
      const nextProfiles = currentProfiles.filter((profileItem) => profileItem.id !== profileId);
      writeStoredValue(currentUser?.uid, 'viewedProfiles', nextProfiles);
      return nextProfiles;
    });
  }

  function handleClearViewedProfiles() {
    setViewedProfiles([]);
    writeStoredValue(currentUser?.uid, 'viewedProfiles', []);
  }

  function handleUpdateNotificationPreference(name, value) {
    setNotificationPreferences((currentPreferences) => {
      const nextPreferences = { ...currentPreferences, [name]: value };
      writeStoredValue(currentUser?.uid, 'notificationPreferences', nextPreferences);
      return nextPreferences;
    });
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

  async function handleToggleSave(post) {
    if (!currentUser?.uid) {
      return false;
    }

    setPostError('');

    try {
      return await togglePostSave(post, currentUser.uid);
    } catch (error) {
      setPostError(`Could not save post. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleUpdatePost(postId, postData) {
    setPostError('');

    try {
      await updatePost(postId, postData);
      return true;
    } catch (error) {
      setPostError(`Could not update post. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleDeletePost(postId) {
    setPostError('');

    try {
      await deletePost(postId);
      return true;
    } catch (error) {
      setPostError(`Could not delete post. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleDeleteComment(postId, commentId) {
    setPostError('');

    try {
      await deletePostComment(postId, commentId);
      return true;
    } catch (error) {
      setPostError(`Could not delete comment. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleToggleFollow(targetProfile) {
    if (!vibelyProfile?.uid || !targetProfile?.uid) {
      return false;
    }

    setProfileError('');

    try {
      const isNowFollowing = await toggleFollowUser(vibelyProfile, targetProfile);
      setVibelyProfile((current) => current
        ? {
            ...current,
            followingCount: Math.max(0, (current.followingCount ?? 0) + (isNowFollowing ? 1 : -1)),
          }
        : current);
      setSelectedPublicProfile((current) => current?.uid === targetProfile.uid
        ? {
            ...current,
            followersCount: Math.max(0, (current.followersCount ?? 0) + (isNowFollowing ? 1 : -1)),
          }
        : current);
      return isNowFollowing;
    } catch (error) {
      setProfileError(`Could not update follow. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleToggleBlock(targetProfile) {
    if (!currentUser?.uid || !targetProfile?.uid) {
      return false;
    }

    try {
      return await toggleBlockUser(currentUser.uid, targetProfile);
    } catch (error) {
      setProfileError(`Could not update block. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleReport(targetType, targetId) {
    if (!currentUser?.uid || !targetId) {
      return;
    }

    try {
      await createReport({ currentUserId: currentUser.uid, targetId, targetType });
      setReportNotice('Report saved for review. This is a placeholder moderation flow.');
    } catch (error) {
      setReportNotice(`Could not submit report. (${error.code ?? 'unknown-error'})`);
    }
  }

  function handleViewProfile(profileToView) {
    if (!profileToView) {
      return;
    }

    const resolvedProfile = profileToView.uid
      ? userProfiles.find((user) => user.uid === profileToView.uid) ?? profileToView
      : profileToView;

    setSelectedPublicProfile(resolvedProfile);

    const historyItem = toProfileHistoryItem(resolvedProfile);

    if (historyItem.id && currentUser?.uid && historyItem.uid !== currentUser.uid) {
      setViewedProfiles((currentProfiles) => {
        const nextProfiles = [historyItem, ...currentProfiles.filter((profileItem) => profileItem.id !== historyItem.id)].slice(0, 12);
        writeStoredValue(currentUser.uid, 'viewedProfiles', nextProfiles);
        return nextProfiles;
      });
    }

    navigateSignedInView('public-profile', { replace: false });
  }

  function handleOpenHobby(categoryId) {
    setActiveHobbyId(categoryId);
    navigateSignedInView('hobby', { param: categoryId });
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
    setBlockedUserIds(new Set());
    setChatSummaries([]);
    setFollowingIds(new Set());
    setLivePosts([]);
    setNotificationPreferences(defaultNotificationPreferences);
    setPostError('');
    setReportNotice('');
    setSavedPostIds(new Set());
    setSearchHistory([]);
    setSelectedPublicProfile(null);
    setSignedInView('home');
    setUserProfiles([]);
    setViewedProfiles([]);
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
        notificationCount={notificationCount}
        onNavigate={handleNavigate}
        onSearchChange={handleSearchChange}
        onSearchCommit={handleSearchCommit}
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
            {reportNotice && <p className="success-message">{reportNotice}</p>}

            <Suspense fallback={<LoadingSkeleton count={3} type="route" />}>
              {activeView === 'home' && (
                <>
                  <HomeFeed
                    categories={hobbyCategories}
                    currentUser={currentUser}
                    feedError={postError}
                    followingIds={followingIds}
                    isCreatingPost={isCreatingPost}
                    isLoading={isPostsLoading}
                    livePosts={livePosts}
                    onCreatePost={handleCreatePost}
                    onDeleteComment={handleDeleteComment}
                    onDeletePost={handleDeletePost}
                    onReport={handleReport}
                    onToggleSave={handleToggleSave}
                    onUpdatePost={handleUpdatePost}
                    onViewProfile={handleViewProfile}
                    posts={posts}
                    profile={vibelyProfile}
                    savedPostIds={savedPostIds}
                  />

                  <section className="profile-preview" aria-labelledby="profile-preview-title">
                    <div className="section-heading">
                      <p id="profile-preview-title">Profile preview</p>
                      <button onClick={() => handleNavigate('profile')} type="button">View profile</button>
                    </div>

                    <ProfileHeader profile={profilePreview} showEditButton={false} />
                    <PostGrid posts={livePosts.filter((post) => post.authorId === currentUser?.uid).slice(0, 6).concat(posts.slice(0, 6)).slice(0, 6)} />
                  </section>
                </>
              )}

              {activeView === 'explore' && (
                <ExploreView
                  categories={hobbyCategories}
                  feedError={postError}
                  isLoading={isPostsLoading}
                  livePosts={livePosts}
                  onOpenHobby={handleOpenHobby}
                  onRemoveSearchHistory={handleRemoveSearchHistory}
                  onSearchChange={handleSearchChange}
                  onSearchCommit={handleSearchCommit}
                  onViewProfile={handleViewProfile}
                  posts={posts}
                  searchHistory={searchHistory}
                  searchQuery={searchQuery}
                  userProfiles={userProfiles}
                />
              )}

              {activeView === 'hobby' && (
                <HobbyDetailView
                  category={activeHobby}
                  onBack={() => handleNavigate('explore')}
                  onSearchChange={handleSearchChange}
                  posts={allPostsForDiscovery}
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
                <ChatPanel
                  blockedUserIds={blockedUserIds}
                  currentUser={currentUser}
                  followingIds={followingIds}
                  onBlock={handleToggleBlock}
                  onFollow={handleToggleFollow}
                  onReport={handleReport}
                  onViewProfile={handleViewProfile}
                  profile={vibelyProfile}
                />
              )}

              {activeView === 'notifications' && (
                <NotificationsView
                  notifications={notifications}
                  onNavigate={handleNavigate}
                  onViewProfile={handleViewProfile}
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  blockedProfiles={blockedProfiles}
                  currentUser={currentUser}
                  notificationPreferences={notificationPreferences}
                  onClearSearchHistory={handleClearSearchHistory}
                  onClearViewedProfiles={handleClearViewedProfiles}
                  onNavigate={handleNavigate}
                  onRemoveSearchHistory={handleRemoveSearchHistory}
                  onRemoveViewedProfile={handleRemoveViewedProfile}
                  onToggleBlock={handleToggleBlock}
                  onUpdateNotificationPreference={handleUpdateNotificationPreference}
                  onViewProfile={handleViewProfile}
                  profile={vibelyProfile}
                  searchHistory={searchHistory}
                  viewedProfiles={viewedProfiles}
                />
              )}

              {activeView === 'profile' && (
                <ProfileView
                  appProfile={profilePreview}
                  errorMessage={profileError}
                  livePosts={livePosts}
                  onUpdateProfile={handleUpdateVibelyProfile}
                  posts={posts}
                  profile={vibelyProfile}
                />
              )}

              {activeView === 'public-profile' && (
                <PublicProfileView
                  currentUser={currentUser}
                  followingIds={followingIds}
                  isBlocked={Boolean(selectedPublicProfile?.uid && blockedUserIds.has(selectedPublicProfile.uid))}
                  onBack={() => handleNavigate('explore')}
                  onBlock={handleToggleBlock}
                  onFollow={handleToggleFollow}
                  onReport={handleReport}
                  posts={selectedPublicPosts}
                  profile={selectedPublicProfile}
                />
              )}
            </Suspense>
          </section>

          <aside className="side-column" aria-label="Community sidebar">
            <Suspense fallback={<LoadingSkeleton count={1} type="messages" />}>
              {activeView !== 'messages' && (
                <ChatPanel
                  blockedUserIds={blockedUserIds}
                  currentUser={currentUser}
                  followingIds={followingIds}
                  onBlock={handleToggleBlock}
                  onFollow={handleToggleFollow}
                  onReport={handleReport}
                  onViewProfile={handleViewProfile}
                  profile={vibelyProfile}
                />
              )}
            </Suspense>
            <SuggestedCreators creators={suggestedCreators} onViewCreator={handleViewProfile} />
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
