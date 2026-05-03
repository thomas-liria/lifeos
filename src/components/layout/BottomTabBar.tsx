"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Sun, CalendarDays, BookOpen } from "lucide-react";

const TABS = [
  { label: "Home",     href: "/home",     Icon: Home         },
  { label: "Tasks",    href: "/tasks",    Icon: CheckSquare  },
  { label: "Routine",  href: "/routine",  Icon: Sun          },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "Log",      href: "/log",      Icon: BookOpen     },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 flex
      bg-surface border-t border-[0.5px] border-border">
      {TABS.map(({ label, href, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1
              transition-colors min-h-[64px]
              ${active
                ? "text-primary"
                : "text-foreground/40 hover:text-foreground/70"
              }`}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.5} />
            <span className={`text-[10px] leading-none ${active ? "font-medium" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
