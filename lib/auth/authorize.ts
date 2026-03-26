// lib/auth/authorize.ts
import bcrypt from 'bcryptjs'

type UserRow = {
  id: string
  email: string
  name: string | null
  role: string
  ativo: boolean
  senha: string | null
}

type AuthResult = {
  id: string
  email: string
  name: string | null
  role: string
} | null

export function buildAuthorize(
  findUser: (email: string) => Promise<UserRow | null>
) {
  return async function authorize(
    rawEmail: string | undefined,
    senha: string | undefined
  ): Promise<AuthResult> {
    const email = rawEmail?.toLowerCase().trim()
    if (!email || !senha) return null

    const user = await findUser(email)
    if (!user?.senha || !user.ativo) return null

    const ok = await bcrypt.compare(senha, user.senha)
    if (!ok) return null

    return { id: user.id, email: user.email, name: user.name, role: user.role }
  }
}
