"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  Users,
  Database,
  Search,
  ArrowRightLeft,
  BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/my-agent", label: "My Agent", icon: User },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/storage", label: "Storage", icon: Database },
  { href: "/search", label: "Search", icon: Search },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-gray-950 text-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
        <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">
          S
        </div>
        <div>
          <h1 className="text-sm font-semibold">Synapse</h1>
          <p className="text-xs text-gray-400">Network Explorer</p>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-900 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-xs text-gray-400">
          <p className="font-medium text-gray-300">Stellar Testnet</p>
          <p className="mt-1">Read-only explorer</p>
        </div>
      </div>
    </aside>
  );
}
