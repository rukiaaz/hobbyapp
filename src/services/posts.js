import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';

const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
};

function createServiceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getTimeAgo(date) {
  if (!date) {
    return 'just now';
  }

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['min', 60],
  ];

  for (const [label, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds);

    if (value >= 1) {
      return `${value} ${label}${value === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
}

function getDateFromTimestamp(timestamp) {
  return timestamp?.toDate ? timestamp.toDate() : null;
}

async function uploadPostMedia(mediaFile) {
  if (!mediaFile) {
    return {
      imagePublicId: '',
      imageUrl: '',
      mediaPublicId: '',
      mediaResourceType: '',
      mediaType: '',
      mediaUrl: '',
    };
  }

  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    throw createServiceError(
      'cloudinary/not-configured',
      'Cloudinary cloud name and unsigned upload preset are required for photo/video uploads.',
    );
  }

  const formData = new FormData();
  formData.append('file', mediaFile);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw createServiceError(
      'cloudinary/upload-failed',
      result?.error?.message || 'Cloudinary upload failed.',
    );
  }

  const mediaType = result.resource_type === 'video' ? 'video' : 'image';

  return {
    imagePublicId: result.public_id,
    imageUrl: result.secure_url,
    mediaPublicId: result.public_id,
    mediaResourceType: result.resource_type,
    mediaType,
    mediaUrl: result.secure_url,
  };
}

async function mapPostDocument(postDocument, currentUserId) {
  const data = postDocument.data();
  const likedByCurrentUser = currentUserId
    ? await getDoc(doc(db, 'posts', postDocument.id, 'likes', currentUserId))
    : null;
  const createdAt = getDateFromTimestamp(data.createdAt);

  return {
    id: postDocument.id,
    isLive: true,
    authorId: data.authorId,
    creator: data.creator,
    handle: data.handle,
    avatar: data.avatar,
    categoryId: data.categoryId,
    hobby: data.hobby,
    title: data.title,
    caption: data.caption,
    imageClass: data.imageClass || 'gradient-userpost',
    imagePath: data.mediaPublicId || data.imagePublicId || data.imagePath || '',
    imagePublicId: data.imagePublicId || data.mediaPublicId || '',
    imageUrl: data.imageUrl || data.mediaUrl || '',
    mediaPublicId: data.mediaPublicId || data.imagePublicId || '',
    mediaResourceType: data.mediaResourceType || '',
    mediaType: data.mediaType || (data.mediaResourceType === 'video' ? 'video' : data.mediaUrl || data.imageUrl ? 'image' : ''),
    mediaUrl: data.mediaUrl || data.imageUrl || '',
    likesCount: data.likesCount ?? 0,
    commentsCount: data.commentsCount ?? 0,
    shareCount: data.shareCount ?? 0,
    timeAgo: getTimeAgo(createdAt),
    viewerHasLiked: Boolean(likedByCurrentUser?.exists()),
  };
}

export function listenToPosts(currentUserId, onChange, onError) {
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    postsQuery,
    async (snapshot) => {
      const posts = await Promise.all(
        snapshot.docs.map((postDocument) => mapPostDocument(postDocument, currentUserId)),
      );
      onChange(posts);
    },
    onError,
  );
}

export async function createPost(user, profile, postData) {
  const mediaUpload = await uploadPostMedia(postData.mediaFile ?? postData.imageFile);

  return addDoc(collection(db, 'posts'), {
    authorId: user.uid,
    creator: profile.displayName,
    handle: profile.handle,
    avatar: profile.avatar,
    categoryId: postData.categoryId,
    hobby: postData.hobby,
    title: postData.title.trim(),
    caption: postData.caption.trim(),
    imageClass: 'gradient-userpost',
    imagePublicId: mediaUpload.imagePublicId,
    imageUrl: mediaUpload.imageUrl,
    mediaPublicId: mediaUpload.mediaPublicId,
    mediaResourceType: mediaUpload.mediaResourceType,
    mediaType: mediaUpload.mediaType,
    mediaUrl: mediaUpload.mediaUrl,
    likesCount: 0,
    commentsCount: 0,
    shareCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function togglePostLike(postId, userId) {
  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', userId);

  await runTransaction(db, async (transaction) => {
    const likeSnapshot = await transaction.get(likeRef);

    if (likeSnapshot.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likesCount: increment(-1) });
      return;
    }

    transaction.set(likeRef, {
      userId,
      createdAt: serverTimestamp(),
    });
    transaction.update(postRef, { likesCount: increment(1) });
  });
}

export function listenToComments(postId, onChange, onError) {
  const commentsQuery = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs.map((commentDocument) => {
        const data = commentDocument.data();
        return {
          id: commentDocument.id,
          authorId: data.authorId,
          creator: data.creator,
          handle: data.handle,
          avatar: data.avatar,
          text: data.text,
          timeAgo: getTimeAgo(getDateFromTimestamp(data.createdAt)),
        };
      });

      onChange(comments);
    },
    onError,
  );
}

export async function addPostComment(postId, user, profile, text) {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    authorId: user.uid,
    creator: profile.displayName,
    handle: profile.handle,
    avatar: profile.avatar,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'posts', postId), {
    commentsCount: increment(1),
  });
}

export async function recordPostShare(postId) {
  await updateDoc(doc(db, 'posts', postId), {
    shareCount: increment(1),
  });
}

export function createLocalComment(user, profile, text) {
  return {
    id: `local-${Date.now()}`,
    authorId: user.uid,
    creator: profile.displayName,
    handle: profile.handle,
    avatar: profile.avatar,
    text: text.trim(),
    timeAgo: 'just now',
  };
}
