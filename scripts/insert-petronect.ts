import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definido");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const fonte = await prisma.fonteCaptacao.upsert({
    where: { id: "fonte-petronect-default" },
    update: {},
    create: {
      id: "fonte-petronect-default",
      nome: "Petronect - Contêineres e Equipamentos",
      tipo: "petronect",
      ativo: true,
      filtros: {
        palavrasChave: ["contêiner", "container", "equipamento portuário", "reach stacker", "empilhadeira"],
      },
      parametros: {
        username: "viniciusmilanez@yahoo.com.br",
        password: "281001Vin@.",
      },
      periodicidade: "12h",
    },
  });
  console.log(`Fonte Petronect criada: ${fonte.id} — ${fonte.nome}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
