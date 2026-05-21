import {
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  limit as queryLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { callAppFunction, shouldUseDirectFirestoreFallback } from './api.js';
import { db } from './firebase.js';
import { enforceClientCooldown } from '../utils/actionGuards.js';

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0).toUpperCase())
    .join('') || '?';
}

function normalizeUsername(username) {
  return username.trim().replace(/^@+/, '').toLowerCase();
}

function createProfileError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function validateProfileFields({ displayName, username, mainHobby, bio }) {
  if (!displayName || !mainHobby || !bio) {
    throw createProfileError('profile/blank-field', 'Display name, main hobby, and bio are required.');
  }

  if (displayName.length > 50) {
    throw createProfileError('profile/display-name-too-long', 'Display name must be 50 characters or fewer.');
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw createProfileError('profile/invalid-username', 'Username must be 3-20 lowercase letters, numbers, or underscores.');
  }

  if (mainHobby.length > 40) {
    throw createProfileError('profile/hobby-too-long', 'Main hobby must be 40 characters or fewer.');
  }

  if (bio.length > 160) {
    throw createProfileError('profile/bio-too-long', 'Bio must be 160 characters or fewer.');
  }
}

function getUserProfileRef(uid) {
  return doc(db, 'users', uid);
}

function getUsernameRef(username) {
  return doc(db, 'usernames', username);
}

function cleanInterests(interests, mainHobby) {
  return [mainHobby, ...(Array.isArray(interests) ? interests : [])]
    .filter(Boolean)
    .map((interest) => String(interest).trim())
    .filter(Boolean)
    .filter((interest, index, all) => all.indexOf(interest) === index)
    .slice(0, 8);
}

function cleanPrivacy(privacy = {}) {
  return {
    profileVisibility: privacy.profileVisibility === 'private' ? 'private' : 'public',
    messagePermission: ['everyone', 'following', 'none'].includes(privacy.messagePermission)
      ? privacy.messagePermission
      : 'everyone',
    searchDiscoverable: privacy.searchDiscoverable !== false,
  };
}

function mapUserProfile(profileDocument) {
  const data = profileDocument.data();
  return {
    id: profileDocument.id,
    followersCount: data.followersCount ?? 0,
    followingCount: data.followingCount ?? 0,
    postsCount: data.postsCount ?? 0,
    interests: Array.isArray(data.interests) ? data.interests : [],
    privacy: cleanPrivacy(data.privacy),
    ...data,
    email: undefined,
    authProviders: undefined,
  };
}

export async function getVibelyProfile(uid) {
  if (!uid) {
    return null;
  }

  const profileSnapshot = await getDoc(getUserProfileRef(uid));

  if (!profileSnapshot.exists()) {
    return null;
  }

  return mapUserProfile(profileSnapshot);
}

export async function getPublicProfile(uid) {
  return getVibelyProfile(uid);
}

export function listenToUserProfiles(currentUserId, onChange, onError) {
  const usersQuery = query(collection(db, 'users'), orderBy('displayName', 'asc'), queryLimit(80));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs
        .map(mapUserProfile)
        .filter((profile) => profile.uid !== currentUserId)
        .filter((profile) => profile.privacy?.searchDiscoverable !== false);

      onChange(users);
    },
    onError,
  );
}

async function saveProfileDirectly(user, currentProfile, profileData) {
  const displayName = profileData.displayName.trim();
  const username = normalizeUsername(profileData.username);
  const mainHobby = profileData.mainHobby.trim();
  const bio = profileData.bio.trim();
  const interests = cleanInterests(profileData.interests, mainHobby);
  const privacy = cleanPrivacy(profileData.privacy ?? currentProfile?.privacy);

  validateProfileFields({ displayName, username, mainHobby, bio });

  const userRef = getUserProfileRef(user.uid);
  const usernameRef = getUsernameRef(username);
  const privateAccountRef = doc(db, 'users', user.uid, 'privateSettings', 'account');
  let savedProfile = null;

  await runTransaction(db, async (transaction) => {
    const [currentProfileSnapshot, usernameSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(usernameRef),
    ]);
    const existingProfile = currentProfileSnapshot.exists() ? currentProfileSnapshot.data() : currentProfile ?? {};

    if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== user.uid) {
      throw createProfileError('profile/username-taken', 'That username is already taken.');
    }

    if (existingProfile.username && existingProfile.username !== username) {
      transaction.delete(getUsernameRef(existingProfile.username));
    }

    const publicProfile = {
      uid: user.uid,
      displayName,
      username,
      handle: `@${username}`,
      avatar: getInitials(displayName),
      mainHobby,
      interests,
      bio,
      privacy,
      followersCount: existingProfile.followersCount ?? 0,
      followingCount: existingProfile.followingCount ?? 0,
      postsCount: existingProfile.postsCount ?? 0,
      createdAt: existingProfile.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(usernameRef, {
      uid: user.uid,
      username,
      displayName,
      handle: `@${username}`,
      updatedAt: serverTimestamp(),
    });
    transaction.set(userRef, {
      ...publicProfile,
      authProviders: deleteField(),
      email: deleteField(),
    }, { merge: true });
    transaction.set(privateAccountRef, {
      email: user.email ?? '',
      authProviders: user.providerData.map((provider) => provider.providerId),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    savedProfile = {
      ...existingProfile,
      ...publicProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return savedProfile;
}

export async function saveVibelyProfile(user, profileData) {
  const displayName = profileData.displayName.trim();
  const username = normalizeUsername(profileData.username);
  const mainHobby = profileData.mainHobby.trim();
  const bio = profileData.bio.trim();

  validateProfileFields({ displayName, username, mainHobby, bio });

  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('saveVibelyProfile', {
      ...profileData,
      displayName,
      username,
      mainHobby,
      bio,
    });
  }

  return saveProfileDirectly(user, null, {
    ...profileData,
    displayName,
    username,
    mainHobby,
    bio,
  });
}

export async function updateVibelyProfile(user, currentProfile, profileData) {
  const displayName = profileData.displayName.trim();
  const username = normalizeUsername(profileData.username);
  const mainHobby = profileData.mainHobby.trim();
  const bio = profileData.bio.trim();

  validateProfileFields({ displayName, username, mainHobby, bio });

  if (!shouldUseDirectFirestoreFallback()) {
    const updatedProfile = await callAppFunction('updateVibelyProfile', {
      ...profileData,
      displayName,
      username,
      mainHobby,
      bio,
    });
    return {
      ...currentProfile,
      ...updatedProfile,
    };
  }

  return saveProfileDirectly(user, currentProfile, {
    ...profileData,
    displayName,
    username,
    mainHobby,
    bio,
  });
}

export function listenToFollowing(userId, onChange, onError) {
  if (!userId) {
    onChange(new Set());
    return () => {};
  }

  const followingQuery = query(collection(db, 'users', userId, 'following'), orderBy('createdAt', 'desc'), queryLimit(500));

  return onSnapshot(
    followingQuery,
    (snapshot) => onChange(new Set(snapshot.docs.map((followingDocument) => followingDocument.id))),
    onError,
  );
}

export async function toggleFollowUser(currentProfile, targetProfile) {
  if (!currentProfile?.uid || !targetProfile?.uid || currentProfile.uid === targetProfile.uid) {
    return false;
  }

  enforceClientCooldown('follow');

  if (!shouldUseDirectFirestoreFallback()) {
    const result = await callAppFunction('toggleFollowUser', { targetId: targetProfile.uid });
    return result.isFollowing;
  }

  const followingRef = doc(db, 'users', currentProfile.uid, 'following', targetProfile.uid);
  const followerRef = doc(db, 'users', targetProfile.uid, 'followers', currentProfile.uid);
  const currentUserRef = doc(db, 'users', currentProfile.uid);
  const targetUserRef = doc(db, 'users', targetProfile.uid);

  return runTransaction(db, async (transaction) => {
    const [followingSnapshot, currentSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(followingRef),
      transaction.get(currentUserRef),
      transaction.get(targetUserRef),
    ]);
    const currentFollowingCount = currentSnapshot.data()?.followingCount ?? 0;
    const targetFollowersCount = targetSnapshot.data()?.followersCount ?? 0;

    if (followingSnapshot.exists()) {
      transaction.delete(followingRef);
      transaction.delete(followerRef);
      transaction.update(currentUserRef, { followingCount: Math.max(0, currentFollowingCount - 1) });
      transaction.update(targetUserRef, { followersCount: Math.max(0, targetFollowersCount - 1) });
      return false;
    }

    transaction.set(followingRef, {
      uid: targetProfile.uid,
      displayName: targetProfile.displayName,
      handle: targetProfile.handle,
      avatar: targetProfile.avatar,
      mainHobby: targetProfile.mainHobby,
      createdAt: serverTimestamp(),
    });
    transaction.set(followerRef, {
      uid: currentProfile.uid,
      displayName: currentProfile.displayName,
      handle: currentProfile.handle,
      avatar: currentProfile.avatar,
      mainHobby: currentProfile.mainHobby,
      createdAt: serverTimestamp(),
    });
    transaction.update(currentUserRef, { followingCount: increment(1) });
    transaction.update(targetUserRef, { followersCount: increment(1) });
    return true;
  });
}

export function toAppProfile(vibelyProfile, fallbackProfile) {
  if (!vibelyProfile) {
    return fallbackProfile;
  }

  return {
    ...fallbackProfile,
    name: vibelyProfile.displayName,
    username: vibelyProfile.handle,
    avatar: vibelyProfile.avatar,
    bio: vibelyProfile.bio,
    followers: vibelyProfile.followersCount ?? fallbackProfile.followers,
    following: vibelyProfile.followingCount ?? fallbackProfile.following,
    posts: vibelyProfile.postsCount ?? fallbackProfile.posts,
    featuredHobbies: [vibelyProfile.mainHobby, ...(vibelyProfile.interests ?? fallbackProfile.featuredHobbies).slice(1)],
  };
}
