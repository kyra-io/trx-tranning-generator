"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PROFILE_PATH_PATTERN = /^\/profiles\/([^/]+)(?:\/|$)/;

export function BottomNavigation() {
  const pathname = usePathname();
  const profileMatch = pathname.match(PROFILE_PATH_PATTERN);
  const profileId = profileMatch?.[1];
  const profilePath = profileId ? `/profiles/${profileId}` : null;
  const navigationItems = profilePath
    ? [
        { href: "/", label: "Profiles", icon: HomeIcon },
        { href: profilePath, label: "Profile", icon: ListIcon },
        { href: `${profilePath}/workouts/new`, label: "Create", icon: SparkIcon },
      ]
    : [
        { href: "/", label: "Profiles", icon: ListIcon },
        { href: "/profiles/new", label: "Create profile", icon: SparkIcon },
      ];

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-zinc-200 bg-white px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      <div
        className={`grid gap-2 ${
          navigationItems.length === 3 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {navigationItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-4 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-primary-soft text-primary-hover"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4 10 8-6.5 8 6.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-9Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20.5v-6h5v6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5c.55 4.17 2.78 6.4 6.95 6.95-4.17.55-6.4 2.78-6.95 6.95-.55-4.17-2.78-6.4-6.95-6.95C9.22 9.9 11.45 7.67 12 3.5Z"
      />
      <path strokeLinecap="round" d="M19 16.5v4M21 18.5h-4" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6h10M9 12h10M9 18h10M5 6h.01M5 12h.01M5 18h.01"
      />
    </svg>
  );
}
