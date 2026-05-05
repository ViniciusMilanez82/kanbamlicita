import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL nao definido");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // ==================== KANBAN (RESET) ====================
  await prisma.movimentacao.deleteMany({});
  await prisma.kanbanCard.deleteMany({});
  await prisma.kanbanColuna.deleteMany({});

  const colunas = [
    { nome: "Captação", ordem: 0, cor: "#6B7280", tipo: "inicial" },
    { nome: "Qualificação", ordem: 1, cor: "#F59E0B", tipo: "normal" },
    { nome: "Análise", ordem: 2, cor: "#3B82F6", tipo: "normal" },
    { nome: "Proposta", ordem: 3, cor: "#8B5CF6", tipo: "normal" },
    { nome: "Disputa", ordem: 4, cor: "#06B6D4", tipo: "normal" },
    { nome: "Pós-resultado", ordem: 5, cor: "#10B981", tipo: "final_positivo" },
    { nome: "Descartadas", ordem: 6, cor: "#EF4444", tipo: "final_negativo" },
  ];

  for (const col of colunas) {
    await prisma.kanbanColuna.create({ data: col });
  }

  // ==================== USUÁRIO ADMIN ====================
  const adminEmail = "admin@kanbamlicita.com";
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Administrador",
        senha: await bcrypt.hash("admin123", 10),
        role: "admin",
      },
    });
  }

  // ==================== FONTE PNCP ====================
  await prisma.fonteCaptacao.upsert({
    where: { id: "fonte-pncp-default" },
    update: {},
    create: {
      id: "fonte-pncp-default",
      nome: "PNCP — Compras públicas",
      tipo: "pncp",
      ativo: true,
      filtros: {},
      parametros: { tamanhoPagina: 50, paginasMaximas: 3 },
      periodicidade: "12h",
    },
  });

  // ==================== FONTE PETRONECT ====================
  const petronectUser = process.env.PETRONECT_USERNAME;
  const petronectPass = process.env.PETRONECT_PASSWORD;
  if (petronectUser && petronectPass) {
    await prisma.fonteCaptacao.upsert({
      where: { id: "fonte-petronect-default" },
      update: { parametros: { username: petronectUser, password: petronectPass } },
      create: {
        id: "fonte-petronect-default",
        nome: "Petronect",
        tipo: "petronect",
        ativo: true,
        filtros: {},
        parametros: { username: petronectUser, password: petronectPass },
        periodicidade: "12h",
      },
    });
  } else {
    console.log(
      "[seed] PETRONECT_USERNAME/PETRONECT_PASSWORD ausentes — fonte Petronect não criada."
    );
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
