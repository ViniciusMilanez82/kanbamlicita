export function TopBar({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center border-b bg-white px-6">
      <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
    </header>
  )
}
