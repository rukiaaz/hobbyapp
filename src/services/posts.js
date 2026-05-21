import {
  addDoc,
  collection,
  deleteDoc,
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
  updateDoc,
  where,
} from 'firebase/firestore';
import { callAppFunction, shouldUseDirectFirestoreFallback } from './api.js';
import { db } from './firebase.js';
import { enforceClientCooldown } from '../utils/actionGuards.js';
import { validatePostMediaFile } from '../utils/mediaValidation.js';

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

function getReadableTimestamp(date) {
  if (!date) {
    return 'just now';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getMediaResourceType(mediaFile) {
  return mediaFile?.type?.startsWith('video/') ? 'video' : 'image';
}

async function uploadPostMediaWithUnsignedPreset(mediaFile) {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    throw createServiceError(
      'cloudinary/not-configured',
      'Cloudinary cloud name and unsigned upload preset are required for local direct uploads.',
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

  return result;
}

async function uploadPostMediaWithSignature(mediaFile) {
  enforceClientCooldown('uploadSignature');

  const resourceType = getMediaResourceType(mediaFile);
  const signature = await callAppFunction('createCloudinaryUploadSignature', {
    kind: 'post',
    resourceType,
  });

  const formData = new FormData();
  formData.append('file', mediaFile);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', signature.timestamp);
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
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

  return result;
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

  const validation = validatePostMediaFile(mediaFile);

  if (!validation.isValid) {
    throw createServiceError('media/invalid-file', validation.message);
  }

  const result = shouldUseDirectFirestoreFallback()
    ? await uploadPostMediaWithUnsignedPreset(mediaFile)
    : await uploadPostMediaWithSignature(mediaFile);
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
    createdAtLabel: getReadableTimestamp(createdAt),
    updatedAt: data.updatedAt || null,
    viewerHasLiked: Boolean(likedByCurrentUser?.exists()),
  };
}

export function listenToPosts(currentUserId, onChange, onError) {
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), queryLimit(50));

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

export function listenToUserPosts(userId, currentUserId, onChange, onError) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  const postsQuery = query(
    collection(db, 'posts'),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    queryLimit(50),
  );

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
  enforceClientCooldown('post');
  const mediaUpload = await uploadPostMedia(postData.mediaFile ?? postData.imageFile);

  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('createPost', {
      caption: postData.caption,
      categoryId: postData.categoryId,
      hobby: postData.hobby,
      media: mediaUpload,
      title: postData.title,
    });
  }

  const postRef = await addDoc(collection(db, 'posts'), {
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

  await updateDoc(doc(db, 'users', user.uid), {
    postsCount: increment(1),
  });

  return postRef;
}

export async function updatePost(postId, postData) {
  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('updatePost', { postId, ...postData });
  }

  const updates = {
    categoryId: postData.categoryId,
    hobby: postData.hobby.trim(),
    title: postData.title.trim(),
    caption: postData.caption.trim(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'posts', postId), updates);
}

export async function deletePost(postId) {
  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('deletePost', { postId });
  }

  const postRef = doc(db, 'posts', postId);
  const postSnapshot = await getDoc(postRef);
  const authorId = postSnapshot.data()?.authorId;

  await deleteDoc(postRef);

  if (authorId) {
    await updateDoc(doc(db, 'users', authorId), {
      postsCount: increment(-1),
    });
  }
}

export async function togglePostLike(postId, userId) {
  enforceClientCooldown('reaction');

  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('togglePostLike', { postId });
  }

  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', userId);

  await runTransaction(db, async (transaction) => {
    const [postSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(likeRef),
    ]);

    const currentLikes = postSnapshot.data()?.likesCount ?? 0;

    if (likeSnapshot.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likesCount: Math.max(0, currentLikes - 1) });
      return;
    }

    transaction.set(likeRef, {
      userId,
      createdAt: serverTimestamp(),
    });
    transaction.update(postRef, { likesCount: currentLikes + 1 });
  });
}

export function listenToSavedPosts(userId, onChange, onError) {
  if (!userId) {
    onChange(new Set());
    return () => {};
  }

  const savedQuery = query(collection(db, 'users', userId, 'savedPosts'), orderBy('savedAt', 'desc'), queryLimit(100));

  return onSnapshot(
    savedQuery,
    (snapshot) => {
      onChange(new Set(snapshot.docs.map((savedDocument) => savedDocument.id)));
    },
    onError,
  );
}

export async function togglePostSave(post, userId) {
  enforceClientCooldown('save');

  if (!shouldUseDirectFirestoreFallback()) {
    const result = await callAppFunction('togglePostSave', { post });
    return result.isSaved;
  }

  const savedRef = doc(db, 'users', userId, 'savedPosts', post.id);
  const savedSnapshot = await getDoc(savedRef);

  if (savedSnapshot.exists()) {
    await deleteDoc(savedRef);
    return false;
  }

  await setDoc(savedRef, {
    postId: post.id,
    postAuthorId: post.authorId || '',
    title: post.title,
    creator: post.creator,
    handle: post.handle,
    hobby: post.hobby,
    categoryId: post.categoryId,
    mediaUrl: post.mediaUrl || post.imageUrl || '',
    mediaType: post.mediaType || '',
    isLive: Boolean(post.isLive),
    savedAt: serverTimestamp(),
  });

  return true;
}

export function listenToComments(postId, onChange, onError) {
  const commentsQuery = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), queryLimit(100));

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
          createdAtLabel: getReadableTimestamp(getDateFromTimestamp(data.createdAt)),
        };
      });

      onChange(comments);
    },
    onError,
  );
}

export async function deletePostComment(postId, commentId) {
  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('deletePostComment', { postId, commentId });
  }

  const postRef = doc(db, 'posts', postId);
  const postSnapshot = await getDoc(postRef);
  const commentsCount = postSnapshot.data()?.commentsCount ?? 0;

  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  await updateDoc(postRef, {
    commentsCount: Math.max(0, commentsCount - 1),
  });
}

export async function addPostComment(postId, user, profile, text) {
  enforceClientCooldown('comment');

  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('addPostComment', { postId, text });
  }

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
  enforceClientCooldown('share');

  if (!shouldUseDirectFirestoreFallback()) {
    return callAppFunction('recordPostShare', { postId });
  }

  const postRef = doc(db, 'posts', postId);
  const postSnapshot = await getDoc(postRef);
  const shareCount = postSnapshot.data()?.shareCount ?? 0;

  await updateDoc(postRef, {
    shareCount: shareCount + 1,
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
    createdAtLabel: 'just now',
  };
}
