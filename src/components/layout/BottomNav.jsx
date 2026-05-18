const items = [
  { label: 'Home', icon: '⌂', view: 'home' },
  // No search view exists in App routing right now. Keep the UI, but make it non-interactive.
  { label: 'Search', icon: '⌕', view: null },
  { label: 'Create', icon: '+' },
  { label: 'Hobbies', icon: '✦' },
  { label: 'Profile', icon: '◉' },
];

export default function BottomNav({ activeItem = 'Home', onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const isActive = item.label === activeItem;
        const isDisabled = !item.view;

        return (
          <button
            className={isActive ? 'active' : ''}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            key={item.label}
            onClick={() => !isDisabled && onNavigate?.(item.view)}
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
