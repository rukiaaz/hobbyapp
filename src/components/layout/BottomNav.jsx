const items = [
  { label: 'Home', icon: '⌂', view: 'home' },
  { label: 'Explore', icon: '⌕', view: 'explore' },
  { label: 'Create', icon: '+', view: 'create' },
  { label: 'Messages', icon: '✉', view: 'messages' },
  { label: 'Alerts', icon: '!', view: 'notifications' },
  { label: 'Profile', icon: '◉', view: 'profile' },
  { label: 'Settings', icon: '⚙', view: 'settings' },
];

export default function BottomNav({ activeView = 'home', onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const isActive = item.view === activeView;

        return (
          <button
            className={isActive ? 'active' : ''}
            key={item.label}
            onClick={() => onNavigate?.(item.view)}
            type="button"
            aria-label={item.label}
          >
            <span aria-hidden="true">{item.icon}</span>
            <small>{item.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
