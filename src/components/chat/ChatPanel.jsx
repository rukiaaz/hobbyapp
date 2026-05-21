import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureChat, listenToMessages, listenToUserChats, markChatRead, sendMessage } from '../../services/chats.js';
import { listenToUserProfiles } from '../../services/vibelyProfile.js';

function getChatPartnerId(chat, currentUserId) {
  return chat.participants.find((participantId) => participantId !== currentUserId) || '';
}

function clonePreviewThreads(previewMessages) {
  return Object.fromEntries(
    Object.entries(previewMessages).map(([userId, messages]) => [userId, [...messages]]),
  );
}

export default function ChatPanel({
  blockedUserIds = new Set(),
  currentUser,
  followingIds = new Set(),
  onBlock,
  onFollow,
  onReport,
  onViewProfile,
  previewChats = [],
  previewMessages = {},
  previewMode = false,
  previewUsers = [],
  profile,
}) {
  const [chatError, setChatError] = useState('');
  const [chatSummaries, setChatSummaries] = useState(previewMode ? previewChats : []);
  const [conversationSearch, setConversationSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [previewThreads, setPreviewThreads] = useState(() => clonePreviewThreads(previewMessages));
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState(previewMode ? previewUsers : []);
  const messagesEndRef = useRef(null);

  const selectedUser = useMemo(() => users.find((user) => user.uid === selectedUserId) ?? null, [selectedUserId, users]);

  const chatByUserId = useMemo(() => {
    const summaries = new Map();

    chatSummaries.forEach((chat) => {
      const partnerId = getChatPartnerId(chat, currentUser?.uid);

      if (partnerId) {
        summaries.set(partnerId, chat);
      }
    });

    return summaries;
  }, [chatSummaries, currentUser?.uid]);

  const conversationUsers = useMemo(() => {
    const normalizedSearch = conversationSearch.trim().toLowerCase();

    return users
      .filter((user) => !blockedUserIds.has(user.uid))
      .map((user) => {
        const chat = chatByUserId.get(user.uid);
        const latestPrefix = chat?.lastMessageSenderId === currentUser?.uid ? 'You: ' : '';

        return {
          ...user,
          chat,
          isUnread: Boolean(chat?.isUnread),
          latestMessage: chat?.lastMessage ? `${latestPrefix}${chat.lastMessage}` : 'Tap to start a conversation',
          latestTime: chat?.lastMessageTimeAgo ?? '',
          sortTime: chat?.updatedAt?.getTime?.() ?? 0,
        };
      })
      .filter((user) => {
        if (!normalizedSearch) {
          return true;
        }

        return [user.displayName, user.handle, user.mainHobby, user.latestMessage]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) => {
        if (second.sortTime !== first.sortTime) {
          return second.sortTime - first.sortTime;
        }

        return first.displayName.localeCompare(second.displayName);
      });
  }, [blockedUserIds, chatByUserId, conversationSearch, currentUser?.uid, users]);

  useEffect(() => {
    setPreviewThreads(clonePreviewThreads(previewMessages));
  }, [previewMessages]);

  useEffect(() => {
    if (previewMode) {
      setUsers(previewUsers);
      return undefined;
    }

    if (!currentUser?.uid) {
      setUsers([]);
      return undefined;
    }

    return listenToUserProfiles(
      currentUser.uid,
      setUsers,
      (error) => setChatError(`Could not load Vibely users. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, previewMode, previewUsers]);

  useEffect(() => {
    if (previewMode) {
      setChatSummaries(previewChats);
      return undefined;
    }

    if (!currentUser?.uid) {
      setChatSummaries([]);
      return undefined;
    }

    return listenToUserChats(
      currentUser.uid,
      setChatSummaries,
      (error) => setChatError(`Could not load chats. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid, previewChats, previewMode]);

  useEffect(() => {
    if (selectedUserId && conversationUsers.some((user) => user.uid === selectedUserId)) {
      return;
    }

    setSelectedUserId(conversationUsers[0]?.uid || '');
  }, [conversationUsers, selectedUserId]);

  useEffect(() => {
    let unsubscribe = () => {};
    let isActive = true;

    if (!selectedUser?.uid || !profile) {
      setMessages([]);
      return unsubscribe;
    }

    if (previewMode) {
      setMessages(previewThreads[selectedUser.uid] ?? []);
      return unsubscribe;
    }

    ensureChat(currentUser, profile, selectedUser)
      .then(() => {
        if (!isActive) {
          return;
        }

        unsubscribe = listenToMessages(
          currentUser.uid,
          selectedUser.uid,
          setMessages,
          (error) => setChatError(`Could not load messages. (${error.code ?? 'unknown-error'})`),
        );
      })
      .catch((error) => {
        if (isActive) {
          setChatError(`Could not start chat. (${error.code ?? 'unknown-error'})`);
        }
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [currentUser, previewMode, previewThreads, profile, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

    if (!previewMode && selectedUser?.uid && currentUser?.uid && messages.length > 0) {
      markChatRead(currentUser.uid, selectedUser.uid).catch(() => {});
    }
  }, [currentUser?.uid, messages, previewMode, selectedUser?.uid]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUser || !draft.trim()) {
      return;
    }

    setChatError('');
    setIsSending(true);

    if (previewMode) {
      const nextMessage = {
        id: `preview-${Date.now()}`,
        senderId: currentUser.uid,
        text: draft.trim(),
        timeAgo: 'now',
      };

      setPreviewThreads((currentThreads) => ({
        ...currentThreads,
        [selectedUser.uid]: [...(currentThreads[selectedUser.uid] ?? []), nextMessage],
      }));

      setChatSummaries((currentChats) => currentChats.map((chat) => {
        if (getChatPartnerId(chat, currentUser.uid) !== selectedUser.uid) {
          return chat;
        }

        return {
          ...chat,
          isUnread: false,
          lastMessage: nextMessage.text,
          lastMessageSenderId: currentUser.uid,
          lastMessageTimeAgo: 'now',
          updatedAt: new Date(),
        };
      }));

      setDraft('');
      setIsSending(false);
      return;
    }

    try {
      await sendMessage(currentUser, profile, selectedUser, { text: draft });
      setDraft('');
    } catch (error) {
      setChatError(`Could not send message. (${error.code ?? 'unknown-error'})`);
    } finally {
      setIsSending(false);
    }
  }

  const selectedIsBlocked = selectedUser?.uid ? blockedUserIds.has(selectedUser.uid) : false;
  const selectedIsFollowing = selectedUser?.uid ? followingIds.has(selectedUser.uid) : false;

  return (
    <section className="chat-card" aria-labelledby="chat-title">
      <div className="section-heading">
        <div>
          <p id="chat-title">Messages</p>
          <span>{selectedUser ? `Chatting with ${selectedUser.displayName}` : 'Choose a conversation'}</span>
        </div>
      </div>

      {chatError && <p className="auth-message">{chatError}</p>}

      {users.length > 0 ? (
        <div className="messages-shell">
          <aside className="chat-sidebar-pane">
            <label className="search-box chat-search" htmlFor="conversation-search">
              <span className="sr-only">Search conversations</span>
              <input
                id="conversation-search"
                onChange={(event) => setConversationSearch(event.target.value)}
                placeholder="Search"
                type="search"
                value={conversationSearch}
              />
            </label>

            <div className="chat-thread-list" aria-label="Messages">
              {conversationUsers.map((user) => (
                <button
                  className={`chat-thread-row ${user.isUnread ? 'unread' : ''} ${selectedUserId === user.uid ? 'active' : ''}`}
                  key={user.uid}
                  onClick={() => setSelectedUserId(user.uid)}
                  type="button"
                >
                  <span className="mini-avatar" aria-hidden="true">
                    {user.avatar || user.displayName.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{user.displayName}</strong>
                    <small>{user.latestMessage}</small>
                  </span>
                  {user.latestTime && <time>{user.latestTime}</time>}
                </button>
              ))}
            </div>
          </aside>

          <div className="chat-detail-pane">
            {selectedUser ? (
              <div className="chat-window" aria-live="polite">
                <div className="chat-window-header">
                  <span className="mini-avatar" aria-hidden="true">
                    {selectedUser.avatar || selectedUser.displayName.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{selectedUser.displayName}</strong>
                    <p>{selectedUser.handle} / {selectedUser.mainHobby}</p>
                  </div>
                  <button className="text-button chat-profile-toggle" onClick={() => setIsProfileOpen((open) => !open)} type="button">
                    View profile
                  </button>
                </div>

                {isProfileOpen && (
                  <section className="chat-profile-card" aria-label={`${selectedUser.displayName} profile preview`}>
                    <div className="profile-peek-header">
                      <span className="avatar" aria-hidden="true">
                        {selectedUser.avatar || selectedUser.displayName.slice(0, 1)}
                      </span>
                      <div>
                        <p className="eyebrow">Profile peek</p>
                        <h3>{selectedUser.displayName}</h3>
                        <p>{selectedUser.handle} / {selectedUser.mainHobby}</p>
                      </div>
                    </div>
                    <p>{selectedUser.bio}</p>
                    <div className="chat-profile-actions">
                      <button className="text-button" onClick={() => onViewProfile?.(selectedUser)} type="button">
                        Open full profile
                      </button>
                      <button className="text-button" onClick={() => onFollow?.(selectedUser)} type="button">
                        {selectedIsFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button className="text-button" onClick={() => onBlock?.(selectedUser)} type="button">
                        {selectedIsBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button className="text-button" onClick={() => onReport?.('user', selectedUser.uid)} type="button">
                        Report
                      </button>
                    </div>
                  </section>
                )}

                <div className="message-list">
                  {messages.length > 0 ? (
                    messages.map((message) => {
                      const isOwnMessage = message.senderId === currentUser.uid;

                      return (
                        <article className={`message-bubble ${isOwnMessage ? 'own' : ''}`} key={message.id}>
                          {message.text && <p>{message.text}</p>}
                          <span>{message.timeAgo}</span>
                        </article>
                      );
                    })
                  ) : (
                    <p className="empty-comments">No messages yet. Start the conversation.</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className="chat-form" onSubmit={handleSubmit}>
                  <input
                    aria-label={`Message ${selectedUser.displayName}`}
                    disabled={selectedIsBlocked || isSending}
                    maxLength="500"
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={selectedIsBlocked ? 'Unblock to send messages' : 'Message...'}
                    type="text"
                    value={draft}
                  />
                  <button disabled={selectedIsBlocked || isSending || !draft.trim()} type="submit">
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="empty-state messages-placeholder">
                <strong>Select a chat</strong>
                <p>Choose a conversation to open the thread.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state compact">
          <strong>No Vibely users yet</strong>
          <p>Ask a friend to sign up, then you can chat here.</p>
        </div>
      )}
    </section>
  );
}
