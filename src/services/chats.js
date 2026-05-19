import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { validateChatImageFile } from '../utils/mediaValidation.js';

const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
};

function createServiceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

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

async function uploadChatImage(imageFile) {
  if (!imageFile) {
    return { imagePublicId: '', imageUrl: '' };
  }

  const validation = validateChatImageFile(imageFile);

  if (!validation.isValid) {
    throw createServiceError('media/invalid-file', validation.message);
  }

  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    throw createServiceError(
      'cloudinary/not-configured',
      'Cloudinary cloud name and unsigned upload preset are required for chat photos.',
    );
  }

  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw createServiceError(
      'cloudinary/upload-failed',
      result?.error?.message || 'Cloudinary chat image upload failed.',
    );
  }

  return {
    imagePublicId: result.public_id,
    imageUrl: result.secure_url,
  };
}

function normalizeMessageInput(messageInput) {
  if (typeof messageInput === 'string') {
    return { imageFile: null, text: messageInput };
  }

  return {
    imageFile: messageInput?.imageFile ?? null,
    text: messageInput?.text ?? '',
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
    },
    { merge: true },
  );
}

export function listenToUserChats(currentUserId, onChange, onError) {
  if (!currentUserId) {
    onChange([]);
    return () => {};
  }

  const chatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', currentUserId));

  return onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats = snapshot.docs
        .map((chatDocument) => {
          const data = chatDocument.data();
          const hasLastMessage = Boolean(data.lastMessage);
          const lastMessageDate = hasLastMessage ? getDateFromTimestamp(data.lastMessageAt || data.updatedAt) : null;
          const lastReadDate = getDateFromTimestamp(data.lastReadBy?.[currentUserId]);
          const isUnread = Boolean(
            hasLastMessage
              && data.lastMessageSenderId !== currentUserId
              && (!lastReadDate || (lastMessageDate && lastMessageDate > lastReadDate)),
          );

          return {
            id: chatDocument.id,
            lastMessage: data.lastMessage || '',
            lastMessageAt: lastMessageDate,
            lastMessageSenderId: data.lastMessageSenderId || '',
            lastMessageTimeAgo: hasLastMessage ? getTimeAgo(lastMessageDate) : '',
            lastReadAt: lastReadDate,
            lastReadBy: data.lastReadBy || {},
            isUnread,
            participants: data.participants || [],
            participantProfiles: data.participantProfiles || {},
            updatedAt: lastMessageDate,
          };
        })
        .sort((first, second) => (second.updatedAt?.getTime() ?? 0) - (first.updatedAt?.getTime() ?? 0));

      onChange(chats);
    },
    onError,
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
          recipientId: data.recipientId,
          text: data.text || '',
          creator: data.creator,
          handle: data.handle,
          avatar: data.avatar,
          imagePublicId: data.imagePublicId || '',
          imageUrl: data.imageUrl || '',
          mediaType: data.mediaType || '',
          createdAt: getDateFromTimestamp(data.createdAt),
          createdAtLabel: getDateFromTimestamp(data.createdAt)
            ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(getDateFromTimestamp(data.createdAt))
            : 'just now',
          timeAgo: getTimeAgo(getDateFromTimestamp(data.createdAt)),
        };
      });

      onChange(messages);
    },
    onError,
  );
}

export async function markChatRead(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId) {
    return;
  }

  const chatId = getChatId(currentUserId, otherUserId);

  await setDoc(
    doc(db, 'chats', chatId),
    {
      lastReadBy: {
        [currentUserId]: serverTimestamp(),
      },
    },
    { merge: true },
  );
}

export async function sendMessage(currentUser, currentProfile, recipientProfile, messageInput) {
  const { imageFile, text } = normalizeMessageInput(messageInput);
  const trimmedText = text.trim();

  if (!trimmedText && !imageFile) {
    return;
  }

  const { imagePublicId, imageUrl } = await uploadChatImage(imageFile);
  const chatId = getChatId(currentUser.uid, recipientProfile.uid);
  const chatRef = doc(db, 'chats', chatId);
  const lastMessage = trimmedText || '📷 Photo';

  await ensureChat(currentUser, currentProfile, recipientProfile);

  await setDoc(
    chatRef,
    {
      lastMessage,
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
    imagePublicId,
    imageUrl,
    mediaType: imageUrl ? 'image' : '',
    createdAt: serverTimestamp(),
  });
}
