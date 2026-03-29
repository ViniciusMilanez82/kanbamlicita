"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/kanban", label: "Kanban", icon: LayoutDashboard },
  { href: "/catalogo", label: "Catálogo", icon: Package },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-52 flex-col bg-[#0F172A] text-white">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold tracking-tight">KanbanLicita</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#1D4ED8] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
