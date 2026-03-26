import { buildAuthorize } from '@/lib/auth/authorize'
import bcrypt from 'bcryptjs'

describe('buildAuthorize', () => {
  const HASH_CORRETA = bcrypt.hashSync('senha123', 10)

  const usuarioAtivo = {
    id: 'u1',
    email: 'user@test.com',
    name: 'Usuário',
    role: 'user',
    ativo: true,
    senha: HASH_CORRETA,
  }

  function makeFindUser(user: typeof usuarioAtivo | null) {
    return async (_email: string) => user
  }

  it('retorna usuário com credenciais corretas e ativo=true', async () => {
    const authorize = buildAuthorize(makeFindUser(usuarioAtivo))
    const result = await authorize('user@test.com', 'senha123')
    expect(result).toEqual({
      id: 'u1',
      email: 'user@test.com',
      name: 'Usuário',
      role: 'user',
    })
  })

  it('retorna null com senha errada', async () => {
    const authorize = buildAuthorize(makeFindUser(usuarioAtivo))
    const result = await authorize('user@test.com', 'senha_errada')
    expect(result).toBeNull()
  })

  it('retorna null quando usuário não existe', async () => {
    const authorize = buildAuthorize(makeFindUser(null))
    const result = await authorize('inexistente@test.com', 'senha123')
    expect(result).toBeNull()
  })

  it('retorna null quando ativo=false mesmo com senha correta', async () => {
    const inativo = { ...usuarioAtivo, ativo: false }
    const authorize = buildAuthorize(makeFindUser(inativo))
    const result = await authorize('user@test.com', 'senha123')
    expect(result).toBeNull()
  })

  it('normaliza email para lowercase', async () => {
    let emailRecebido = ''
    const findUser = async (email: string) => {
      emailRecebido = email
      return usuarioAtivo
    }
    const authorize = buildAuthorize(findUser)
    await authorize('User@TEST.com', 'senha123')
    expect(emailRecebido).toBe('user@test.com')
  })
})
