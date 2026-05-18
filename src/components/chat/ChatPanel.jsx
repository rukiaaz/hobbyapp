import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureChat, sendMessage, listenToMessages } from '../../services/chats.js';
import { listenToUserProfiles } from '../../services/vibelyProfile.js';

export default function ChatPanel({ currentUser, profile }) {
  const [chatError, setChatError] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.uid === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users],
  );

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
    if (!selectedUserId && users[0]?.uid) {
      setSelectedUserId(users[0].uid);
    }
  }, [selectedUserId, users]);

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUser || !draft.trim()) {
      return;
    }

    setChatError('');
    setIsSending(true);

    try {
      await sendMessage(currentUser, profile, selectedUser, draft);
      setDraft('');
    } catch (error) {
      setChatError(`Could not send message. Check chat Firestore rules. (${error.code ?? 'unknown-error'})`);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="chat-card" aria-labelledby="chat-title">
      <div className="section-heading">
        <div>
          <p id="chat-title">Messages</p>
          <span>Chat with other hobbyists</span>
        </div>
      </div>

      {chatError && <p className="auth-message">{chatError}</p>}

      {users.length > 0 ? (
        <>
          <div className="chat-user-list" aria-label="Choose someone to message">
            {users.map((user) => (
              <button
                className={user.uid === selectedUser?.uid ? 'active' : ''}
                key={user.uid}
                onClick={() => setSelectedUserId(user.uid)}
                type="button"
              >
                <span className="mini-avatar" aria-hidden="true">
                  {user.avatar || user.displayName.slice(0, 1)}
                </span>
                <span>
                  <strong>{user.displayName}</strong>
                  <small>{user.handle} · {user.mainHobby}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="chat-window" aria-live="polite">
            <div className="chat-window-header">
              <span className="mini-avatar" aria-hidden="true">
                {selectedUser?.avatar || selectedUser?.displayName.slice(0, 1)}
              </span>
              <div>
                <strong>{selectedUser?.displayName}</strong>
                <p>{selectedUser?.handle}</p>
              </div>
            </div>

            <div className="message-list">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === currentUser.uid;

                  return (
                    <article className={`message-bubble ${isOwnMessage ? 'own' : ''}`} key={message.id}>
                      <p>{message.text}</p>
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
                aria-label={`Message ${selectedUser?.displayName}`}
                maxLength="500"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a kind message..."
                value={draft}
              />
              <button disabled={isSending} type="submit">
                Send
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="empty-state compact">
          <strong>No Vibely users yet</strong>
          <p>Ask a friend to sign up, then you can chat here.</p>
        </div>
      )}
    </section>
  );
}
