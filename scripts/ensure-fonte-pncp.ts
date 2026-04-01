import 'dotenv/config'
import { db } from '../lib/db'
import { ensureDefaultPncpFonte } from '../lib/captacao/ensure-default-pncp-fonte'

async function main() {
  const f = await ensureDefaultPncpFonte(db)
  console.log(`Fonte PNCP: ${f.nome} — ${f.endpointBase ?? '(env padrão)'} — id ${f.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
