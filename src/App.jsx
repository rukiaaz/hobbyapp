import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { hobbyCategories, posts, suggestedCreators, userProfile } from './data/mockData.js';
import AuthPage from './components/auth/AuthPage.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import LoadingSkeleton from './components/common/LoadingSkeleton.jsx';
import HomeFeed from './components/feed/HomeFeed.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Header from './components/layout/Header.jsx';
import VibelyOnboarding from './components/onboarding/VibelyOnboarding.jsx';
import SuggestedCreators from './components/sidebar/SuggestedCreators.jsx';
import { auth, isFirebaseConfigured } from './services/firebase.js';
import { listenToUserChats } from './services/chats.js';
import ReportDialog from './components/moderation/ReportDialog.jsx';
import { createReport, listenToBlockedUsers, toggleBlockUser } from './services/moderation.js';
import { listenToNotifications } from './services/notifications.js';
import { createPost, deletePost, deletePostComment, listenToPosts, listenToSavedPosts, togglePostSave, updatePost } from './services/posts.js';
import { getVibelyProfile, listenToFollowing, listenToUserProfiles, saveVibelyProfile, toAppProfile, toggleFollowUser, updateVibelyProfile } from './services/vibelyProfile.js';

const ChatPanel = lazy(() => import('./components/chat/ChatPanel.jsx'));
const CreatePostView = lazy(() => import('./components/posts/CreatePostView.jsx'));
const ExploreView = lazy(() => import('./components/explore/ExploreView.jsx'));
const HobbyDetailView = lazy(() => import('./components/explore/HobbyDetailView.jsx'));
const NotificationsView = lazy(() => import('./components/notifications/NotificationsView.jsx'));
const ProfileView = lazy(() => import('./components/profile/ProfileView.jsx'));
const PublicProfileView = lazy(() => import('./components/profile/PublicProfileView.jsx'));
const ReelsView = lazy(() => import('./components/reels/ReelsView.jsx'));
const SearchView = lazy(() => import('./components/search/SearchView.jsx'));
const SettingsView = lazy(() => import('./components/settings/SettingsView.jsx'));

const signedInViews = new Set(['home', 'search', 'explore', 'reels', 'create', 'messages', 'notifications', 'profile', 'public-profile', 'hobby', 'settings']);
const defaultNotificationPreferences = { comments: true, likes: true, messages: true };

function getHashSegments() {
  if (typeof window === 'undefined') return [];
  return window.location.hash.replace(/^#\/?/, '').split(/[/?]/).filter(Boolean);
}

function getSignedInViewFromHash() {
  const route = getHashSegments().at(0);
  return signedInViews.has(route) ? route : null;
}

function getHashParam() {
  return getHashSegments().at(1) || '';
}

function getInitialSignedInView() {
  return getSignedInViewFromHash() ?? 'home';
}

function writeSignedInViewToHash(view, { param = '', replace = false } = {}) {
  if (typeof window === 'undefined') return;
  const nextHash = `#/${view}${param ? `/${param}` : ''}`;
  if (window.location.hash === nextHash) return;
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

function getStorageKey(userId, key) {
  return userId ? `hobby-app:${userId}:${key}` : '';
}

function readStoredValue(userId, key, fallback) {
  const storageKey = getStorageKey(userId, key);
  if (!storageKey || typeof window === 'undefined') return fallback;
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

function getInitials(label) {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0).toUpperCase())
    .join('') || '?';
}

function isPreviewEnabled() {
  if (typeof window === 'undefined') return false;
  const previewValue = new URLSearchParams(window.location.search).get('preview');
  return previewValue === '1' || previewValue === 'true';
}

function createPreviewProfile(uid, displayName, handle, mainHobby, bio, followersCount, followingCount, postsCount, interests = [mainHobby]) {
  return {
    uid,
    avatar: getInitials(displayName),
    bio,
    displayName,
    followersCount,
    followingCount,
    handle,
    interests,
    mainHobby,
    postsCount,
    privacy: {
      messagePermission: 'everyone',
      profileVisibility: 'public',
      searchDiscoverable: true,
    },
    username: handle.replace(/^@/, ''),
  };
}

const previewCurrentUserSeed = {
  displayName: userProfile.name,
  email: 'avery@vibely.app',
  uid: 'preview-user',
};

const previewProfileSeed = {
  avatar: userProfile.avatar,
  bio: userProfile.bio,
  displayName: userProfile.name,
  followersCount: userProfile.followers,
  followingCount: userProfile.following,
  handle: userProfile.username,
  interests: userProfile.featuredHobbies,
  mainHobby: userProfile.featuredHobbies[0],
  postsCount: userProfile.posts,
  privacy: {
    messagePermission: 'everyone',
    profileVisibility: 'public',
    searchDiscoverable: true,
  },
  uid: previewCurrentUserSeed.uid,
  username: userProfile.username.replace(/^@/, ''),
};

const previewProfileSeeds = [
  createPreviewProfile(
    'mia-chen',
    'Mia Chen',
    '@wheelthrown',
    'Ceramics',
    'Wheel-thrown bowls, glaze tests, and quiet studio mornings.',
    2480,
    311,
    68,
    ['Ceramics', 'Glazing', 'Studio life'],
  ),
  createPreviewProfile(
    'jon-bell',
    'Jon Bell',
    '@dawnmiles',
    'Trail Running',
    'Chasing sunrise miles, muddy switchbacks, and post-run coffee.',
    5310,
    204,
    124,
    ['Trail Running', 'Outdoors', 'Travel'],
  ),
  createPreviewProfile(
    'sam-rivera',
    'Sam Rivera',
    '@vinylbench',
    'Music Production',
    'Bedroom synths, tape textures, and late-night loop sessions.',
    3170,
    412,
    92,
    ['Music Production', 'Synths', 'Audio'],
  ),
  createPreviewProfile(
    'noor-patel',
    'Noor Patel',
    '@leafledger',
    'Houseplants',
    'Propagation updates, greenhouse notes, and leafy corners.',
    6890,
    278,
    151,
    ['Houseplants', 'Nature', 'Home'],
  ),
  createPreviewProfile(
    'leo-grant',
    'Leo Grant',
    '@castironleo',
    'Baking',
    'Bread boards, focaccia experiments, and flour everywhere.',
    1950,
    139,
    44,
    ['Baking', 'Cooking', 'Food'],
  ),
  createPreviewProfile(
    'kai-moreno',
    'Kai Moreno',
    '@kaiclimbs',
    'Bouldering',
    'Steep walls, tiny footholds, and weekend climbing trips.',
    7410,
    165,
    110,
    ['Bouldering', 'Outdoors', 'Fitness'],
  ),
];

const previewSearchSeeds = ['Ceramics', 'Trail running', 'Sunset photos'];
const previewViewedProfileSeeds = previewProfileSeeds.slice(0, 3).map(toProfileHistoryItem);
const previewFollowingSeed = ['mia-chen', 'sam-rivera', 'kai-moreno'];
const previewBlockedSeed = ['leo-grant'];

const previewNotificationSeeds = [
  {
    body: '248 people liked your latest seaside upload.',
    icon: 'heart',
    id: 'preview-like',
    meta: '3m ago',
    title: 'New likes on your post',
    view: 'profile',
  },
  {
    body: 'Mia Chen and Sam Rivera commented on your reel.',
    icon: 'comment',
    id: 'preview-comment',
    meta: '12m ago',
    profile: previewProfileSeeds[0],
    title: 'New comments',
    view: 'public-profile',
  },
  {
    body: 'That framing is perfect. What lens did you use?',
    icon: 'messages',
    id: 'preview-message',
    isUnread: true,
    meta: 'Active now',
    profile: previewProfileSeeds[0],
    title: 'Message from Mia Chen',
    view: 'messages',
  },
];

const previewChatSeeds = [
  {
    id: 'chat-mia',
    isUnread: true,
    lastMessage: 'That framing is perfect. What lens did you use?',
    lastMessageSenderId: 'mia-chen',
    lastMessageTimeAgo: '2m ago',
    participants: [previewCurrentUserSeed.uid, 'mia-chen'],
    updatedAt: new Date('2026-05-21T15:58:00+08:00'),
  },
  {
    id: 'chat-sam',
    isUnread: false,
    lastMessage: 'Sending you the synth preset pack tonight.',
    lastMessageSenderId: previewCurrentUserSeed.uid,
    lastMessageTimeAgo: '18m ago',
    participants: [previewCurrentUserSeed.uid, 'sam-rivera'],
    updatedAt: new Date('2026-05-21T15:42:00+08:00'),
  },
  {
    id: 'chat-kai',
    isUnread: false,
    lastMessage: 'Route beta looked smooth. Lets climb Sunday.',
    lastMessageSenderId: 'kai-moreno',
    lastMessageTimeAgo: '1h ago',
    participants: [previewCurrentUserSeed.uid, 'kai-moreno'],
    updatedAt: new Date('2026-05-21T14:50:00+08:00'),
  },
];

const previewThreadSeeds = {
  'kai-moreno': [
    { id: 'kai-1', senderId: 'kai-moreno', text: 'Route beta looked smooth. Lets climb Sunday.', timeAgo: '1h ago' },
    { id: 'kai-2', senderId: previewCurrentUserSeed.uid, text: 'I am in. Sunset session?', timeAgo: '56m ago' },
  ],
  'mia-chen': [
    { id: 'mia-1', senderId: 'mia-chen', text: 'That framing is perfect. What lens did you use?', timeAgo: '2m ago' },
    { id: 'mia-2', senderId: previewCurrentUserSeed.uid, text: 'A compact 35mm. Shot it right before sunset.', timeAgo: '1m ago' },
  ],
  'sam-rivera': [
    { id: 'sam-1', senderId: previewCurrentUserSeed.uid, text: 'Can you send that warm pad preset?', timeAgo: '24m ago' },
    { id: 'sam-2', senderId: 'sam-rivera', text: 'Sending you the synth preset pack tonight.', timeAgo: '18m ago' },
  ],
};

export default function App() {
  const previewMode = isPreviewEnabled();
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authNotice, setAuthNotice] = useState(() => (isFirebaseConfigured ? '' : 'Firebase is not configured. Create .env.local in the project root with your Firebase web app keys, then restart npm run dev.'));
  const [activeHobbyId, setActiveHobbyId] = useState(() => getHashParam());
  const [chatSummaries, setChatSummaries] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [livePosts, setLivePosts] = useState([]);
  const [notificationPreferences, setNotificationPreferences] = useState(defaultNotificationPreferences);
  const [postError, setPostError] = useState('');
  const [previewBlockedUserIds, setPreviewBlockedUserIds] = useState(() => new Set(previewBlockedSeed));
  const [previewFollowingIds, setPreviewFollowingIds] = useState(() => new Set(previewFollowingSeed));
  const [previewProfile, setPreviewProfile] = useState(previewProfileSeed);
  const [profileError, setProfileError] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [savedPostIds, setSavedPostIds] = useState(new Set());
  const [searchHistory, setSearchHistory] = useState(() => (previewMode ? previewSearchSeeds : []));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublicProfile, setSelectedPublicProfile] = useState(null);
  const [signedInView, setSignedInView] = useState(getInitialSignedInView);
  const [userProfiles, setUserProfiles] = useState([]);
  const [viewedProfiles, setViewedProfiles] = useState(() => (previewMode ? previewViewedProfileSeeds : []));
  const [vibelyProfile, setVibelyProfile] = useState(null);

  const isPreviewSession = previewMode && !currentUser;
  const sessionUser = isPreviewSession ? previewCurrentUserSeed : currentUser;
  const sessionProfile = isPreviewSession ? previewProfile : vibelyProfile;
  const sessionUserId = sessionUser?.uid || '';
  const visibleFollowingIds = isPreviewSession ? previewFollowingIds : followingIds;
  const visibleBlockedUserIds = isPreviewSession ? previewBlockedUserIds : blockedUserIds;
  const visibleUserProfiles = isPreviewSession ? previewProfileSeeds : userProfiles;
  const visibleLivePosts = isPreviewSession ? [] : livePosts;
  const visibleSavedPostIds = isPreviewSession ? new Set() : savedPostIds;
  const isSignedIn = Boolean(currentUser) || isPreviewSession;
  const needsVibelyProfile = Boolean(currentUser) && !vibelyProfile;
  const activeView = isSignedIn ? (needsVibelyProfile ? 'onboarding' : signedInView) : authMode;
  const showCommunitySidebar = activeView === 'home';
  const profilePreview = toAppProfile(sessionProfile, userProfile);
  const allPostsForDiscovery = useMemo(() => [...visibleLivePosts, ...posts], [visibleLivePosts]);
  const activeHobby = hobbyCategories.find((category) => category.id === activeHobbyId) ?? hobbyCategories[0];
  const selectedPublicPosts = useMemo(() => {
    if (!selectedPublicProfile) return [];
    if (selectedPublicProfile.uid) return visibleLivePosts.filter((post) => post.authorId === selectedPublicProfile.uid);
    return allPostsForDiscovery.filter((post) => post.handle === selectedPublicProfile.handle);
  }, [allPostsForDiscovery, selectedPublicProfile, visibleLivePosts]);
  const blockedProfiles = useMemo(
    () => visibleUserProfiles.filter((profile) => visibleBlockedUserIds.has(profile.uid)),
    [visibleBlockedUserIds, visibleUserProfiles],
  );
  const notifications = useMemo(() => {
    if (isPreviewSession) {
      return previewNotificationSeeds;
    }

    const ownPostNotifications = visibleLivePosts
      .filter((post) => post.authorId === sessionUserId)
      .flatMap((post) => {
        const items = [];
        if (notificationPreferences.likes && post.likesCount > 0) {
          items.push({ id: `likes-${post.id}`, body: `${post.likesCount} ${post.likesCount === 1 ? 'person likes' : 'people like'} this hobby update.`, icon: '♥', meta: post.title, title: 'New likes on your post', view: 'profile' });
        }
        if (notificationPreferences.comments && post.commentsCount > 0) {
          items.push({ id: `comments-${post.id}`, body: `${post.commentsCount} ${post.commentsCount === 1 ? 'comment' : 'comments'} on your post.`, icon: '💬', meta: post.title, title: 'New comments', view: 'profile' });
        }
        return items;
      });
    const messageNotifications = notificationPreferences.messages
      ? chatSummaries.filter((chat) => chat.isUnread).map((chat) => {
          const partnerId = chat.participants.find((participantId) => participantId !== sessionUserId);
          const partner = visibleUserProfiles.find((profile) => profile.uid === partnerId);
          return { id: `message-${chat.id}`, body: chat.lastMessage || 'Sent you a message.', icon: '✉', isUnread: true, meta: chat.lastMessageTimeAgo || 'Unread', profile: partner, title: partner ? `Message from ${partner.displayName}` : 'Unread message', view: 'messages' };
        })
      : [];
    return [...liveNotifications, ...messageNotifications, ...ownPostNotifications];
  }, [chatSummaries, isPreviewSession, liveNotifications, notificationPreferences, sessionUserId, visibleLivePosts, visibleUserProfiles]);
  const notificationCount = notifications.length;

  useEffect(() => {
    function syncRouteFromHash() {
      const nextView = getSignedInViewFromHash() ?? 'home';
      setSignedInView(nextView);
      if (nextView === 'hobby') setActiveHobbyId(getHashParam() || 'all');
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
        if (auth) await signOut(auth);
        setCurrentUser(null);
        setVibelyProfile(null);
        setAuthNotice('Please verify your email before entering Vibely. Check your inbox and spam folder.');
        setIsAuthReady(true);
        return;
      }
      try {
        const savedProfile = await getVibelyProfile(user.uid);
        if (isMounted) setVibelyProfile(savedProfile);
      } catch (error) {
        if (isMounted) {
          setVibelyProfile(null);
          setProfileError(`Could not load your Vibely profile from Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`);
        }
      } finally {
        if (isMounted) setIsAuthReady(true);
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
    return listenToSavedPosts(currentUser.uid, setSavedPostIds, (error) => setPostError(`Could not load saved posts. (${error.code ?? 'unknown-error'})`));
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!vibelyProfile?.uid || needsVibelyProfile) {
      setFollowingIds(new Set());
      return undefined;
    }
    return listenToFollowing(vibelyProfile.uid, setFollowingIds, (error) => setProfileError(`Could not load following. (${error.code ?? 'unknown-error'})`));
  }, [needsVibelyProfile, vibelyProfile?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setUserProfiles([]);
      return undefined;
    }
    return listenToUserProfiles(currentUser.uid, setUserProfiles, (error) => setProfileError(`Could not load people. (${error.code ?? 'unknown-error'})`));
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setBlockedUserIds(new Set());
      return undefined;
    }
    return listenToBlockedUsers(currentUser.uid, setBlockedUserIds, (error) => setProfileError(`Could not load blocked users. (${error.code ?? 'unknown-error'})`));
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setChatSummaries([]);
      return undefined;
    }
    return listenToUserChats(currentUser.uid, setChatSummaries, (error) => setProfileError(`Could not load notification messages. (${error.code ?? 'unknown-error'})`));
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!currentUser?.uid || needsVibelyProfile) {
      setLiveNotifications([]);
      return undefined;
    }
    return listenToNotifications(currentUser.uid, setLiveNotifications, (error) => setProfileError(`Could not load persisted notifications. (${error.code ?? 'unknown-error'})`));
  }, [currentUser?.uid, needsVibelyProfile]);

  useEffect(() => {
    if (!sessionUserId) {
      setNotificationPreferences(defaultNotificationPreferences);
      setSearchHistory([]);
      setViewedProfiles([]);
      return;
    }

    if (isPreviewSession) {
      setNotificationPreferences(defaultNotificationPreferences);
      setSearchHistory((currentHistory) => (currentHistory.length > 0 ? currentHistory : previewSearchSeeds));
      setViewedProfiles((currentProfiles) => (currentProfiles.length > 0 ? currentProfiles : previewViewedProfileSeeds));
      return;
    }

    setNotificationPreferences(readStoredValue(sessionUserId, 'notificationPreferences', defaultNotificationPreferences));
    setSearchHistory(readStoredValue(sessionUserId, 'searchHistory', []));
    setViewedProfiles(readStoredValue(sessionUserId, 'viewedProfiles', []));
  }, [isPreviewSession, sessionUserId]);

  function navigateSignedInView(view, options) {
    const nextView = signedInViews.has(view) ? view : 'home';
    setSignedInView(nextView);
    writeSignedInViewToHash(nextView, options);
  }

  function handleNavigate(view, options = {}) {
    if (!isSignedIn) {
      setAuthMode(['signup', 'recover', 'recover-sent', 'reset'].includes(view) ? view : 'login');
      return;
    }
    if (needsVibelyProfile) return;
    if (options.search) {
      setSearchQuery(options.search);
      handleSearchCommit(options.search);
    }
    navigateSignedInView(view || 'home');
  }

  function handleSearchFocus() {
    if (isSignedIn && !needsVibelyProfile) navigateSignedInView('search');
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
  }

  function handleSearchCommit(value = searchQuery) {
    const trimmedValue = value.trim();
    if (trimmedValue.length < 2 || !sessionUserId) return;
    navigateSignedInView('search');
    setSearchHistory((currentHistory) => {
      const nextHistory = [trimmedValue, ...currentHistory.filter((entry) => entry !== trimmedValue)].slice(0, 10);
      writeStoredValue(sessionUserId, 'searchHistory', nextHistory);
      return nextHistory;
    });
  }

  function handleRemoveSearchHistory(value) {
    setSearchHistory((currentHistory) => {
      const nextHistory = currentHistory.filter((entry) => entry !== value);
      writeStoredValue(sessionUserId, 'searchHistory', nextHistory);
      return nextHistory;
    });
  }

  function handleClearSearchHistory() {
    setSearchHistory([]);
    writeStoredValue(sessionUserId, 'searchHistory', []);
  }

  function handleRemoveViewedProfile(profileId) {
    setViewedProfiles((currentProfiles) => {
      const nextProfiles = currentProfiles.filter((profileItem) => profileItem.id !== profileId);
      writeStoredValue(sessionUserId, 'viewedProfiles', nextProfiles);
      return nextProfiles;
    });
  }

  function handleClearViewedProfiles() {
    setViewedProfiles([]);
    writeStoredValue(sessionUserId, 'viewedProfiles', []);
  }

  function handleUpdateNotificationPreference(name, value) {
    setNotificationPreferences((currentPreferences) => {
      const nextPreferences = { ...currentPreferences, [name]: value };
      writeStoredValue(sessionUserId, 'notificationPreferences', nextPreferences);
      return nextPreferences;
    });
  }

  async function handleUpdatePrivacyPreference(name, value) {
    if (!sessionProfile) return false;

    if (isPreviewSession) {
      setPreviewProfile((current) => ({
        ...current,
        privacy: { ...(current.privacy ?? {}), [name]: value },
      }));
      return true;
    }

    const nextPrivacy = { ...(sessionProfile.privacy ?? {}), [name]: value };
    return handleUpdateVibelyProfile({
      bio: sessionProfile.bio,
      displayName: sessionProfile.displayName,
      interests: sessionProfile.interests ?? [],
      mainHobby: sessionProfile.mainHobby,
      privacy: nextPrivacy,
      username: sessionProfile.username,
    });
  }

  async function handleAuthComplete(user) {
    if (!user) {
      setAuthMode('login');
      return;
    }
    if (needsEmailVerification(user)) {
      if (auth) await signOut(auth);
      setCurrentUser(null);
      setVibelyProfile(null);
      setAuthNotice('Please verify your email before entering Vibely. Check your inbox and spam folder.');
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
      setProfileError(`Could not load your Vibely profile from Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`);
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
      setProfileError(`Could not create your Vibely profile in Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`);
    }
  }

  async function handleCreatePost(postData) {
    if (isPreviewSession) {
      setPostError('');
      return true;
    }

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
      setPostError(`Could not create post. Check Firestore rules and Cloudinary env settings. (${error.code ?? 'unknown-error'})`);
      return false;
    } finally {
      setIsCreatingPost(false);
    }
  }

  async function handleToggleSave(post) {
    if (isPreviewSession) return true;
    if (!currentUser?.uid) return false;
    setPostError('');
    try {
      return await togglePostSave(post, currentUser.uid);
    } catch (error) {
      setPostError(`Could not save post. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleUpdatePost(postId, postData) {
    if (isPreviewSession) return true;
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
    if (isPreviewSession) return true;
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
    if (isPreviewSession) return true;
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
    if (!sessionProfile?.uid || !targetProfile?.uid) return false;
    setProfileError('');

    if (isPreviewSession) {
      const isNowFollowing = !previewFollowingIds.has(targetProfile.uid);

      setPreviewFollowingIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (isNowFollowing) {
          nextIds.add(targetProfile.uid);
        } else {
          nextIds.delete(targetProfile.uid);
        }

        return nextIds;
      });

      setPreviewProfile((current) => ({
        ...current,
        followingCount: Math.max(0, (current.followingCount ?? 0) + (isNowFollowing ? 1 : -1)),
      }));

      setSelectedPublicProfile((current) => current?.uid === targetProfile.uid
        ? { ...current, followersCount: Math.max(0, (current.followersCount ?? 0) + (isNowFollowing ? 1 : -1)) }
        : current);

      return isNowFollowing;
    }

    try {
      const isNowFollowing = await toggleFollowUser(vibelyProfile, targetProfile);
      setVibelyProfile((current) => current ? { ...current, followingCount: Math.max(0, (current.followingCount ?? 0) + (isNowFollowing ? 1 : -1)) } : current);
      setSelectedPublicProfile((current) => current?.uid === targetProfile.uid ? { ...current, followersCount: Math.max(0, (current.followersCount ?? 0) + (isNowFollowing ? 1 : -1)) } : current);
      return isNowFollowing;
    } catch (error) {
      setProfileError(`Could not update follow. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleToggleBlock(targetProfile) {
    if (!sessionUserId || !targetProfile?.uid) return false;

    if (isPreviewSession) {
      const isNowBlocked = !previewBlockedUserIds.has(targetProfile.uid);

      setPreviewBlockedUserIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (isNowBlocked) {
          nextIds.add(targetProfile.uid);
        } else {
          nextIds.delete(targetProfile.uid);
        }

        return nextIds;
      });

      return isNowBlocked;
    }

    try {
      return await toggleBlockUser(currentUser.uid, targetProfile);
    } catch (error) {
      setProfileError(`Could not update block. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  function handleReport(targetType, targetId) {
    if (!sessionUserId || !targetId) return;
    setReportTarget({ targetId, targetType });
  }

  async function handleSubmitReport({ details, reason, targetId, targetType }) {
    if (!sessionUserId || !targetId) return;

    if (isPreviewSession) {
      setReportNotice('Preview mode captured the report dialog.');
      setReportTarget(null);
      return;
    }

    setIsSubmittingReport(true);
    try {
      await createReport({ currentUserId: currentUser.uid, details, reason, targetId, targetType });
      setReportNotice('Report submitted. Thanks for helping keep Vibely safe.');
      setReportTarget(null);
    } catch (error) {
      setReportNotice(`Could not submit report. (${error.code ?? 'unknown-error'})`);
    } finally {
      setIsSubmittingReport(false);
    }
  }

  function handleViewProfile(profileToView) {
    if (!profileToView) return;
    const resolvedProfile = profileToView.uid ? visibleUserProfiles.find((user) => user.uid === profileToView.uid) ?? profileToView : profileToView;
    setSelectedPublicProfile(resolvedProfile);
    const historyItem = toProfileHistoryItem(resolvedProfile);
    if (historyItem.id && sessionUserId && historyItem.uid !== sessionUserId) {
      setViewedProfiles((currentProfiles) => {
        const nextProfiles = [historyItem, ...currentProfiles.filter((profileItem) => profileItem.id !== historyItem.id)].slice(0, 12);
        writeStoredValue(sessionUserId, 'viewedProfiles', nextProfiles);
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

    if (isPreviewSession) {
      setPreviewProfile((current) => ({
        ...current,
        ...profileData,
        handle: `@${profileData.username.replace(/^@/, '')}`,
      }));
      return true;
    }

    try {
      const updatedProfile = await updateVibelyProfile(currentUser, vibelyProfile, profileData);
      if (currentUser.displayName !== updatedProfile.displayName) {
        await updateProfile(currentUser, { displayName: updatedProfile.displayName });
      }
      setVibelyProfile(updatedProfile);
      return true;
    } catch (error) {
      setProfileError(`Could not update your Vibely profile in Firestore. Check your Firestore rules. (${error.code ?? 'unknown-error'})`);
      return false;
    }
  }

  async function handleSignOut() {
    if (isPreviewSession) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('preview');
      nextUrl.hash = '';
      window.location.href = nextUrl.toString();
      return;
    }

    if (auth) await signOut(auth);
    setAuthMode('login');
    setBlockedUserIds(new Set());
    setChatSummaries([]);
    setFollowingIds(new Set());
    setLiveNotifications([]);
    setLivePosts([]);
    setNotificationPreferences(defaultNotificationPreferences);
    setPostError('');
    setReportNotice('');
    setReportTarget(null);
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
              <p className="eyebrow">Vibely</p>
              <h2>Loading...</h2>
            </div>
            <p className="auth-note">Fetching your profile and live updates.</p>
          </section>
        </main>
      </div>
    );
  }

  const signedInHeader = (
    <Header
      activeView={activeView}
      currentUser={sessionUser}
      isAuthenticated={isSignedIn}
      notificationCount={notificationCount}
      onNavigate={handleNavigate}
      onSearchChange={handleSearchChange}
      onSearchCommit={handleSearchCommit}
      onSearchFocus={handleSearchFocus}
      onSignOut={handleSignOut}
      searchQuery={searchQuery}
      vibelyProfile={sessionProfile}
    />
  );

  return (
    <div className={`app-shell ${isSignedIn && !needsVibelyProfile ? 'signed-in-app-shell' : ''}`}>
      {isSignedIn && !needsVibelyProfile ? (
        <div className="signed-in-shell">
          {signedInHeader}
          <main className={`layout ${showCommunitySidebar ? 'home-layout' : 'focus-layout'}`}>
            <section className="main-column" aria-label={`${activeView} screen`}>
              {reportNotice && <p className="success-message">{reportNotice}</p>}
              <ErrorBoundary key={activeView}>
                <Suspense fallback={<LoadingSkeleton count={3} type="route" />}>
                  {activeView === 'home' && <HomeFeed categories={hobbyCategories} currentUser={sessionUser} feedError={postError} followingIds={visibleFollowingIds} isCreatingPost={isCreatingPost} isLoading={isPreviewSession ? false : isPostsLoading} livePosts={visibleLivePosts} onCreatePost={handleCreatePost} onDeleteComment={handleDeleteComment} onDeletePost={handleDeletePost} onReport={handleReport} onToggleSave={handleToggleSave} onUpdatePost={handleUpdatePost} onViewProfile={handleViewProfile} posts={posts} profile={sessionProfile} savedPostIds={visibleSavedPostIds} />}
                  {activeView === 'search' && <SearchView categories={hobbyCategories} livePosts={visibleLivePosts} onOpenHobby={handleOpenHobby} onRemoveSearchHistory={handleRemoveSearchHistory} onSearchChange={handleSearchChange} onSearchCommit={handleSearchCommit} onViewProfile={handleViewProfile} posts={posts} searchHistory={searchHistory} searchQuery={searchQuery} userProfiles={visibleUserProfiles} />}
                  {activeView === 'explore' && <ExploreView categories={hobbyCategories} feedError={postError} isLoading={isPreviewSession ? false : isPostsLoading} livePosts={visibleLivePosts} onOpenHobby={handleOpenHobby} onRemoveSearchHistory={handleRemoveSearchHistory} onSearchChange={handleSearchChange} onSearchCommit={handleSearchCommit} onViewProfile={handleViewProfile} posts={posts} searchHistory={searchHistory} searchQuery={searchQuery} userProfiles={visibleUserProfiles} />}
                  {activeView === 'reels' && <ReelsView onViewProfile={handleViewProfile} posts={allPostsForDiscovery} />}
                  {activeView === 'hobby' && <HobbyDetailView category={activeHobby} onBack={() => handleNavigate('explore')} onSearchChange={handleSearchChange} posts={allPostsForDiscovery} searchQuery={searchQuery} />}
                  {activeView === 'create' && <CreatePostView categories={hobbyCategories} errorMessage={postError} isSubmitting={isCreatingPost} onCreatePost={handleCreatePost} profile={sessionProfile} />}
                  {activeView === 'messages' && <ChatPanel blockedUserIds={visibleBlockedUserIds} currentUser={sessionUser} followingIds={visibleFollowingIds} onBlock={handleToggleBlock} onFollow={handleToggleFollow} onReport={handleReport} onViewProfile={handleViewProfile} previewChats={previewChatSeeds} previewMessages={previewThreadSeeds} previewMode={isPreviewSession} previewUsers={visibleUserProfiles} profile={sessionProfile} />}
                  {activeView === 'notifications' && <NotificationsView notifications={notifications} onNavigate={handleNavigate} onViewProfile={handleViewProfile} />}
                  {activeView === 'settings' && <SettingsView blockedProfiles={blockedProfiles} currentUser={sessionUser} notificationPreferences={notificationPreferences} onClearSearchHistory={handleClearSearchHistory} onClearViewedProfiles={handleClearViewedProfiles} onNavigate={handleNavigate} onRemoveSearchHistory={handleRemoveSearchHistory} onRemoveViewedProfile={handleRemoveViewedProfile} onToggleBlock={handleToggleBlock} onUpdateNotificationPreference={handleUpdateNotificationPreference} onUpdatePrivacyPreference={handleUpdatePrivacyPreference} onViewProfile={handleViewProfile} profile={sessionProfile} searchHistory={searchHistory} viewedProfiles={viewedProfiles} />}
                  {activeView === 'profile' && <ProfileView appProfile={profilePreview} errorMessage={profileError} livePosts={visibleLivePosts} onUpdateProfile={handleUpdateVibelyProfile} posts={posts} profile={sessionProfile} />}
                  {activeView === 'public-profile' && <PublicProfileView currentUser={sessionUser} followingIds={visibleFollowingIds} isBlocked={Boolean(selectedPublicProfile?.uid && visibleBlockedUserIds.has(selectedPublicProfile.uid))} onBack={() => handleNavigate('explore')} onBlock={handleToggleBlock} onFollow={handleToggleFollow} onReport={handleReport} posts={selectedPublicPosts} profile={selectedPublicProfile} />}
                </Suspense>
              </ErrorBoundary>
            </section>
            {showCommunitySidebar && <aside className="side-column" aria-label="Community sidebar"><SuggestedCreators creators={suggestedCreators} onOpenProfile={() => handleNavigate('profile')} onViewCreator={handleViewProfile} profile={profilePreview} /></aside>}
          </main>
          <BottomNav activeView={activeView} onNavigate={handleNavigate} />
        </div>
      ) : (
        <>
          {signedInHeader}
          {needsVibelyProfile ? <VibelyOnboarding errorMessage={profileError} onComplete={handleCreateVibelyProfile} onSignOut={handleSignOut} user={currentUser} /> : <AuthPage initialMessage={authNotice} mode={authMode} onComplete={handleAuthComplete} onModeChange={setAuthMode} />}
        </>
      )}
      {isSignedIn && !needsVibelyProfile && <ReportDialog isSubmitting={isSubmittingReport} onClose={() => setReportTarget(null)} onSubmit={handleSubmitReport} target={reportTarget} />}
    </div>
  );
}
