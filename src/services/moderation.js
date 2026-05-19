import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

export async function createReport({ currentUserId, reason = 'placeholder', targetId, targetType }) {
  if (!currentUserId || !targetId || !targetType) {
    return null;
  }

  return addDoc(collection(db, 'reports'), {
    reporterId: currentUserId,
    targetId,
    targetType,
    reason,
    status: 'placeholder',
    createdAt: serverTimestamp(),
  });
}

export function listenToBlockedUsers(currentUserId, onChange, onError) {
  if (!currentUserId) {
    onChange(new Set());
    return () => {};
  }

  const blockedQuery = query(collection(db, 'users', currentUserId, 'blockedUsers'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    blockedQuery,
    (snapshot) => onChange(new Set(snapshot.docs.map((blockedDocument) => blockedDocument.id))),
    onError,
  );
}

export async function toggleBlockUser(currentUserId, targetProfile) {
  if (!currentUserId || !targetProfile?.uid || currentUserId === targetProfile.uid) {
    return false;
  }

  const blockRef = doc(db, 'users', currentUserId, 'blockedUsers', targetProfile.uid);
  const blockSnapshot = await getDoc(blockRef);

  if (blockSnapshot.exists()) {
    await deleteDoc(blockRef);
    return false;
  }

  await setDoc(blockRef, {
    uid: targetProfile.uid,
    displayName: targetProfile.displayName,
    handle: targetProfile.handle,
    avatar: targetProfile.avatar,
    mainHobby: targetProfile.mainHobby,
    createdAt: serverTimestamp(),
  });

  return true;
}
