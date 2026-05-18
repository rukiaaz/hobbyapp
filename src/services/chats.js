import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';

function getChatId(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort().join('__');
}

function getDateFromTimestamp(timestamp) {
  return timestamp?.toDate ? timestamp.toDate() : null;
}

function getTimeAgo(date) {
  if (!date) {
    return 'just now';
  }

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getParticipantSummary(profile) {
  return {
    uid: profile.uid,
    displayName: profile.displayName,
    handle: profile.handle,
    avatar: profile.avatar,
    mainHobby: profile.mainHobby,
  };
}

export async function ensureChat(currentUser, currentProfile, recipientProfile) {
  const chatId = getChatId(currentUser.uid, recipientProfile.uid);
  const participantProfiles = {
    [currentUser.uid]: getParticipantSummary(currentProfile),
    [recipientProfile.uid]: getParticipantSummary(recipientProfile),
  };

  await setDoc(
    doc(db, 'chats', chatId),
    {
      participants: [currentUser.uid, recipientProfile.uid],
      participantProfiles,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function listenToMessages(currentUserId, otherUserId, onChange, onError) {
  if (!currentUserId || !otherUserId) {
    onChange([]);
    return () => {};
  }

  const chatId = getChatId(currentUserId, otherUserId);
  const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((messageDocument) => {
        const data = messageDocument.data();
        return {
          id: messageDocument.id,
          senderId: data.senderId,
          text: data.text,
          creator: data.creator,
          handle: data.handle,
          avatar: data.avatar,
          timeAgo: getTimeAgo(getDateFromTimestamp(data.createdAt)),
        };
      });

      onChange(messages);
    },
    onError,
  );
}

export async function sendMessage(currentUser, currentProfile, recipientProfile, text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return;
  }

  const chatId = getChatId(currentUser.uid, recipientProfile.uid);
  const chatRef = doc(db, 'chats', chatId);

  await ensureChat(currentUser, currentProfile, recipientProfile);

  await setDoc(
    chatRef,
    {
      lastMessage: trimmedText,
      lastMessageSenderId: currentUser.uid,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId: currentUser.uid,
    recipientId: recipientProfile.uid,
    creator: currentProfile.displayName,
    handle: currentProfile.handle,
    avatar: currentProfile.avatar,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });
}
