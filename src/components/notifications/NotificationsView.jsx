import AppIcon from '../common/AppIcon.jsx';

const knownIcons = new Set(['comment', 'heart', 'messages']);

function NotificationGlyph({ icon }) {
  if (knownIcons.has(icon)) {
    return <AppIcon name={icon} size={18} />;
  }

  return <span>{icon || '!'}</span>;
}

export default function NotificationsView({ notifications = [], onNavigate, onViewProfile }) {
  return (
    <section className="notifications-view" aria-labelledby="notifications-title">
      <div className="section-heading profile-view-heading">
        <div>
          <p id="notifications-title">Notifications</p>
          <span>Likes, comments, and unread messages in one clean inbox.</span>
        </div>
        <button className="text-button" onClick={() => onNavigate?.('settings')} type="button">
          Settings
        </button>
      </div>

      {notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article className={`notification-card ${notification.isUnread ? 'unread' : ''}`} key={notification.id}>
              <span className="notification-icon" aria-hidden="true">
                <NotificationGlyph icon={notification.icon} />
              </span>
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                <small>{notification.meta}</small>
              </div>
              {notification.profile && (
                <button className="text-button" onClick={() => onViewProfile?.(notification.profile)} type="button">
                  View
                </button>
              )}
              {notification.view && (
                <button className="text-button" onClick={() => onNavigate?.(notification.view)} type="button">
                  Open
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No notifications yet</strong>
          <p>New likes, comments, and messages will show up here.</p>
        </div>
      )}
    </section>
  );
}
