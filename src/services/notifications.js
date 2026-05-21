import { collection, limit as queryLimit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase.js';

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

export function listenToNotifications(currentUserId, onChange, onError) {
  if (!currentUserId) {
    onChange([]);
    return () => {};
  }

  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('recipientId', '==', currentUserId),
    orderBy('createdAt', 'desc'),
    queryLimit(50),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((notificationDocument) => {
        const data = notificationDocument.data();
        const createdAt = getDateFromTimestamp(data.createdAt);

        return {
          id: notificationDocument.id,
          body: data.body || 'New activity on Hobby App.',
          icon: data.type === 'follow' ? '＋' : data.type === 'message' ? '✉' : data.type === 'comment' ? '💬' : '♥',
          isUnread: data.read === false,
          meta: getTimeAgo(createdAt),
          postId: data.postId || '',
          profile: data.actorId
            ? {
                uid: data.actorId,
                displayName: data.actorName || 'Creator',
              }
            : null,
          title: data.title || 'New notification',
          type: data.type || 'activity',
          view: data.type === 'message' ? 'messages' : data.type === 'comment' ? 'profile' : '',
        };
      });

      onChange(notifications);
    },
    onError,
  );
}
