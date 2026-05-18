import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
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

function getUserProfileRef(uid) {
  return doc(db, 'users', uid);
}

function mapUserProfile(profileDocument) {
  return {
    id: profileDocument.id,
    ...profileDocument.data(),
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

  return profileSnapshot.data();
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
    featuredHobbies: [vibelyProfile.mainHobby, ...fallbackProfile.featuredHobbies.slice(1)],
  };
}
