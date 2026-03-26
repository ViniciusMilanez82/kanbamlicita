// scripts/seed-admin.ts
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

function arg(name: string): string {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error(`Argumento --${name} é obrigatório`)
    process.exit(1)
  }
  return process.argv[idx + 1]
}

async function main() {
  const email = arg('email').toLowerCase().trim()
  const nome = arg('nome')
  const senha = arg('senha')

  const existente = await db.user.findUnique({ where: { email } })
  if (existente) {
    console.log(`Usuário ${email} já existe. Nenhuma ação necessária.`)
    return
  }

  const hash = await bcrypt.hash(senha, 12)
  await db.user.create({
    data: {
      email,
      name: nome,
      senha: hash,
      role: 'admin',
      ativo: true,
    },
  })

  console.log(`Admin criado com sucesso: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
