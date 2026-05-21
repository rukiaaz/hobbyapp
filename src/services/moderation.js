import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit as queryLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { callAppFunction, shouldUseDirectFirestoreFallback } from './api.js';
import { db } from './firebase.js';
import { enforceClientCooldown } from '../utils/actionGuards.js';

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or repetitive content' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate or discrimination' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'violence', label: 'Violence or dangerous behavior' },
  { id: 'self-harm', label: 'Self-harm concern' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'scam', label: 'Scam or fraud' },
  { id: 'underage-safety', label: 'Underage safety concern' },
  { id: 'other', label: 'Something else' },
];

export async function createReport({ currentUserId, details = '', reason = 'other', targetId, targetType }) {
  if (!currentUserId || !targetId || !targetType) {
    return null;
  }

  enforceClientCooldown('report');

  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('createReport', {
      details,
      reason,
      targetId,
      targetType,
    });
  }

  return addDoc(collection(db, 'reports'), {
    reporterId: currentUserId,
    targetId,
    targetType,
    reason,
    details,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function listenToBlockedUsers(currentUserId, onChange, onError) {
  if (!currentUserId) {
    onChange(new Set());
    return () => {};
  }

  const blockedQuery = query(
    collection(db, 'users', currentUserId, 'blockedUsers'),
    orderBy('createdAt', 'desc'),
    queryLimit(100),
  );

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

  if (!shouldUseDirectFirestoreFallback()) {
    const result = await callAppFunction('toggleBlockUser', { targetId: targetProfile.uid });
    return result.isBlocked;
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
