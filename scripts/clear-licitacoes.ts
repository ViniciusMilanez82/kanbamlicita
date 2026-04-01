import 'dotenv/config'
import { db } from '../lib/db'

async function main() {
  const r = await db.licitacao.deleteMany({})
  console.log('Licitacoes removidas:', r.count)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
