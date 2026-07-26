"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type Item = readonly [string, string, LucideIcon];

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/client") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function NavLinks({
  items,
  unreadDialogs = 0,
  mobile = false,
}: {
  items: readonly Item[];
  unreadDialogs?: number;
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map(([href, label, Icon]) => {
        const badge = href === "/admin/dialogs" ? unreadDialogs : 0;
        const active = isActive(pathname, href);

        return (
          <Link
            href={href}
            key={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {mobile ? (
              <>
                <span className="mobileNavIcon">
                  <Icon size={20} strokeWidth={1.8} />
                  {badge > 0 && (
                    <em className="mobileBadge">{badge > 9 ? "9+" : badge}</em>
                  )}
                </span>
                <span>{label}</span>
              </>
            ) : (
              <>
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {badge > 0 && (
                  <em className="navBadge">{badge > 99 ? "99+" : badge}</em>
                )}
              </>
            )}
          </Link>
        );
      })}
    </>
  );
}
