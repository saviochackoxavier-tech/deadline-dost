const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  missions: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.6" cy="6" r="1.1" />
      <circle cx="3.6" cy="12" r="1.1" />
      <circle cx="3.6" cy="18" r="1.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 20.8 19H3.2z" />
      <path d="M12 9.4v4.1M12 16.4v.1" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
      <path d="M10.5 11v6M13.5 11v6" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="M14.8 6.7l2.5 2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="M15.5 15.5 20 20" />
    </>
  ),
  chevronLeft: <path d="M14.5 6 9 12l5.5 6" />,
  chevronRight: <path d="M9.5 6 15 12l-5.5 6" />,
  chevronUp: <path d="M6 14.5 12 9l6 5.5" />,
  chevronDown: <path d="M6 9.5 12 15l6-5.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
      <path d="M9.5 8.5 6 12l3.5 3.5M6 12h9" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.6-5.7" />
      <path d="M4.2 4.8v4h4" />
    </>
  ),
  bolt: <path d="M13.5 3 6 13.2h5L10 21l7.5-10.4h-5z" />,
  flame: (
    <>
      <path d="M12 3s5 4.2 5 8.7A5 5 0 0 1 7 12c0-1.7.8-3 1.7-4 .2 1.1.9 2 1.9 2.4C11.4 8.9 12 6.2 12 3z" />
      <path d="M7 12a5 5 0 1 0 10 0" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21z" />
      <path d="M4 5.5V21M8 7.5h7" />
    </>
  ),
  arrowRight: <path d="M4.5 12h14M13.5 7l5 5-5 5" />,
  sparkles: (
    <>
      <path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.6l-1.6-4.4L6 9.6 10.4 8z" />
      <path d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  filter: <path d="M3.5 5.5h17l-6.5 7.5v5l-4 2v-7z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2M12 7.8v.1" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 7.2A2 2 0 0 1 5.5 5h3.2l1.8 2.2h8A2 2 0 0 1 20.5 9v8.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19.5 6v5.6c0 4.3-3 7.3-7.5 9.2-4.5-1.9-7.5-4.9-7.5-9.2V6z" />
      <path d="M8.8 12.2l2.3 2.3 4.1-4.6" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5 3.8 8 12 12.5 20.2 8z" />
      <path d="M3.8 12.4 12 17l8.2-4.6M3.8 16.6 12 21.2l8.2-4.6" />
    </>
  ),
};

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.6, ...rest }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {content}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(ICONS);
