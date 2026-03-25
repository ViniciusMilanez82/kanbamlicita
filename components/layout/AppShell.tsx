import { SidebarNav } from './SidebarNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarNav />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
