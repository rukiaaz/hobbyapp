const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const REGION = process.env.FUNCTIONS_REGION || 'us-central1';
const REQUIRE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';
const callableOptions = {
  region: REGION,
  enforceAppCheck: REQUIRE_APP_CHECK,
};

const RATE_LIMIT_POLICIES = {
  createPost: [
    { key: 'post-10m', limit: 5, windowSeconds: 10 * 60 },
    { key: 'post-day', limit: 50, windowSeconds: 24 * 60 * 60 },
  ],
  comment: [
    { key: 'comment-minute', limit: 10, windowSeconds: 60 },
    { key: 'comment-day', limit: 150, windowSeconds: 24 * 60 * 60 },
  ],
  message: [
    { key: 'message-minute', limit: 20, windowSeconds: 60 },
    { key: 'message-day', limit: 500, windowSeconds: 24 * 60 * 60 },
  ],
  report: [
    { key: 'report-hour', limit: 5, windowSeconds: 60 * 60 },
    { key: 'report-day', limit: 30, windowSeconds: 24 * 60 * 60 },
  ],
  follow: [{ key: 'follow-hour', limit: 30, windowSeconds: 60 * 60 }],
  reaction: [{ key: 'reaction-minute', limit: 90, windowSeconds: 60 }],
  uploadSignature: [{ key: 'upload-signature-10m', limit: 30, windowSeconds: 10 * 60 }],
  profile: [{ key: 'profile-hour', limit: 20, windowSeconds: 60 * 60 }],
};

const REPORT_REASONS = new Set([
  'spam',
  'harassment',
  'hate',
  'nudity',
  'violence',
  'self-harm',
  'impersonation',
  'scam',
  'underage-safety',
  'other',
]);

function createCallable(handler) {
  return onCall(callableOptions, async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Callable failed', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
      });
      throw new HttpsError('internal', 'Something went wrong. Please try again.');
    }
  });
}

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in before continuing.');
  }

  return request.auth.uid;
}

function cleanString(value, { field, min = 0, max, required = true, pattern } = {}) {
  if (value == null) {
    if (required) {
      throw new HttpsError('invalid-argument', `${field} is required.`);
    }
    return '';
  }

  const cleaned = String(value).trim().replace(/[\u0000-\u001f\u007f]/g, '');

  if (required && cleaned.length < min) {
    throw new HttpsError('invalid-argument', `${field} is too short.`);
  }

  if (!required && cleaned.length === 0) {
    return '';
  }

  if (typeof max === 'number' && cleaned.length > max) {
    throw new HttpsError('invalid-argument', `${field} must be ${max} characters or fewer.`);
  }

  if (pattern && !pattern.test(cleaned)) {
    throw new HttpsError('invalid-argument', `${field} is invalid.`);
  }

  return cleaned;
}

function normalizeUsername(username) {
  return cleanString(username, {
    field: 'Username',
    min: 3,
    max: 20,
    pattern: /^[a-z0-9_]{3,20}$/,
  }).replace(/^@+/, '').toLowerCase();
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0).toUpperCase())
    .join('') || '?';
}

function cleanInterests(value, fallbackInterest) {
  const rawInterests = Array.isArray(value) ? value : [];
  const interests = [fallbackInterest, ...rawInterests]
    .filter(Boolean)
    .map((interest) => cleanString(interest, { field: 'Interest', max: 32, required: false }))
    .filter(Boolean);

  return [...new Set(interests)].slice(0, 8);
}

function cleanPrivacy(value = {}) {
  const profileVisibility = value.profileVisibility === 'private' ? 'private' : 'public';
  const allowedMessagePermissions = new Set(['everyone', 'following', 'none']);
  const messagePermission = allowedMessagePermissions.has(value.messagePermission)
    ? value.messagePermission
    : 'everyone';

  return {
    profileVisibility,
    messagePermission,
    searchDiscoverable: value.searchDiscoverable !== false,
  };
}

function publicProfileFromData(data = {}) {
  return {
    uid: data.uid || '',
    displayName: data.displayName || 'Creator',
    username: data.username || '',
    handle: data.handle || '',
    avatar: data.avatar || '?',
    mainHobby: data.mainHobby || '',
    interests: Array.isArray(data.interests) ? data.interests : [],
    bio: data.bio || '',
    privacy: cleanPrivacy(data.privacy),
    followersCount: data.followersCount ?? 0,
    followingCount: data.followingCount ?? 0,
    postsCount: data.postsCount ?? 0,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

async function getPublicProfile(uid) {
  const snapshot = await db.doc(`users/${uid}`).get();

  if (!snapshot.exists) {
    throw new HttpsError('failed-precondition', 'Complete your profile before continuing.');
  }

  return publicProfileFromData(snapshot.data());
}

async function enforceRateLimit(uid, policy) {
  const now = Date.now();
  const windowMs = policy.windowSeconds * 1000;
  const bucket = Math.floor(now / windowMs);
  const ref = db.collection('rateLimits').doc(`${uid}_${policy.key}_${bucket}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const currentCount = snapshot.exists ? snapshot.data().count ?? 0 : 0;

    if (currentCount >= policy.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil(((bucket + 1) * windowMs - now) / 1000));
      throw new HttpsError(
        'resource-exhausted',
        `Slow down for ${retryAfterSeconds}s before trying again.`,
        { retryAfterSeconds },
      );
    }

    transaction.set(
      ref,
      {
        uid,
        key: policy.key,
        bucket,
        count: currentCount + 1,
        limit: policy.limit,
        windowSeconds: policy.windowSeconds,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis((bucket + 2) * windowMs),
      },
      { merge: true },
    );
  });
}

async function enforceRateLimits(uid, action) {
  const policies = RATE_LIMIT_POLICIES[action] || [];

  for (const policy of policies) {
    await enforceRateLimit(uid, policy);
  }
}

function getChatId(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort().join('__');
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

async function assertNotBlocked(firstUserId, secondUserId) {
  const [firstBlocksSecond, secondBlocksFirst] = await Promise.all([
    db.doc(`users/${firstUserId}/blockedUsers/${secondUserId}`).get(),
    db.doc(`users/${secondUserId}/blockedUsers/${firstUserId}`).get(),
  ]);

  if (firstBlocksSecond.exists || secondBlocksFirst.exists) {
    throw new HttpsError('permission-denied', 'This interaction is blocked.');
  }
}

async function assertCanMessage(senderId, recipientProfile) {
  await assertNotBlocked(senderId, recipientProfile.uid);

  const permission = recipientProfile.privacy?.messagePermission || 'everyone';

  if (permission === 'none') {
    throw new HttpsError('permission-denied', 'This creator is not accepting messages right now.');
  }

  if (permission === 'following') {
    const recipientFollowsSender = await db.doc(`users/${recipientProfile.uid}/following/${senderId}`).get();

    if (!recipientFollowsSender.exists) {
      throw new HttpsError('permission-denied', 'This creator only accepts messages from people they follow.');
    }
  }
}

function cleanMedia(media = {}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const allowedBaseUrl = cloudName ? `https://res.cloudinary.com/${cloudName}/` : 'https://res.cloudinary.com/';
  const mediaUrl = cleanString(media.mediaUrl || media.imageUrl || '', {
    field: 'Media URL',
    max: 500,
    required: false,
  });

  if (mediaUrl && !mediaUrl.startsWith(allowedBaseUrl)) {
    throw new HttpsError('invalid-argument', 'Media must come from the configured Cloudinary account.');
  }

  const mediaType = media.mediaType === 'video' ? 'video' : mediaUrl ? 'image' : '';
  const mediaResourceType = media.mediaResourceType === 'video' ? 'video' : mediaType ? 'image' : '';
  const mediaPublicId = cleanString(media.mediaPublicId || media.imagePublicId || '', {
    field: 'Media public ID',
    max: 180,
    required: false,
  });

  return {
    imagePublicId: mediaPublicId,
    imageUrl: mediaUrl,
    mediaPublicId,
    mediaResourceType,
    mediaType,
    mediaUrl,
  };
}

function createNotification(recipientId, payload) {
  if (!recipientId || payload.actorId === recipientId) {
    return null;
  }

  return db.collection('notifications').add({
    recipientId,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    ...payload,
  });
}

async function saveProfile(uid, authToken = {}, profileInput = {}) {
  await enforceRateLimits(uid, 'profile');

  const displayName = cleanString(profileInput.displayName, { field: 'Display name', min: 1, max: 50 });
  const username = normalizeUsername(profileInput.username);
  const mainHobby = cleanString(profileInput.mainHobby, { field: 'Main hobby', min: 1, max: 40 });
  const bio = cleanString(profileInput.bio, { field: 'Bio', min: 1, max: 160 });
  const interests = cleanInterests(profileInput.interests, mainHobby);
  const privacy = cleanPrivacy(profileInput.privacy);
  const userRef = db.doc(`users/${uid}`);
  const usernameRef = db.doc(`usernames/${username}`);
  const privateRef = db.doc(`users/${uid}/privateSettings/account`);
  let profileForClient = null;

  await db.runTransaction(async (transaction) => {
    const [currentProfileSnapshot, usernameSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(usernameRef),
    ]);

    if (usernameSnapshot.exists && usernameSnapshot.data().uid !== uid) {
      throw new HttpsError('already-exists', 'That username is already taken.');
    }

    const currentProfile = currentProfileSnapshot.exists ? currentProfileSnapshot.data() : {};
    const currentUsername = currentProfile.username;

    if (currentUsername && currentUsername !== username) {
      transaction.delete(db.doc(`usernames/${currentUsername}`));
    }

    const publicProfile = {
      uid,
      displayName,
      username,
      handle: `@${username}`,
      avatar: getInitials(displayName),
      mainHobby,
      interests,
      bio,
      privacy,
      followersCount: currentProfile.followersCount ?? 0,
      followingCount: currentProfile.followingCount ?? 0,
      postsCount: currentProfile.postsCount ?? 0,
      createdAt: currentProfile.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(usernameRef, {
      uid,
      username,
      displayName,
      handle: `@${username}`,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(userRef, {
      ...publicProfile,
      authProviders: FieldValue.delete(),
      email: FieldValue.delete(),
    }, { merge: true });
    transaction.set(privateRef, {
      email: authToken.email || '',
      authProviders: Array.isArray(authToken.firebase?.sign_in_provider)
        ? authToken.firebase.sign_in_provider
        : [authToken.firebase?.sign_in_provider || 'unknown'],
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    profileForClient = {
      ...publicProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return profileForClient;
}

exports.createCloudinaryUploadSignature = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'uploadSignature');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new HttpsError('failed-precondition', 'Cloudinary signed upload config is missing.');
  }

  const uploadKind = request.data?.kind === 'chat' ? 'chat' : 'post';
  const resourceType = request.data?.resourceType === 'video' ? 'video' : 'image';
  const folder = uploadKind === 'chat'
    ? process.env.CLOUDINARY_CHAT_FOLDER || 'hobby-app/chats'
    : process.env.CLOUDINARY_POST_FOLDER || 'hobby-app/posts';
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  const signaturePayload = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(`${signaturePayload}${apiSecret}`)
    .digest('hex');

  return {
    apiKey,
    cloudName,
    folder,
    resourceType,
    signature,
    timestamp,
  };
});

exports.saveVibelyProfile = createCallable(async (request) => {
  const uid = requireAuth(request);
  return saveProfile(uid, request.auth.token, request.data || {});
});

exports.updateVibelyProfile = createCallable(async (request) => {
  const uid = requireAuth(request);
  return saveProfile(uid, request.auth.token, request.data || {});
});

exports.createPost = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'createPost');

  const profile = await getPublicProfile(uid);
  const title = cleanString(request.data?.title, { field: 'Post title', min: 1, max: 80 });
  const caption = cleanString(request.data?.caption, { field: 'Caption', min: 1, max: 240 });
  const hobby = cleanString(request.data?.hobby || profile.mainHobby, { field: 'Hobby', min: 1, max: 40 });
  const categoryId = cleanString(request.data?.categoryId, { field: 'Category', min: 1, max: 40 });
  const media = cleanMedia(request.data?.media || {});
  const postRef = db.collection('posts').doc();

  await db.runTransaction(async (transaction) => {
    transaction.set(postRef, {
      authorId: uid,
      creator: profile.displayName,
      handle: profile.handle,
      avatar: profile.avatar,
      categoryId,
      hobby,
      title,
      caption,
      imageClass: 'gradient-userpost',
      ...media,
      likesCount: 0,
      commentsCount: 0,
      shareCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(db.doc(`users/${uid}`), { postsCount: FieldValue.increment(1) });
  });

  return { id: postRef.id };
});

exports.updatePost = createCallable(async (request) => {
  const uid = requireAuth(request);
  const postId = cleanString(request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const title = cleanString(request.data?.title, { field: 'Post title', min: 1, max: 80 });
  const caption = cleanString(request.data?.caption, { field: 'Caption', min: 1, max: 240 });
  const hobby = cleanString(request.data?.hobby, { field: 'Hobby', min: 1, max: 40 });
  const categoryId = cleanString(request.data?.categoryId, { field: 'Category', min: 1, max: 40 });
  const postRef = db.doc(`posts/${postId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(postRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Post not found.');
    }

    if (snapshot.data().authorId !== uid) {
      throw new HttpsError('permission-denied', 'Only the author can edit this post.');
    }

    transaction.update(postRef, {
      title,
      caption,
      hobby,
      categoryId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

exports.deletePost = createCallable(async (request) => {
  const uid = requireAuth(request);
  const postId = cleanString(request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const postRef = db.doc(`posts/${postId}`);
  const userRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (transaction) => {
    const [postSnapshot, userSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(userRef),
    ]);

    if (!postSnapshot.exists) {
      return;
    }

    if (postSnapshot.data().authorId !== uid) {
      throw new HttpsError('permission-denied', 'Only the author can delete this post.');
    }

    transaction.delete(postRef);
    transaction.update(userRef, { postsCount: Math.max(0, (userSnapshot.data()?.postsCount ?? 1) - 1) });
  });

  return { ok: true };
});

exports.togglePostLike = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'reaction');

  const postId = cleanString(request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const postRef = db.doc(`posts/${postId}`);
  const likeRef = db.doc(`posts/${postId}/likes/${uid}`);
  let isLiked = false;

  await db.runTransaction(async (transaction) => {
    const [postSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(likeRef),
    ]);

    if (!postSnapshot.exists) {
      throw new HttpsError('not-found', 'Post not found.');
    }

    const currentLikes = postSnapshot.data().likesCount ?? 0;

    if (likeSnapshot.exists) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likesCount: Math.max(0, currentLikes - 1) });
      isLiked = false;
      return;
    }

    transaction.set(likeRef, { userId: uid, createdAt: FieldValue.serverTimestamp() });
    transaction.update(postRef, { likesCount: currentLikes + 1 });
    isLiked = true;
  });

  return { isLiked };
});

exports.togglePostSave = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'reaction');

  const post = request.data?.post || {};
  const postId = cleanString(post.id || request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const savedRef = db.doc(`users/${uid}/savedPosts/${postId}`);
  let isSaved = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(savedRef);

    if (snapshot.exists) {
      transaction.delete(savedRef);
      isSaved = false;
      return;
    }

    transaction.set(savedRef, {
      postId,
      postAuthorId: cleanString(post.authorId || '', { field: 'Post author', max: 120, required: false }),
      title: cleanString(post.title || 'Saved post', { field: 'Title', max: 100 }),
      creator: cleanString(post.creator || 'Creator', { field: 'Creator', max: 80 }),
      handle: cleanString(post.handle || '', { field: 'Handle', max: 32, required: false }),
      hobby: cleanString(post.hobby || '', { field: 'Hobby', max: 40, required: false }),
      categoryId: cleanString(post.categoryId || '', { field: 'Category', max: 40, required: false }),
      mediaUrl: cleanString(post.mediaUrl || post.imageUrl || '', { field: 'Media URL', max: 500, required: false }),
      mediaType: post.mediaType === 'video' ? 'video' : post.mediaUrl || post.imageUrl ? 'image' : '',
      isLive: Boolean(post.isLive),
      savedAt: FieldValue.serverTimestamp(),
    });
    isSaved = true;
  });

  return { isSaved };
});

exports.addPostComment = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'comment');

  const postId = cleanString(request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const text = cleanString(request.data?.text, { field: 'Comment', min: 1, max: 280 });
  const profile = await getPublicProfile(uid);
  const postRef = db.doc(`posts/${postId}`);
  const commentRef = db.collection(`posts/${postId}/comments`).doc();

  await db.runTransaction(async (transaction) => {
    const postSnapshot = await transaction.get(postRef);

    if (!postSnapshot.exists) {
      throw new HttpsError('not-found', 'Post not found.');
    }

    const currentComments = postSnapshot.data().commentsCount ?? 0;
    transaction.set(commentRef, {
      authorId: uid,
      creator: profile.displayName,
      handle: profile.handle,
      avatar: profile.avatar,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.update(postRef, { commentsCount: currentComments + 1 });
  });

  const postSnapshot = await postRef.get();
  await createNotification(postSnapshot.data()?.authorId, {
    type: 'comment',
    actorId: uid,
    actorName: profile.displayName,
    postId,
    commentId: commentRef.id,
    title: 'New comment',
    body: `${profile.displayName} commented on your post.`,
  });

  return { id: commentRef.id };
});

exports.deletePostComment = createCallable(async (request) => {
  const uid = requireAuth(request);
  const postId = cleanString(request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const commentId = cleanString(request.data?.commentId, { field: 'Comment ID', min: 1, max: 120 });
  const postRef = db.doc(`posts/${postId}`);
  const commentRef = db.doc(`posts/${postId}/comments/${commentId}`);

  await db.runTransaction(async (transaction) => {
    const [postSnapshot, commentSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(commentRef),
    ]);

    if (!postSnapshot.exists || !commentSnapshot.exists) {
      return;
    }

    const post = postSnapshot.data();
    const comment = commentSnapshot.data();

    if (post.authorId !== uid && comment.authorId !== uid) {
      throw new HttpsError('permission-denied', 'You cannot delete this comment.');
    }

    transaction.delete(commentRef);
    transaction.update(postRef, { commentsCount: Math.max(0, (post.commentsCount ?? 0) - 1) });
  });

  return { ok: true };
});

exports.recordPostShare = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'reaction');

  const postId = cleanString(request.data?.postId, { field: 'Post ID', min: 1, max: 120 });
  const postRef = db.doc(`posts/${postId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(postRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Post not found.');
    }

    transaction.update(postRef, { shareCount: (snapshot.data().shareCount ?? 0) + 1 });
  });

  return { ok: true };
});

exports.ensureChat = createCallable(async (request) => {
  const uid = requireAuth(request);
  const recipientId = cleanString(request.data?.recipientId, { field: 'Recipient ID', min: 1, max: 120 });
  const [currentProfile, recipientProfile] = await Promise.all([
    getPublicProfile(uid),
    getPublicProfile(recipientId),
  ]);

  await assertCanMessage(uid, recipientProfile);

  const chatId = getChatId(uid, recipientId);
  await db.doc(`chats/${chatId}`).set({
    participants: [uid, recipientId],
    participantProfiles: {
      [uid]: getParticipantSummary(currentProfile),
      [recipientId]: getParticipantSummary(recipientProfile),
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { id: chatId };
});

exports.markChatRead = createCallable(async (request) => {
  const uid = requireAuth(request);
  const otherUserId = cleanString(request.data?.otherUserId, { field: 'Other user ID', min: 1, max: 120 });
  const chatId = getChatId(uid, otherUserId);

  await db.doc(`chats/${chatId}`).set({
    lastReadBy: {
      [uid]: FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  return { ok: true };
});

exports.sendMessage = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'message');

  const recipientId = cleanString(request.data?.recipientId, { field: 'Recipient ID', min: 1, max: 120 });
  const text = cleanString(request.data?.text || '', { field: 'Message', max: 500, required: false });
  const media = cleanMedia(request.data?.media || {});

  if (!text && !media.mediaUrl) {
    throw new HttpsError('invalid-argument', 'Write a message or attach a photo.');
  }

  if (media.mediaType === 'video') {
    throw new HttpsError('invalid-argument', 'Chat attachments must be images.');
  }

  const [currentProfile, recipientProfile] = await Promise.all([
    getPublicProfile(uid),
    getPublicProfile(recipientId),
  ]);

  await assertCanMessage(uid, recipientProfile);

  const chatId = getChatId(uid, recipientId);
  const chatRef = db.doc(`chats/${chatId}`);
  const messageRef = db.collection(`chats/${chatId}/messages`).doc();
  const lastMessage = text || '📷 Photo';

  await db.runTransaction(async (transaction) => {
    transaction.set(chatRef, {
      participants: [uid, recipientId],
      participantProfiles: {
        [uid]: getParticipantSummary(currentProfile),
        [recipientId]: getParticipantSummary(recipientProfile),
      },
      lastMessage,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSenderId: uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(messageRef, {
      senderId: uid,
      recipientId,
      text,
      creator: currentProfile.displayName,
      handle: currentProfile.handle,
      avatar: currentProfile.avatar,
      imagePublicId: media.mediaPublicId,
      imageUrl: media.mediaUrl,
      mediaType: media.mediaUrl ? 'image' : '',
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await createNotification(recipientId, {
    type: 'message',
    actorId: uid,
    actorName: currentProfile.displayName,
    chatId,
    title: `Message from ${currentProfile.displayName}`,
    body: lastMessage,
  });

  return { id: messageRef.id };
});

exports.toggleFollowUser = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'follow');

  const targetId = cleanString(request.data?.targetId, { field: 'Target user ID', min: 1, max: 120 });

  if (uid === targetId) {
    throw new HttpsError('invalid-argument', 'You cannot follow yourself.');
  }

  await assertNotBlocked(uid, targetId);

  const [currentProfile, targetProfile] = await Promise.all([
    getPublicProfile(uid),
    getPublicProfile(targetId),
  ]);

  const followingRef = db.doc(`users/${uid}/following/${targetId}`);
  const followerRef = db.doc(`users/${targetId}/followers/${uid}`);
  const currentUserRef = db.doc(`users/${uid}`);
  const targetUserRef = db.doc(`users/${targetId}`);
  let isFollowing = false;

  await db.runTransaction(async (transaction) => {
    const [followingSnapshot, currentSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(followingRef),
      transaction.get(currentUserRef),
      transaction.get(targetUserRef),
    ]);

    const currentFollowingCount = currentSnapshot.data()?.followingCount ?? 0;
    const targetFollowersCount = targetSnapshot.data()?.followersCount ?? 0;

    if (followingSnapshot.exists) {
      transaction.delete(followingRef);
      transaction.delete(followerRef);
      transaction.update(currentUserRef, { followingCount: Math.max(0, currentFollowingCount - 1) });
      transaction.update(targetUserRef, { followersCount: Math.max(0, targetFollowersCount - 1) });
      isFollowing = false;
      return;
    }

    transaction.set(followingRef, {
      ...getParticipantSummary(targetProfile),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(followerRef, {
      ...getParticipantSummary(currentProfile),
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.update(currentUserRef, { followingCount: currentFollowingCount + 1 });
    transaction.update(targetUserRef, { followersCount: targetFollowersCount + 1 });
    isFollowing = true;
  });

  if (isFollowing) {
    await createNotification(targetId, {
      type: 'follow',
      actorId: uid,
      actorName: currentProfile.displayName,
      title: 'New follower',
      body: `${currentProfile.displayName} followed you.`,
    });
  }

  return { isFollowing };
});

exports.toggleBlockUser = createCallable(async (request) => {
  const uid = requireAuth(request);
  const targetId = cleanString(request.data?.targetId, { field: 'Target user ID', min: 1, max: 120 });

  if (uid === targetId) {
    throw new HttpsError('invalid-argument', 'You cannot block yourself.');
  }

  const targetProfile = await getPublicProfile(targetId);
  const blockRef = db.doc(`users/${uid}/blockedUsers/${targetId}`);
  let isBlocked = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(blockRef);

    if (snapshot.exists) {
      transaction.delete(blockRef);
      isBlocked = false;
      return;
    }

    transaction.set(blockRef, {
      ...getParticipantSummary(targetProfile),
      createdAt: FieldValue.serverTimestamp(),
    });
    isBlocked = true;
  });

  return { isBlocked };
});

exports.createReport = createCallable(async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimits(uid, 'report');

  const targetType = cleanString(request.data?.targetType, { field: 'Target type', min: 1, max: 32 });
  const targetId = cleanString(request.data?.targetId, { field: 'Target ID', min: 1, max: 160 });
  const reason = cleanString(request.data?.reason || 'other', { field: 'Reason', min: 1, max: 40 });
  const details = cleanString(request.data?.details || '', { field: 'Details', max: 500, required: false });

  if (!['post', 'user', 'message', 'chat', 'comment'].includes(targetType)) {
    throw new HttpsError('invalid-argument', 'Unsupported report target.');
  }

  if (!REPORT_REASONS.has(reason)) {
    throw new HttpsError('invalid-argument', 'Choose a valid report reason.');
  }

  let targetSnapshot = {};

  if (targetType === 'post') {
    const postSnapshot = await db.doc(`posts/${targetId}`).get();
    if (postSnapshot.exists) {
      const post = postSnapshot.data();
      targetSnapshot = {
        authorId: post.authorId || '',
        title: post.title || '',
        caption: post.caption || '',
      };
    }
  }

  if (targetType === 'user') {
    const profileSnapshot = await db.doc(`users/${targetId}`).get();
    if (profileSnapshot.exists) {
      const profile = profileSnapshot.data();
      targetSnapshot = {
        displayName: profile.displayName || '',
        handle: profile.handle || '',
        bio: profile.bio || '',
      };
    }
  }

  const reportRef = await db.collection('reports').add({
    reporterId: uid,
    targetType,
    targetId,
    reason,
    details,
    status: 'open',
    targetSnapshot,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: reportRef.id };
});
