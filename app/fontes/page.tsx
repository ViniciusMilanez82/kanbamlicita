import { redirect } from 'next/navigation'

export default function FontesPage() {
  redirect('/configuracoes?tab=sistema')
}
