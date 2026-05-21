import AppIcon from '../common/AppIcon.jsx';

const items = [
  { label: 'Home', icon: 'home', view: 'home' },
  { label: 'Search', icon: 'search', view: 'search' },
  { label: 'Create', icon: 'create', view: 'create' },
  { label: 'Reels', icon: 'reels', view: 'reels' },
  { label: 'Profile', icon: 'user', view: 'profile' },
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
            <span className="bottom-nav-icon" aria-hidden="true">
              <AppIcon name={item.icon} size={21} />
            </span>
            <small>{item.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
