const iconMap = {
  bookmark: (
    <>
      <path d="M7 4.75h10a1 1 0 0 1 1 1V20l-6-3.5L6 20V5.75a1 1 0 0 1 1-1Z" />
    </>
  ),
  comment: (
    <>
      <path d="M5.5 7.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H11l-4.5 3v-3h-1a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z" />
    </>
  ),
  back: (
    <>
      <path d="m14.75 6.5-6 5.5 6 5.5" />
    </>
  ),
  check: (
    <>
      <path d="m6.5 12.5 3.2 3.2 7.8-7.9" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="m10.1 10.1 6.1-2.2-2.2 6.1-6.1 2.2 2.2-6.1Z" />
    </>
  ),
  create: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  heart: (
    <>
      <path d="m12 20.2-.7-.6C6.5 15.4 4 12.9 4 9.8A4.7 4.7 0 0 1 8.7 5c1.5 0 2.8.7 3.3 1.8.5-1.1 1.8-1.8 3.3-1.8A4.7 4.7 0 0 1 20 9.8c0 3.1-2.5 5.6-7.3 9.8l-.7.6Z" />
    </>
  ),
  home: (
    <>
      <path d="M3.75 10.5 12 4l8.25 6.5" />
      <path d="M6.5 9.75V20h11V9.75" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4.75H7.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2H10" />
      <path d="M13 8.5 17.25 12 13 15.5" />
      <path d="M17 12H9.5" />
    </>
  ),
  lock: (
    <>
      <rect x="6.25" y="10" width="11.5" height="9.5" rx="2.2" />
      <path d="M8.75 10V8.25a3.25 3.25 0 1 1 6.5 0V10" />
    </>
  ),
  mail: (
    <>
      <rect x="4.5" y="5.5" width="15" height="13" rx="2.4" />
      <path d="m5.75 7 6.25 5 6.25-5" />
    </>
  ),
  menu: (
    <>
      <circle cx="6" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  messages: (
    <>
      <path d="m4.75 6.75 7.25 5 7.25-5" />
      <rect x="4.75" y="6" width="14.5" height="12" rx="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.75" />
      <path d="m15 15 4.25 4.25" />
    </>
  ),
  reels: (
    <>
      <rect x="5.25" y="4.75" width="13.5" height="14.5" rx="3" />
      <path d="m9 4.75 2.25 3M13 4.75l2.25 3" />
      <path d="m10.5 10 4 2.25-4 2.25V10Z" />
    </>
  ),
  settings: (
    <>
      <path d="M12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
      <path d="M12 3.75v2.1M12 18.15v2.1M20.25 12h-2.1M5.85 12h-2.1M17.83 6.17l-1.49 1.49M7.66 16.34l-1.49 1.49M17.83 17.83l-1.49-1.49M7.66 7.66 6.17 6.17" />
    </>
  ),
  send: (
    <>
      <path d="M20 4 9.25 14.75" />
      <path d="m20 4-6 16-3.5-6.5L4 10l16-6Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.25" r="3.25" />
      <path d="M5.75 19.25a6.25 6.25 0 0 1 12.5 0" />
    </>
  ),
};

export default function AppIcon({ className = '', name, size = 22, strokeWidth = 1.8 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconMap[name] ?? iconMap.home}
    </svg>
  );
}
