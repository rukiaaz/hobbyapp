function SettingToggle({ checked, label, name, onChange, text }) {
  return (
    <label className="settings-toggle">
      <span>
        <strong>{label}</strong>
        <small>{text}</small>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange?.(name, event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function RemovableList({ emptyText, items, onClear, onRemove, renderItem, title }) {
  return (
    <section className="settings-card" aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>
      <div className="section-heading">
        <div>
          <p id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>{title}</p>
          <span>{items.length} saved</span>
        </div>
        {items.length > 0 && <button className="text-button" onClick={onClear} type="button">Clear all</button>}
      </div>

      {items.length > 0 ? (
        <div className="settings-list">
          {items.map((item) => (
            <article className="settings-list-row" key={item.id || item.value}>
              {renderItem(item)}
              <button className="remove-chip-button" onClick={() => onRemove?.(item.id || item.value)} type="button" aria-label="Remove">
                ×
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="settings-empty">{emptyText}</p>
      )}
    </section>
  );
}

export default function SettingsView({
  blockedProfiles = [],
  currentUser,
  notificationPreferences,
  onClearSearchHistory,
  onClearViewedProfiles,
  onNavigate,
  onRemoveSearchHistory,
  onRemoveViewedProfile,
  onToggleBlock,
  onUpdateNotificationPreference,
  onViewProfile,
  profile,
  searchHistory = [],
  viewedProfiles = [],
}) {
  return (
    <section className="settings-view" aria-labelledby="settings-title">
      <div className="settings-hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 id="settings-title">Keep Hobby App clean and personal.</h1>
          <p>Manage notifications, search history, recently viewed profiles, safety tools, and account shortcuts.</p>
        </div>
        <button className="auth-submit" onClick={() => onNavigate?.('profile')} type="button">View profile</button>
      </div>

      <section className="settings-card" aria-labelledby="account-settings-title">
        <div className="section-heading">
          <div>
            <p id="account-settings-title">Account</p>
            <span>Signed in as {profile?.handle || currentUser?.email}</span>
          </div>
        </div>
        <div className="settings-summary-grid">
          <article>
            <span>Email</span>
            <strong>{currentUser?.email || 'Google account'}</strong>
          </article>
          <article>
            <span>Main hobby</span>
            <strong>{profile?.mainHobby || 'Not set'}</strong>
          </article>
          <article>
            <span>Followers</span>
            <strong>{profile?.followersCount ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="notification-settings-title">
        <div className="section-heading">
          <div>
            <p id="notification-settings-title">Notifications</p>
            <span>Choose what appears in your notifications inbox.</span>
          </div>
          <button className="text-button" onClick={() => onNavigate?.('notifications')} type="button">Open inbox</button>
        </div>
        <div className="settings-toggle-list">
          <SettingToggle
            checked={notificationPreferences.likes}
            label="Likes"
            name="likes"
            onChange={onUpdateNotificationPreference}
            text="Show like activity on your posts."
          />
          <SettingToggle
            checked={notificationPreferences.comments}
            label="Comments"
            name="comments"
            onChange={onUpdateNotificationPreference}
            text="Show comment activity on your posts."
          />
          <SettingToggle
            checked={notificationPreferences.messages}
            label="Messages"
            name="messages"
            onChange={onUpdateNotificationPreference}
            text="Show unread chat notifications."
          />
        </div>
      </section>

      <RemovableList
        emptyText="Search from Explore or the header and your recent searches will show here."
        items={searchHistory.map((value) => ({ id: value, value }))}
        onClear={onClearSearchHistory}
        onRemove={onRemoveSearchHistory}
        title="Search history"
        renderItem={(item) => (
          <button className="settings-row-main" onClick={() => onNavigate?.('explore', { search: item.value })} type="button">
            <span>⌕</span>
            <strong>{item.value}</strong>
          </button>
        )}
      />

      <RemovableList
        emptyText="Profiles you peek at will appear here, and you can remove them with the × button."
        items={viewedProfiles}
        onClear={onClearViewedProfiles}
        onRemove={onRemoveViewedProfile}
        title="Stalked accounts"
        renderItem={(item) => (
          <button className="settings-row-main" onClick={() => onViewProfile?.(item)} type="button">
            <span className="mini-avatar" aria-hidden="true">{item.avatar || item.displayName?.slice(0, 1) || '?'}</span>
            <span>
              <strong>{item.displayName || item.name || 'Creator'}</strong>
              <small>{item.handle || item.username || 'Hobby App profile'}</small>
            </span>
          </button>
        )}
      />

      <section className="settings-card" aria-labelledby="safety-settings-title">
        <div className="section-heading">
          <div>
            <p id="safety-settings-title">Privacy & safety</p>
            <span>Manage accounts you blocked from your experience.</span>
          </div>
        </div>

        {blockedProfiles.length > 0 ? (
          <div className="settings-list">
            {blockedProfiles.map((blockedProfile) => (
              <article className="settings-list-row" key={blockedProfile.uid}>
                <div className="settings-row-main as-static">
                  <span className="mini-avatar" aria-hidden="true">{blockedProfile.avatar || blockedProfile.displayName.slice(0, 1)}</span>
                  <span>
                    <strong>{blockedProfile.displayName}</strong>
                    <small>{blockedProfile.handle}</small>
                  </span>
                </div>
                <button className="text-button" onClick={() => onToggleBlock?.(blockedProfile)} type="button">Unblock</button>
              </article>
            ))}
          </div>
        ) : (
          <p className="settings-empty">No blocked accounts.</p>
        )}
      </section>
    </section>
  );
}
