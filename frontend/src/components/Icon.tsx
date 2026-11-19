import type { ReactNode } from "react";

export type IconName =
  | "arrow"
  | "badge"
  | "bank"
  | "book"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "copy"
  | "download"
  | "eye"
  | "file"
  | "flag"
  | "home"
  | "lock"
  | "mail"
  | "menu"
  | "people"
  | "play"
  | "search"
  | "shield"
  | "upload"
  | "user"
  | "warning";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    badge: (
      <>
        <path d="m12 2 2.2 2.3 3.2-.2.7 3.1 2.7 1.7-1.4 2.9 1.4 2.9-2.7 1.7-.7 3.1-3.2-.2L12 22l-2.2-2.3-3.2.2-.7-3.1-2.7-1.7 1.4-2.9-1.4-2.9 2.7-1.7.7-3.1 3.2.2Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    bank: (
      <>
        <path d="m3 10 9-6 9 6" />
        <path d="M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" />
        <path d="M8 7h8m-8 4h6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6Z" />
        <path d="M14 2v5h5M9 13h6m-6 4h6" />
      </>
    ),
    flag: (
      <>
        <path d="M5 22V3" />
        <path d="M5 4h12l-2 4 2 4H5" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 5v1" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m10 8 6 4-6 4Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 20 5v6c0 5.2-3.3 9.2-8 11-4.7-1.8-8-5.8-8-11V5Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m-5 5 5-5 5 5" />
        <path d="M4 20h16" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    warning: (
      <>
        <path d="m12 3 10 18H2Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
