import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0).toUpperCase())
    .join('');
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

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw createProfileError('profile/invalid-username', 'Username must be 3-20 lowercase letters, numbers, or underscores.');
  }
}

function getUserProfileRef(uid) {
  return doc(db, 'users', uid);
}

function mapUserProfile(profileDocument) {
  const data = profileDocument.data();
  return {
    id: profileDocument.id,
    followersCount: data.followersCount ?? 0,
    followingCount: data.followingCount ?? 0,
    postsCount: data.postsCount ?? 0,
    ...data,
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

  return {
    followersCount: profileSnapshot.data().followersCount ?? 0,
    followingCount: profileSnapshot.data().followingCount ?? 0,
    postsCount: profileSnapshot.data().postsCount ?? 0,
    ...profileSnapshot.data(),
  };
}

export async function getPublicProfile(uid) {
  return getVibelyProfile(uid);
}

export function listenToUserProfiles(currentUserId, onChange, onError) {
  const usersQuery = query(collection(db, 'users'), orderBy('displayName', 'asc'));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs
        .map(mapUserProfile)
        .filter((profile) => profile.uid !== currentUserId);

      onChange(users);
    },
    onError,
  );
}

export async function saveVibelyProfile(user, profileData) {
  const displayName = profileData.displayName.trim();
  const username = normalizeUsername(profileData.username);
  const mainHobby = profileData.mainHobby.trim();
  const bio = profileData.bio.trim();

  validateProfileFields({ displayName, username, mainHobby, bio });

  const profile = {
    uid: user.uid,
    displayName,
    username,
    handle: `@${username}`,
    avatar: getInitials(displayName),
    mainHobby,
    bio,
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    authProviders: user.providerData.map((provider) => provider.providerId),
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(getUserProfileRef(user.uid), profile, { merge: true });

  return {
    ...profile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateVibelyProfile(user, currentProfile, profileData) {
  const displayName = profileData.displayName.trim();
  const username = normalizeUsername(profileData.username);
  const mainHobby = profileData.mainHobby.trim();
  const bio = profileData.bio.trim();

  validateProfileFields({ displayName, username, mainHobby, bio });

  const profileUpdates = {
    uid: user.uid,
    displayName,
    username,
    handle: `@${username}`,
    avatar: getInitials(displayName),
    mainHobby,
    bio,
    email: user.email ?? currentProfile?.email ?? '',
    photoURL: user.photoURL ?? currentProfile?.photoURL ?? '',
    authProviders: user.providerData.map((provider) => provider.providerId),
    updatedAt: serverTimestamp(),
  };

  await setDoc(getUserProfileRef(user.uid), profileUpdates, { merge: true });

  return {
    ...currentProfile,
    ...profileUpdates,
    updatedAt: new Date().toISOString(),
  };
}

export function listenToFollowing(userId, onChange, onError) {
  if (!userId) {
    onChange(new Set());
    return () => {};
  }

  const followingQuery = query(collection(db, 'users', userId, 'following'), orderBy('createdAt', 'desc'));

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

  const followingRef = doc(db, 'users', currentProfile.uid, 'following', targetProfile.uid);
  const followerRef = doc(db, 'users', targetProfile.uid, 'followers', currentProfile.uid);
  const currentUserRef = doc(db, 'users', currentProfile.uid);
  const targetUserRef = doc(db, 'users', targetProfile.uid);

  return runTransaction(db, async (transaction) => {
    const followingSnapshot = await transaction.get(followingRef);

    if (followingSnapshot.exists()) {
      transaction.delete(followingRef);
      transaction.delete(followerRef);
      transaction.update(currentUserRef, { followingCount: increment(-1) });
      transaction.update(targetUserRef, { followersCount: increment(-1) });
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
    featuredHobbies: [vibelyProfile.mainHobby, ...fallbackProfile.featuredHobbies.slice(1)],
  };
}
