const items = [
  { label: 'Home', icon: '⌂', view: 'home' },
  { label: 'Search', icon: '⌕' },
  { label: 'Create', icon: '+' },
  { label: 'Hobbies', icon: '✦' },
  { label: 'Profile', icon: '◉' },
];

export default function BottomNav({ activeItem = 'Home', onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <button
          className={item.label === activeItem ? 'active' : ''}
          key={item.label}
          onClick={() => item.view && onNavigate?.(item.view)}
          type="button"
          aria-label={item.label}
        >
          <span aria-hidden="true">{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}
