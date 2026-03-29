import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Empresa padrao
  await prisma.empresa.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      nome: "Minha Empresa",
      descricao: "Configure os dados da sua empresa em Configuracoes",
      segmento: "Geral",
    },
  });

  // Colunas padrao de licitacao
  const colunas = [
    { nome: "Captadas", ordem: 0, cor: "#6B7280", tipo: "inicial" },
    { nome: "Triagem", ordem: 1, cor: "#F59E0B", tipo: "normal" },
    { nome: "Em Analise", ordem: 2, cor: "#3B82F6", tipo: "normal" },
    { nome: "Proposta", ordem: 3, cor: "#8B5CF6", tipo: "normal" },
    { nome: "Enviada", ordem: 4, cor: "#06B6D4", tipo: "normal" },
    { nome: "Ganhamos", ordem: 5, cor: "#10B981", tipo: "final_positivo" },
    { nome: "Perdemos", ordem: 6, cor: "#EF4444", tipo: "final_negativo" },
    { nome: "Descartada", ordem: 7, cor: "#9CA3AF", tipo: "final_negativo" },
  ];

  for (const col of colunas) {
    const existing = await prisma.kanbanColuna.findFirst({
      where: { nome: col.nome },
    });
    if (!existing) {
      await prisma.kanbanColuna.create({ data: col });
    }
  }

  // Usuario admin padrao
  const adminExists = await prisma.user.findUnique({
    where: { email: "admin@kanbamlicita.com" },
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: "admin@kanbamlicita.com",
        name: "Administrador",
        senha: await bcrypt.hash("admin123", 10),
        role: "admin",
      },
    });
  }

  console.log("Seed concluido!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
