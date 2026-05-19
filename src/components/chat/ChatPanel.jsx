import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureChat, listenToMessages, listenToUserChats, sendMessage } from '../../services/chats.js';
import { listenToUserProfiles } from '../../services/vibelyProfile.js';

function getNicknameStorageKey(currentUserId) {
  return currentUserId ? `hobby-app-chat-nicknames:${currentUserId}` : '';
}

function getSavedNicknames(currentUserId) {
  const storageKey = getNicknameStorageKey(currentUserId);

  if (!storageKey || typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
}

function saveNicknames(currentUserId, nicknames) {
  const storageKey = getNicknameStorageKey(currentUserId);

  if (storageKey && typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, JSON.stringify(nicknames));
  }
}

function getChatPartnerId(chat, currentUserId) {
  return chat.participants.find((participantId) => participantId !== currentUserId) || '';
}

function getDisplayName(user, nicknames) {
  return nicknames[user.uid] || user.displayName;
}

export default function ChatPanel({ currentUser, profile }) {
  const [chatError, setChatError] = useState('');
  const [chatSummaries, setChatSummaries] = useState([]);
  const [draft, setDraft] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknames, setNicknames] = useState({});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.uid === selectedUserId) ?? null,
    [selectedUserId, users],
  );

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
    return users
      .map((user) => {
        const chat = chatByUserId.get(user.uid);
        const latestPrefix = chat?.lastMessageSenderId === currentUser?.uid ? 'You: ' : '';
        return {
          ...user,
          chat,
          displayName: getDisplayName(user, nicknames),
          latestMessage: chat?.lastMessage ? `${latestPrefix}${chat.lastMessage}` : 'No messages yet',
          latestTime: chat?.lastMessageTimeAgo ?? '',
          sortTime: chat?.updatedAt?.getTime() ?? 0,
        };
      })
      .sort((first, second) => {
        if (second.sortTime !== first.sortTime) {
          return second.sortTime - first.sortTime;
        }

        return first.displayName.localeCompare(second.displayName);
      });
  }, [chatByUserId, currentUser?.uid, nicknames, users]);

  useEffect(() => {
    setNicknames(getSavedNicknames(currentUser?.uid));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUsers([]);
      return undefined;
    }

    return listenToUserProfiles(
      currentUser.uid,
      setUsers,
      (error) => setChatError(`Could not load Vibely users. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setChatSummaries([]);
      return undefined;
    }

    return listenToUserChats(
      currentUser.uid,
      setChatSummaries,
      (error) => setChatError(`Could not load chats. (${error.code ?? 'unknown-error'})`),
    );
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    setNicknameDraft(selectedUser ? nicknames[selectedUser.uid] ?? '' : '');
  }, [nicknames, selectedUser]);

  useEffect(() => {
    let unsubscribe = () => {};
    let isActive = true;

    if (!selectedUser?.uid || !profile) {
      setMessages([]);
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
  }, [currentUser, profile, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function clearImageDraft() {
    setImageFile(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  function handleBackToList() {
    setSelectedUserId('');
    setIsProfileOpen(false);
    setDraft('');
    clearImageDraft();
  }

  function handleSaveNickname() {
    if (!selectedUser || !currentUser?.uid) {
      return;
    }

    const trimmedNickname = nicknameDraft.trim();
    const nextNicknames = { ...nicknames };

    if (trimmedNickname) {
      nextNicknames[selectedUser.uid] = trimmedNickname;
    } else {
      delete nextNicknames[selectedUser.uid];
    }

    setNicknames(nextNicknames);
    saveNicknames(currentUser.uid, nextNicknames);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUser || (!draft.trim() && !imageFile)) {
      return;
    }

    setChatError('');
    setIsSending(true);

    try {
      await sendMessage(currentUser, profile, selectedUser, {
        imageFile,
        text: draft,
      });
      setDraft('');
      clearImageDraft();
    } catch (error) {
      setChatError(`Could not send message. Check chat rules and Cloudinary settings. (${error.code ?? 'unknown-error'})`);
    } finally {
      setIsSending(false);
    }
  }

  const selectedDisplayName = selectedUser ? getDisplayName(selectedUser, nicknames) : '';

  return (
    <section className="chat-card" aria-labelledby="chat-title">
      <div className="section-heading">
        <div>
          <p id="chat-title">Messages</p>
          <span>{selectedUser ? `Chatting with ${selectedDisplayName}` : 'Choose a conversation'}</span>
        </div>
      </div>

      {chatError && <p className="auth-message">{chatError}</p>}

      {users.length > 0 ? (
        selectedUser ? (
          <div className="chat-window" aria-live="polite">
            <div className="chat-window-header">
              <button
                className="chat-back-button"
                onClick={handleBackToList}
                type="button"
                aria-label="Back to messages"
              >
                ←
              </button>
              <span className="mini-avatar" aria-hidden="true">
                {selectedUser.avatar || selectedUser.displayName.slice(0, 1)}
              </span>
              <div>
                <strong>{selectedDisplayName}</strong>
                <p>{selectedUser.handle} · {selectedUser.mainHobby}</p>
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
                    <p>{selectedUser.handle} · {selectedUser.mainHobby}</p>
                  </div>
                </div>
                <p>{selectedUser.bio}</p>

                <label className="auth-field" htmlFor={`nickname-${selectedUser.uid}`}>
                  <span>Nickname only you can see</span>
                  <input
                    id={`nickname-${selectedUser.uid}`}
                    maxLength="32"
                    onChange={(event) => setNicknameDraft(event.target.value)}
                    placeholder={selectedUser.displayName}
                    value={nicknameDraft}
                  />
                </label>
                <button className="auth-submit" onClick={handleSaveNickname} type="button">
                  Save nickname
                </button>
              </section>
            )}

            <div className="message-list">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === currentUser.uid;

                  return (
                    <article className={`message-bubble ${isOwnMessage ? 'own' : ''}`} key={message.id}>
                      {message.imageUrl && (
                        <img className="message-image" alt="Shared chat attachment" src={message.imageUrl} />
                      )}
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

            {imagePreview && (
              <div className="chat-attachment-preview">
                <img alt="Selected chat attachment preview" src={imagePreview} />
                <button onClick={clearImageDraft} type="button" aria-label="Remove selected image">
                  ×
                </button>
              </div>
            )}

            <form className="chat-form" onSubmit={handleSubmit}>
              <label className="chat-image-button" htmlFor={`chat-image-${selectedUser.uid}`}>
                <span aria-hidden="true">📷</span>
                <span className="sr-only">Choose a picture</span>
              </label>
              <input
                accept="image/*"
                id={`chat-image-${selectedUser.uid}`}
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                ref={imageInputRef}
                type="file"
              />
              <input
                aria-label={`Message ${selectedDisplayName}`}
                maxLength="500"
                type="text"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a kind message..."
                value={draft}
              />
              <button disabled={isSending || (!draft.trim() && !imageFile)} type="submit">
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="chat-thread-list" aria-label="Messages">
            {conversationUsers.map((user) => (
              <button
                className="chat-thread-row"
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
        )
      ) : (
        <div className="empty-state compact">
          <strong>No Vibely users yet</strong>
          <p>Ask a friend to sign up, then you can chat here.</p>
        </div>
      )}
    </section>
  );
}
