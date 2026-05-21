function SettingToggle({ checked, label, name, onChange, text }) {
  return (
    <label className="settings-toggle">
      <span>
        <strong>{label}</strong>
        <small>{text}</small>
      </span>
      <input checked={checked} onChange={(event) => onChange?.(name, event.target.checked)} type="checkbox" />
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
        {items.length > 0 && (
          <button className="text-button" onClick={onClear} type="button">
            Clear all
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="settings-list">
          {items.map((item) => (
            <article className="settings-list-row" key={item.id || item.value}>
              {renderItem(item)}
              <button className="remove-chip-button" onClick={() => onRemove?.(item.id || item.value)} type="button" aria-label="Remove">
                x
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

function MenuCard({ description, items, title }) {
  return (
    <section className="settings-card more-menu-card" aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>
      <div className="section-heading">
        <div>
          <p id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>{title}</p>
          <span>{description}</span>
        </div>
      </div>
      <div className="more-menu-list">
        {items.map((item) => (
          <article className="more-menu-row" key={item.label}>
            <span>
              <strong>{item.label}</strong>
              <small>{item.text}</small>
            </span>
          </article>
        ))}
      </div>
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
  onUpdatePrivacyPreference,
  onViewProfile,
  profile,
  searchHistory = [],
  viewedProfiles = [],
}) {
  return (
    <section className="settings-view more-view" aria-labelledby="settings-title">
      <div className="settings-hero more-hero">
        <div>
          <p className="eyebrow">More</p>
          <h1 id="settings-title">Shortcuts, safety, and account controls.</h1>
          <p>Structured to mirror the wireframe menu while keeping your current settings logic intact.</p>
        </div>
        <button className="auth-submit" onClick={() => onNavigate?.('profile')} type="button">
          View profile
        </button>
      </div>

      <div className="more-grid">
        <MenuCard
          title="Quick menu"
          description="Static menu shell"
          items={[
            { label: 'Settings', text: 'App controls and personalization' },
            { label: 'Your activity', text: 'History and recent actions' },
            { label: 'Saved', text: 'Collected inspiration and posts' },
            { label: 'Switch appearance', text: 'Theme hook for later' },
            { label: 'Report a problem', text: 'Support and feedback entry' },
          ]}
        />

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
      </div>

      <section className="settings-card" aria-labelledby="notification-settings-title">
        <div className="section-heading">
          <div>
            <p id="notification-settings-title">Notifications</p>
            <span>Choose what appears in your notifications inbox.</span>
          </div>
          <button className="text-button" onClick={() => onNavigate?.('notifications')} type="button">
            Open inbox
          </button>
        </div>
        <div className="settings-toggle-list">
          <SettingToggle checked={notificationPreferences.likes} label="Likes" name="likes" onChange={onUpdateNotificationPreference} text="Show like activity on your posts." />
          <SettingToggle checked={notificationPreferences.comments} label="Comments" name="comments" onChange={onUpdateNotificationPreference} text="Show comment activity on your posts." />
          <SettingToggle checked={notificationPreferences.messages} label="Messages" name="messages" onChange={onUpdateNotificationPreference} text="Show unread chat notifications." />
        </div>
      </section>

      <section className="settings-card" aria-labelledby="privacy-settings-title">
        <div className="section-heading">
          <div>
            <p id="privacy-settings-title">Privacy</p>
            <span>Control who can discover and message you.</span>
          </div>
        </div>
        <div className="settings-toggle-list">
          <SettingToggle checked={(profile?.privacy?.profileVisibility ?? 'public') === 'private'} label="Private profile" name="profileVisibility" onChange={(name, checked) => onUpdatePrivacyPreference?.(name, checked ? 'private' : 'public')} text="Keep your profile quieter while still using the app." />
          <SettingToggle checked={profile?.privacy?.searchDiscoverable !== false} label="Search discoverable" name="searchDiscoverable" onChange={onUpdatePrivacyPreference} text="Allow your profile to appear in people search." />
          <label className="settings-toggle settings-select-toggle" htmlFor="message-permission">
            <span>
              <strong>Message permissions</strong>
              <small>Choose who can start a chat with you.</small>
            </span>
            <select id="message-permission" onChange={(event) => onUpdatePrivacyPreference?.('messagePermission', event.target.value)} value={profile?.privacy?.messagePermission || 'everyone'}>
              <option value="everyone">Everyone</option>
              <option value="following">People I follow</option>
              <option value="none">No new messages</option>
            </select>
          </label>
        </div>
      </section>

      <RemovableList
        emptyText="Searches from the search tab will appear here."
        items={searchHistory.map((value) => ({ id: value, value }))}
        onClear={onClearSearchHistory}
        onRemove={onRemoveSearchHistory}
        title="Search history"
        renderItem={(item) => (
          <button className="settings-row-main" onClick={() => onNavigate?.('search', { search: item.value })} type="button">
            <span>Search</span>
            <strong>{item.value}</strong>
          </button>
        )}
      />

      <RemovableList
        emptyText="Profiles you open will appear here."
        items={viewedProfiles}
        onClear={onClearViewedProfiles}
        onRemove={onRemoveViewedProfile}
        title="Recent profiles"
        renderItem={(item) => (
          <button className="settings-row-main" onClick={() => onViewProfile?.(item)} type="button">
            <span className="mini-avatar" aria-hidden="true">
              {item.avatar || item.displayName?.slice(0, 1) || '?'}
            </span>
            <span>
              <strong>{item.displayName || item.name || 'Creator'}</strong>
              <small>{item.handle || item.username || 'Vibely profile'}</small>
            </span>
          </button>
        )}
      />

      <section className="settings-card" aria-labelledby="safety-settings-title">
        <div className="section-heading">
          <div>
            <p id="safety-settings-title">Blocked accounts</p>
            <span>Manage accounts you blocked from your experience.</span>
          </div>
        </div>

        {blockedProfiles.length > 0 ? (
          <div className="settings-list">
            {blockedProfiles.map((blockedProfile) => (
              <article className="settings-list-row" key={blockedProfile.uid}>
                <div className="settings-row-main as-static">
                  <span className="mini-avatar" aria-hidden="true">
                    {blockedProfile.avatar || blockedProfile.displayName.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{blockedProfile.displayName}</strong>
                    <small>{blockedProfile.handle}</small>
                  </span>
                </div>
                <button className="text-button" onClick={() => onToggleBlock?.(blockedProfile)} type="button">
                  Unblock
                </button>
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
