'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, Radio, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/kanban', label: 'Kanban', icon: LayoutDashboard },
  { href: '/licitacoes', label: 'Licitações', icon: List },
  { href: '/fontes', label: 'Fontes', icon: Radio },
  { href: '/configuracoes', label: 'Config', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 flex-col bg-[#0F172A]">
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <span className="text-sm font-bold tracking-tight text-white">
          KanbanLicita
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-[#1D4ED8] text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
