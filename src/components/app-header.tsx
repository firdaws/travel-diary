"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Compass, Loader2, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTransition } from "react";
import { signOut } from "@/app/actions";

const nav = [
  { href: "/", label: "Overview" },
  { href: "/trips", label: "Places" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/group-trips", label: "Group trips" },
];

// Spinner next to a nav label while that page is loading. Must sit inside the <Link>.
function LinkSpinner() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="ml-1.5 inline size-3 animate-spin" aria-hidden /> : null;
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function AppHeader({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [signingOut, startSignOut] = useTransition();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4.5" aria-hidden />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">Travel Diary</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
              <LinkSpinner />
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open account menu"
              className="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {initials(name, email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{name || "Traveler"}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/profile" />}>
                <UserRound /> Profile and passport
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme("light")}><Sun /> Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}><Moon /> Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}><Monitor /> System</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                closeOnClick={false}
                disabled={signingOut}
                onClick={() => startSignOut(() => signOut())}
              >
                {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} {signingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-t px-3 py-1.5 md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
            <LinkSpinner />
          </Link>
        ))}
      </nav>
    </header>
  );
}
